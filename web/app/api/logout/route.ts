import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Server-side logout: signs out via Supabase SSR and clears all session cookies.
// This is the only reliable way to clear the session when using middleware-based auth.
// Supports both GET (backward compat with window.location.href) and POST (CSRF-safe).
async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Build the redirect response first so we can attach cookies to it
  const redirectUrl = new URL('/login', request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (!supabaseUrl || !supabaseAnonKey) {
    // Even without Supabase, redirect to login
    return response;
  }

  // Create a server client that reads/writes cookies on this request/response pair
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Invalidate the session on Supabase's side and clear all auth cookies
  await supabase.auth.signOut();

  return response;
}

// GET — backward compatible (TopBar uses window.location.href)
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleLogout(request);
}

// POST — CSRF-safe alternative
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleLogout(request);
}
