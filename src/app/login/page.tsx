import { getSupabaseBrowser } from "@/lib/auth/browser";
import { env } from "@/lib/env";

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return;

    if (!env.NEXT_PUBLIC_SUPABASE_URL) {
      // Scaffolding mode — no DB yet. Sign-in is a no-op.
      return;
    }
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithPassword({ email, password });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-center">Welcome back</h1>
        <form action={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            className="rounded-lg border border-foreground/15 px-3 py-2 outline-none focus:border-foreground/40 transition"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="rounded-lg border border-foreground/15 px-3 py-2 outline-none focus:border-foreground/40 transition"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium hover:opacity-90 transition"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}