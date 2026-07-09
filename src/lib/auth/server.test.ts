import { describe, it, expect } from "vitest";

describe("auth/server — getUser (scaffolding mode)", () => {
  it("returns null when Supabase env is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getUser } = await import("@/lib/auth/server");
    const user = await getUser();
    expect(user).toBeNull();
  });
});