import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Route Handlers, and
 * Server Actions. Reads/writes auth cookies via Next's async cookie jar.
 * Create a new client per request — this function already does that.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — setAll can't write.
            // The proxy will refresh the session on the next request.
          }
        },
      },
    }
  );
}

export type SupabaseServer = Awaited<ReturnType<typeof getSupabaseServer>>;

/**
 * Returns the current user or null. Use in route guards / loaders.
 */
export async function getUser() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}