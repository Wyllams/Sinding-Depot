import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sinding-depot.vercel.app')
  );

  // Limpa o cookie de sessão expirando-o imediatamente
  response.cookies.set('siding_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: false,
    sameSite: 'lax',
  });

  return response;
}
