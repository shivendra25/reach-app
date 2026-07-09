import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Client Components ("use client").
 * Handles auth cookies automatically in the browser.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type SupabaseBrowser = ReturnType<typeof getSupabaseBrowser>;