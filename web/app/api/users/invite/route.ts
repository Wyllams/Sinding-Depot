import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/users/invite
 * Envia convite por email para novo usuário via Supabase Auth Admin API.
 * O trigger `handle_auth_user_created` cria o profile automaticamente
 * usando full_name e role do user_metadata.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Valida service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Invite] SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration — SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    // Autentica o caller
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

    // Verifica se é admin
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

    // Parse e valida body
    const body = await request.json();
    const { email, full_name, role } = body as {
      email?: string;
      full_name?: string;
      role?: string;
    };

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'salesperson', 'partner', 'customer'];
    const selectedRole = validRoles.includes(role || '') ? role! : 'customer';

    // Verifica se email já existe em profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Envia o convite via Supabase Admin API
    // O trigger handle_auth_user_created criará o profile automaticamente
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: {
          full_name: full_name.trim(),
          role: selectedRole,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app'}/auth/callback`,
      }
    );

    if (error) {
      console.error('[Invite] Supabase invite error:', error);

      // Erro específico de email já existente no Auth
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'This email is already registered in the system' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Failed to send invitation: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[Invite] Invitation sent successfully:', {
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role: selectedRole,
      userId: data.user?.id,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: selectedRole,
      },
    });
  } catch (error) {
    console.error('[Invite] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
