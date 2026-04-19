import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface ColorSelection {
  surface_area: string;
  brand: string;
  color_name: string;
  color_code: string;
  notes?: string;
}

/**
 * POST /api/colors/submit
 * Submete/atualiza as cores de pintura do cliente para um job.
 * 
 * Body: { jobId: string, selections: ColorSelection[] }
 * 
 * Lógica:
 * 1. Valida que o user autenticado é dono do job (customer)
 * 2. Verifica bloqueio 24h (paint scheduled_start_at - 24h)
 * 3. Upsert job_color_selections
 * 4. Notifica Admin + Vendedor + Crew de Pintura
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { jobId, selections } = (await request.json()) as {
      jobId: string;
      selections: ColorSelection[];
    };

    if (!jobId || !selections?.length) {
      return NextResponse.json({ error: 'Missing jobId or selections' }, { status: 400 });
    }

    // ─── Auth: identifica o user ───────────────────────────────
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

    // ─── Service client ────────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ─── Verifica que o user é customer do job ─────────────────
    const { data: customer } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('profile_id', session.user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 403 });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, salesperson_id, service_address_line_1, color_edit_override_until')
      .eq('id', jobId)
      .single();

    if (!job || job.customer_id !== customer.id) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 403 });
    }

    // ─── Verifica bloqueio 24h ─────────────────────────────────
    const { data: paintAssignment } = await supabase
      .from('service_assignments')
      .select('scheduled_start_at, crew_id')
      .eq('job_service_id', (
        await supabase
          .from('job_services')
          .select('id')
          .eq('job_id', jobId)
          .eq('service_type_id', (
            await supabase.from('service_types').select('id').eq('name', 'Painting').single()
          ).data?.id)
          .single()
      ).data?.id ?? '')
      .single();

    if (paintAssignment?.scheduled_start_at) {
      const paintStart = new Date(paintAssignment.scheduled_start_at);
      const lockTime = new Date(paintStart.getTime() - 24 * 60 * 60 * 1000);
      const now = new Date();

      // Verifica override
      const hasOverride = job.color_edit_override_until && new Date(job.color_edit_override_until) > now;

      if (now >= lockTime && !hasOverride) {
        return NextResponse.json(
          { error: 'Editing locked — painting starts within 24 hours. Request permission from the office.' },
          { status: 403 }
        );
      }
    }

    // ─── Upsert cores ──────────────────────────────────────────
    // Remove existentes para este job
    await supabase.from('job_color_selections').delete().eq('job_id', jobId);

    // Insere novos
    const inserts = selections.map((s) => ({
      job_id: jobId,
      surface_area: s.surface_area,
      brand: s.brand,
      color_name: s.color_name,
      color_code: s.color_code,
      status: 'submitted',
    }));

    const { error: insertErr } = await supabase.from('job_color_selections').insert(inserts);
    if (insertErr) {
      console.error('[Colors] Insert error:', insertErr);
      return NextResponse.json({ error: `Failed to save: ${insertErr.message}` }, { status: 500 });
    }

    // ─── Notificações ──────────────────────────────────────────
    const notifTitle = '🎨 Paint Colors Submitted';
    const notifBody = `${customer.full_name} submitted paint colors for ${job.service_address_line_1 || 'a project'}`;
    const notifType = 'color_submission';

    // 1. Busca IDs dos admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    const adminIds = (admins || []).map((a) => a.id);

    // 2. Busca profile_id do vendedor
    const vendedorIds: string[] = [];
    if (job.salesperson_id) {
      const { data: sp } = await supabase
        .from('salespersons')
        .select('profile_id')
        .eq('id', job.salesperson_id)
        .single();
      if (sp?.profile_id) vendedorIds.push(sp.profile_id);
    }

    // 3. Busca profile_id do crew de pintura
    const crewIds: string[] = [];
    if (paintAssignment?.crew_id) {
      const { data: crew } = await supabase
        .from('crews')
        .select('profile_id')
        .eq('id', paintAssignment.crew_id)
        .single();
      if (crew?.profile_id) crewIds.push(crew.profile_id);
    }

    // Deduplica
    const allUserIds = [...new Set([...adminIds, ...vendedorIds, ...crewIds])];

    // Cria notificações in-app
    if (allUserIds.length > 0) {
      const notifs = allUserIds.map((uid) => ({
        user_id: uid,
        title: notifTitle,
        body: notifBody,
        notification_type: notifType,
        related_entity_id: jobId,
        read: false,
      }));
      await supabase.from('notifications').insert(notifs);
    }

    // Push notifications
    if (allUserIds.length > 0 && process.env.PUSH_API_SECRET) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app';
        await fetch(`${baseUrl}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-push-api-key': process.env.PUSH_API_SECRET,
          },
          body: JSON.stringify({
            userIds: allUserIds,
            title: notifTitle,
            body: notifBody,
            url: `/projects/${jobId}`,
            tag: 'color-submission',
          }),
        });
      } catch (pushErr) {
        console.error('[Colors] Push notification failed:', pushErr);
        // Non-blocking — colorssubmission succeeds even if push fails
      }
    }

    return NextResponse.json({ success: true, count: selections.length });
  } catch (error) {
    console.error('[Colors] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
