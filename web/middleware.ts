import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ─── Rotas Públicas (sem autenticação) ──────────────────────────
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const PUBLIC_CONTRACT_REGEX = /^\/projects\/[^/]+\/contract(\/[^/]+)?/;

// ─── Controle de Acesso por Role ────────────────────────────────
// Define quais rotas cada role pode acessar.
// Rotas não listadas aqui são consideradas restritas a admin.
const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  admin:       ['*'],
  salesperson: ['/mobile/sales', '/sales', '/projects', '/change-orders', '/sales-reports', '/schedule', '/api', '/'],
  partner:     ['/field', '/projects', '/change-orders', '/schedule', '/api', '/'],
  crew:        ['/field', '/projects', '/change-orders', '/schedule', '/api', '/'],
  customer:    ['/customer', '/api'],
  client:      ['/customer', '/api'],
};

// ─── Rota padrão por role (redirect após login) ─────────────────
const ROLE_HOME: Record<string, string> = {
  admin:       '/',
  salesperson: '/mobile/sales',
  partner:     '/field',
  crew:        '/field',
  customer:    '/customer',
  client:      '/customer',
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── Guard: se as env vars não estiverem configuradas, não bloqueia ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Skipping auth check.');
    return NextResponse.next({ request });
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicContract = PUBLIC_CONTRACT_REGEX.test(pathname);
  const isPublicRoute = isAuthRoute || isPublicContract;

  let response = NextResponse.next({ request });

  // ─── Cria cliente Supabase SSR para ler/escrever cookies ──────
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ─── Verifica sessão ──────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;

  // ─── Regras de redirecionamento ───────────────────────────────

  // 1. Usuário não autenticado tentando acessar rota protegida
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Usuário autenticado tentando acessar página de auth → redireciona para home do role
  if (isAuthenticated && isAuthRoute) {
    // Busca o role do usuário para redirecionar para o home correto
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session!.user.id)
      .single();

    const role = profile?.role || 'admin';
    const home = ROLE_HOME[role] || '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // 3. Controle de acesso por Role — BLOQUEIA acesso indevido a rotas restritas
  if (isAuthenticated && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', session!.user.id)
      .single();

    const role = profile?.role || 'admin';
    const isActive = profile?.is_active ?? true;

    // Bloqueia usuários inativos — faz sign out e redireciona
    if (!isActive) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=account_disabled', request.url));
    }

    const allowedRoutes = ROLE_ALLOWED_ROUTES[role] || [];

    // Admin tem acesso irrestrito
    if (allowedRoutes.includes('*')) {
      return response;
    }

    // Verifica se a rota atual está dentro das rotas permitidas para esse role
    const isAllowed = allowedRoutes.some((route) => pathname.startsWith(route));

    if (!isAllowed) {
      // Redireciona para a home do role — NUNCA para uma rota que não é dele
      const home = ROLE_HOME[role] || '/';
      console.warn(`[Middleware] BLOCKED: role="${role}" tried to access "${pathname}" → redirected to "${home}"`);
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Exclui arquivos estáticos, SW, manifest e rotas internas do Next.js
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
};
