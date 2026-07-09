import { describe, it, expect } from "vitest";

describe("proxy", () => {
  it("calls NextResponse.next when Supabase env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { proxy } = await import("@/proxy");
    const mockRequest = new Request("https://reach.app/") as never;
    const response = await proxy(mockRequest);

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});