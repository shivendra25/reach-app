import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Proxy (formerly middleware in Next.js 15). Runs before every matched
 * request. We use it to refresh the Supabase auth session so the user
 * stays logged in without manual re-login.
 *
 * Per Next.js 16 the file must be named proxy.ts and the function `proxy`.
 * The edge runtime is NOT supported — the proxy runtime is nodejs by default.
 */
export async function proxy(request: NextRequest) {
  // Skip if Supabase isn't configured yet (scaffolding phase).
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this updates cookies on the response if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /**
     * Run proxy on everything except: static assets, Next internals,
     * and the auth callback route (handled separately to avoid double-processing).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};