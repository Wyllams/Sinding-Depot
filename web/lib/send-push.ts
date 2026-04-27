import { createClient } from '@supabase/supabase-js';

/**
 * Envia push notification + in-app notification para os admins (e opcionalmente outros userIds).
 * Uso server-side apenas (API routes, webhooks).
 */

interface SendPushOptions {
  title: string;
  body: string;
  url: string;
  tag: string;
  notificationType: string;
  relatedEntityId?: string;
  /** IDs adicionais de profiles para notificar (ex: vendedor, crew) */
  extraUserIds?: string[];
  /** Se false, não enviará para os admins. Default: true */
  notifyAdmins?: boolean;
}

export async function sendPushToAdmins(options: SendPushOptions): Promise<void> {
  const { title, body, url, tag, notificationType, relatedEntityId, extraUserIds } = options;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Push] Missing Supabase env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Busca IDs dos admins se solicitado
    let adminIds: string[] = [];
    if (options.notifyAdmins !== false) {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      adminIds = (admins || []).map((a) => a.id);
    }

    const allUserIds = [...new Set([...adminIds, ...(extraUserIds || [])])];

    if (allUserIds.length === 0) {
      console.warn('[Push] No users to notify');
      return;
    }

    // 2. In-app notifications
    const notifs = allUserIds.map((uid) => ({
      user_id: uid,
      title,
      body,
      notification_type: notificationType,
      related_entity_id: relatedEntityId || null,
      read: false,
    }));

    const { error: notifErr } = await supabase.from('notifications').insert(notifs);
    if (notifErr) {
      console.error('[Push] In-app notification insert failed:', notifErr);
    }

    // 3. Push notifications (via Web Push API)
    const pushSecret = process.env.PUSH_API_SECRET;
    if (pushSecret) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app';
      const resp = await fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-push-api-key': pushSecret,
        },
        body: JSON.stringify({
          userIds: allUserIds,
          title,
          body,
          url,
          tag,
        }),
      });

      if (!resp.ok) {
        console.error('[Push] Push API returned', resp.status);
      }
    }
  } catch (err) {
    // Non-blocking — the main action should not fail because of push
    console.error('[Push] sendPushToAdmins error (non-blocking):', err);
  }
}
