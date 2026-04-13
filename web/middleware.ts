import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Lê o cookie que criamos no mock de login
  const session = request.cookies.get('siding_session')?.value;
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/forgot-password');

  // Se o usuário NÃO tiver a sessão e tentar acessar qualquer página que não seja o Login/Recover
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se o usuário JÁ estiver logado e tentar abrir /login, manda ele de volta pro Dashboard
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Esse matcher garante que o middleware NÃO vai bloquear imagens, SVGs e arquivos internos do Next.js
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)',
  ],
};
