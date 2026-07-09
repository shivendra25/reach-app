import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Supabase auth callback. Handles email confirmation and OAuth redirects.
 * Exchanges the code for a session then redirects to the original page.
 */
export async function GET(request: NextRequest) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" param controls where we land after auth — default to /dashboard.
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
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
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login with an error if code exchange failed.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}