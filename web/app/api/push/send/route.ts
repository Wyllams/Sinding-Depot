import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

/**
 * POST /api/push/send
 *
 * Envia push notification para um ou mais usuários.
 * Body: { userIds: string[], title: string, body: string, url?: string, tag?: string }
 *
 * Protegida por API key interna (PUSH_API_SECRET).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ─── Auth check: apenas chamadas internas/autorizadas ────────
    const authHeader = request.headers.get('x-push-api-key');
    const apiSecret = process.env.PUSH_API_SECRET;

    if (!apiSecret || authHeader !== apiSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, title, body: notifBody, url, tag } = body;

    if (!userIds?.length || !title || !notifBody) {
      return NextResponse.json(
        { error: 'Missing required fields: userIds, title, body' },
        { status: 400 }
      );
    }

    // ─── Setup VAPID ────────────────────────────────────────────
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sidingdepot.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] Missing VAPID keys');
      return NextResponse.json(
        { error: 'Server VAPID configuration error' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // ─── Busca subscriptions dos usuários ───────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    if (dbError) {
      console.error('[Push] Failed to fetch subscriptions:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions?.length) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No subscriptions found for provided userIds',
      });
    }

    // ─── Payload da notificação ─────────────────────────────────
    const payload = JSON.stringify({
      title,
      body: notifBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: url || '/',
      tag: tag || 'siding-depot-notification',
    });

    // ─── Dispara para todos os devices ──────────────────────────
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { userId: sub.user_id, status: 'sent' as const };
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;

          // 410 Gone ou 404 = subscription expirada, remove do DB
          if (statusCode === 410 || statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            return { userId: sub.user_id, status: 'expired' as const };
          }

          console.error(`[Push] Failed to send to ${sub.user_id}:`, error);
          return { userId: sub.user_id, status: 'failed' as const };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 'sent'
    ).length;

    const expired = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 'expired'
    ).length;

    return NextResponse.json({
      success: true,
      sent,
      expired,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('[Push] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
