import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * PATCH /api/users/[id]
 * Atualiza campos do perfil (ex: is_active)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    // Valida que a service role key está configurada
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Users] SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration — SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    // Verifica se quem faz a request é admin
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handlers */ },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifica se é admin — usa service_role para bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: actor } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (actor?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    // Impede que admin desative a si mesmo
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = ['is_active'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error, status, statusText } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[Users] Update failed:', { error, status, statusText });
      return NextResponse.json(
        { error: `Failed to update profile: ${error.message} (${error.code})` },
        { status: 500 }
      );
    }

    // Se está desativando, também bane o user no Supabase Auth
    // para invalidar sessões ativas imediatamente
    if ('is_active' in updates) {
      if (!updates.is_active) {
        // Ban user — invalida todas as sessões
        const { error: banErr } = await supabase.auth.admin.updateUserById(id, {
          ban_duration: '876600h', // ~100 anos (efetivamente permanente)
        });
        if (banErr) console.error('[Users] Ban failed:', banErr);
      } else {
        // Unban user — reativa
        const { error: unbanErr } = await supabase.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        });
        if (unbanErr) console.error('[Users] Unban failed:', unbanErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Users] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Deleta o user completamente — auth + profile + dados relacionados (cascade)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    // Verifica se quem faz a request é admin
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handlers */ },
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

    // Impede que admin delete a si mesmo
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // 1. Busca o profile antes de deletar (para info no response)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Limpa referências onde SET NULL é mais seguro que CASCADE
    //    (tabelas que referenciam profile_id com sentido de "quem fez")
    await supabase.from('blockers').update({ reported_by_profile_id: null }).eq('reported_by_profile_id', id);
    await supabase.from('blockers').update({ resolved_by_profile_id: null }).eq('resolved_by_profile_id', id);
    await supabase.from('documents').update({ uploaded_by_profile_id: null }).eq('uploaded_by_profile_id', id);
    await supabase.from('photos').update({ uploaded_by_profile_id: null }).eq('uploaded_by_profile_id', id);
    await supabase.from('change_orders').update({ requested_by_profile_id: null }).eq('requested_by_profile_id', id);
    await supabase.from('completion_certificates').update({ issued_by_profile_id: null }).eq('issued_by_profile_id', id);
    await supabase.from('customer_approvals').update({ requested_by_profile_id: null }).eq('requested_by_profile_id', id);
    await supabase.from('project_payment_milestones').update({ created_by_profile_id: null }).eq('created_by_profile_id', id);
    await supabase.from('audit_logs').update({ actor_profile_id: null }).eq('actor_profile_id', id);

    // 3. Deleta registros owned pelo user
    await supabase.from('push_subscriptions').delete().eq('user_id', id);
    await supabase.from('notifications').delete().eq('user_id', id);

    // 4. Desvincula de entidades relacionadas
    await supabase.from('customers').update({ profile_id: null }).eq('profile_id', id);
    await supabase.from('salespersons').update({ profile_id: null }).eq('profile_id', id);
    await supabase.from('crews').update({ profile_id: null }).eq('profile_id', id);

    // 5. Deleta o profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileErr) {
      console.error('[Users] Failed to delete profile:', profileErr);
      return NextResponse.json({ error: `Failed to delete profile: ${profileErr.message}` }, { status: 500 });
    }

    // 6. Deleta o user do Supabase Auth
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);

    if (authErr) {
      console.error('[Users] Failed to delete auth user:', authErr);
      // Profile já foi deletado, log mas não bloqueia
    }

    return NextResponse.json({
      success: true,
      deleted: {
        name: profile.full_name,
        email: profile.email,
        role: profile.role,
      },
    });
  } catch (error) {
    console.error('[Users] DELETE unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
