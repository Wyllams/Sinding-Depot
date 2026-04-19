import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/colors/override
 * Admin desbloqueia temporariamente a edição de cores para um job.
 * 
 * Body: { jobId: string, durationMinutes?: number }
 * Default: 120 minutos (2 horas)
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { jobId, durationMinutes = 120 } = (await request.json()) as {
      jobId: string;
      durationMinutes?: number;
    };

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // ─── Auth: verifica admin ──────────────────────────────────
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

    const { data: actor } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (actor?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    // ─── Seta override ─────────────────────────────────────────
    const overrideUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('jobs')
      .update({ color_edit_override_until: overrideUntil })
      .eq('id', jobId);

    if (error) {
      console.error('[Colors] Override error:', error);
      return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, override_until: overrideUntil });
  } catch (error) {
    console.error('[Colors] Override unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
