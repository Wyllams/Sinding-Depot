import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/colors/request-edit
 * Cliente pede permissão para editar cores quando está dentro do bloqueio 24h.
 * Envia notificação para os admins.
 * 
 * Body: { jobId: string }
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { jobId } = (await request.json()) as { jobId: string };

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // ─── Auth ──────────────────────────────────────────────────
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only */ },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ─── Busca dados do cliente e do job ───────────────────────
    const { data: customer } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('profile_id', session.user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 403 });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, service_address_line_1')
      .eq('id', jobId)
      .single();

    if (!job || job.customer_id !== customer.id) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 403 });
    }

    // ─── Notifica todos os admins ──────────────────────────────
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    const adminIds = (admins || []).map((a) => a.id);

    const notifTitle = '✏️ Color Edit Permission Requested';
    const notifBody = `${customer.full_name} is requesting permission to edit paint colors for ${job.service_address_line_1 || 'a project'}`;

    if (adminIds.length > 0) {
      // In-app notifications
      const notifs = adminIds.map((uid) => ({
        user_id: uid,
        title: notifTitle,
        body: notifBody,
        notification_type: 'color_edit_request',
        related_entity_id: jobId,
        read: false,
      }));
      await supabase.from('notifications').insert(notifs);

      // Push notifications
      if (process.env.PUSH_API_SECRET) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app';
          await fetch(`${baseUrl}/api/push/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-push-api-key': process.env.PUSH_API_SECRET,
            },
            body: JSON.stringify({
              userIds: adminIds,
              title: notifTitle,
              body: notifBody,
              url: `/projects/${jobId}`,
              tag: 'color-edit-request',
            }),
          });
        } catch (pushErr) {
          console.error('[Colors] Push failed:', pushErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Colors] Request edit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
