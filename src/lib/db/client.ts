import { createClient } from "@supabase/supabase-js";
import { env, requireEnv } from "@/lib/env";

/**
 * Server-side admin client. Bypasses RLS using the service role key.
 * Only import from server code (Route Handlers, Server Actions, jobs).
 */
export function createServerClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export type ServerClient = ReturnType<typeof createServerClient>;

/**
 * Browser client. Use in Client Components.
 * Falls back to an anonymous client when keys are missing (read-only, pol RLS).
 */
export function createBrowserClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}

export type BrowserClient = NonNullable<ReturnType<typeof createBrowserClient>>;