import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy-initialized server-side Supabase client with service_role key.
 * Uses a Proxy to defer instantiation until first property access,
 * preventing crashes when env vars are unavailable at build time.
 *
 * Usage: import { supabaseAdmin } from "@/lib/supabase-admin";
 */

let _client: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}

// Proxy pattern: safely defer creation to runtime
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getAdminClient() as any)[prop];
  },
});
