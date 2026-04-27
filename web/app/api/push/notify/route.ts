import { NextResponse } from 'next/server';
import { sendPushToAdmins } from '@/lib/send-push';

/**
 * POST /api/push/notify
 *
 * Endpoint interno para enviar push + in-app notifications.
 * Usado quando o frontend precisa disparar notificações server-side.
 *
 * Body: { title, body, url, tag, notificationType, relatedEntityId?, extraUserIds? }
 *
 * Protegido por sessão do Supabase (apenas admins/staff autenticados).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const { title, body, url, tag, notificationType, relatedEntityId, extraUserIds, notifyAdmins } = payload;

    if (!title || !body || !notificationType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body, notificationType' },
        { status: 400 }
      );
    }

    await sendPushToAdmins({
      title,
      body,
      url: url || '/',
      tag: tag || 'general-notification',
      notificationType,
      relatedEntityId,
      extraUserIds,
      notifyAdmins,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[notify] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
