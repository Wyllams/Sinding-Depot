import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ─── Rotas Públicas (sem autenticação) ──────────────────────────
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const PUBLIC_CONTRACT_REGEX = /^\/projects\/[^/]+\/contract(\/[^/]+)?/;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicContract = PUBLIC_CONTRACT_REGEX.test(pathname);
  const isPublicRoute = isAuthRoute || isPublicContract;

  let response = NextResponse.next({ request });

  // ─── Cria cliente Supabase SSR para ler/escrever cookies ──────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // ─── Verifica sessão (não usa getUser() para não vazar token) ──
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;

  // ─── Regras de redirecionamento ───────────────────────────────
  // 1. Usuário não autenticado tentando acessar rota protegida
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Usuário autenticado tentando acessar página de auth
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclui arquivos estáticos e rotas internas do Next.js
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
};
