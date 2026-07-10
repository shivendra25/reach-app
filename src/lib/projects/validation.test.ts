import { describe, it, expect } from "vitest";
import { parseProjectInput, projectInputSchema } from "@/lib/projects/validation";

describe("projectInputSchema", () => {
  it("accepts valid input", () => {
    const valid = {
      name: "My App",
      app_url: "https://myapp.com",
      repo_url: "https://github.com/me/myapp",
      problem: "Indie devs can't track bugs easily",
      who_suffers: "Solo devs using Notion for issue tracking",
      what_they_pay: "$10/mo for Linear, even though it's overkill",
    };
    const result = projectInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts empty app_url / repo_url", () => {
    const valid = {
      name: "My App",
      app_url: "",
      repo_url: "",
      problem: "Indie devs can't track bugs easily",
      who_suffers: "Solo devs using Notion for issue tracking",
      what_they_pay: "$10/mo for Linear",
    };
    const result = projectInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = projectInputSchema.safeParse({
      name: "",
      app_url: "",
      repo_url: "",
      problem: "x".repeat(20),
      who_suffers: "y".repeat(20),
      what_they_pay: "z".repeat(10),
    });
    expect(result.success).toBe(false);
  });

  it("rejects short problem (under 10 chars)", () => {
    const result = projectInputSchema.safeParse({
      name: "App",
      app_url: "",
      repo_url: "",
      problem: "short",
      who_suffers: "y".repeat(20),
      what_they_pay: "z".repeat(10),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL for app_url", () => {
    const result = projectInputSchema.safeParse({
      name: "App",
      app_url: "not-a-url",
      repo_url: "",
      problem: "x".repeat(20),
      who_suffers: "y".repeat(20),
      what_they_pay: "z".repeat(10),
    });
    expect(result.success).toBe(false);
  });
});

describe("parseProjectInput", () => {
  function makeForm(data: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) fd.set(k, v);
    return fd;
  }

  it("returns ok with valid FormData", () => {
    const fd = makeForm({
      name: "Test App",
      app_url: "https://test.app",
      repo_url: "https://github.com/me/test",
      problem: "Bugs slip through the cracks",
      who_suffers: "Solo indie devs without a QA process",
      what_they_pay: "$15/mo for a basic Sentry plan",
    });
    const result = parseProjectInput(fd);
    expect(result.ok).toBe(true);
  });

  it("returns errors with empty FormData", () => {
    const result = parseProjectInput(makeForm({}));
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });
});