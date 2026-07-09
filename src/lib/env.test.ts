import { describe, it, expect, beforeEach } from "vitest";

describe("env", () => {
  beforeEach(() => {
    // vitest sets NODE_ENV to "test"
  });

  it("loads without required keys (scaffolding mode)", async () => {
    const { env } = await import("@/lib/env");
    expect(env.NODE_ENV).toBe("test");
    // Optional keys should be undefined, not throw
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });

  it("requireEnv throws for missing keys", async () => {
    const { requireEnv } = await import("@/lib/env");
    expect(() => requireEnv("ANTHROPIC_API_KEY")).toThrow(
      "Missing required environment variable: ANTHROPIC_API_KEY"
    );
  });

  it("requireEnv returns the value when present", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    // Need to re-import to pick up the change since env is cached at module load
    vi.resetModules();
    const { requireEnv } = await import("@/lib/env");
    expect(requireEnv("ANTHROPIC_API_KEY")).toBe("test-key");
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
  });
});