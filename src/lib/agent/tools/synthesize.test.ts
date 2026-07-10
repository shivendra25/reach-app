import { describe, it, expect, beforeEach } from "vitest";
import type { LLMSynthesizeInput, SearchResult } from "@/lib/agent/tools/types";

// The synthesize module is imported lazily so env vars can be set per test.
async function importSynthesize() {
  return import("@/lib/agent/tools/synthesize");
}

const fakeInput = (overrides: Partial<LLMSynthesizeInput> = {}): LLMSynthesizeInput => ({
  project: {
    name: "BugNest",
    problem: "Solo devs can't track bugs in Notion",
    whoSuffers: "Indie developers shipping fast",
    whatTheyPay: "$10/mo for Linear",
    appUrl: "https://bugnest.app",
    repoUrl: null,
  },
  webResults: [],
  redditResults: [],
  hnResults: [],
  ...overrides,
});

const fakeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  title: "Test result",
  url: "https://reddit.com/r/test/comments/123",
  snippet: "I find Linear overkill for solo dev work",
  source: "r/test",
  ...overrides,
});

describe("synthesize — heuristic (no LLM)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("returns red verdict with no results", async () => {
    const { synthesize } = await importSynthesize();
    const result = await synthesize(fakeInput());
    expect(result.verdict).toBe("red");
    expect(result.verdict_reason).toContain("Weak signal");
  });

  it("returns green verdict with 5+ results", async () => {
    const { synthesize } = await importSynthesize();
    const results = Array.from({ length: 6 }, (_, i) =>
      fakeResult({ title: `Result ${i}`, url: `https://reddit.com/r/test/${i}`, snippet: `solo dev bug tracking overkill ${i}` })
    );
    const result = await synthesize(fakeInput({ redditResults: results }));
    expect(result.verdict).toBe("green");
    expect(result.verdict_reason).toContain("Strong community signal");
  });

  it("returns yellow verdict with 2-4 results", async () => {
    const { synthesize } = await importSynthesize();
    const results = Array.from({ length: 3 }, (_, i) => fakeResult({ title: `R${i}` }));
    const result = await synthesize(fakeInput({ redditResults: results }));
    expect(result.verdict).toBe("yellow");
  });

  it("extracts communities from reddit results grouped by subreddit", async () => {
    const { synthesize } = await importSynthesize();
    const redditResults = [
      fakeResult({ source: "r/SoloEngineering", url: "https://reddit.com/r/SoloEngineering/comments/1" }),
      fakeResult({ source: "r/SoloEngineering", url: "https://reddit.com/r/SoloEngineering/comments/2" }),
      fakeResult({ source: "r/SaaS", url: "https://reddit.com/r/SaaS/comments/1" }),
    ];
    const result = await synthesize(fakeInput({ redditResults }));
    const subnames = result.communities.map((c) => c.name);
    expect(subnames).toContain("r/SoloEngineering");
    expect(subnames).toContain("r/SaaS");
    // r/SoloEngineering has 2 posts so should score higher.
    const solo = result.communities.find((c) => c.name === "r/SoloEngineering");
    const saas = result.communities.find((c) => c.name === "r/SaaS");
    expect(solo!.score).toBeGreaterThan(saas!.score);
  });

  it("adds HN as a single community when HN results exist", async () => {
    const { synthesize } = await importSynthesize();
    const result = await synthesize(fakeInput({ hnResults: [fakeResult({ source: "hackernews" })] }));
    const hn = result.communities.find((c) => c.platform === "hackernews");
    expect(hn).toBeDefined();
    expect(hn!.name).toBe("Hacker News");
  });

  it("infers pricing from whatTheyPay", async () => {
    const { synthesize } = await importSynthesize();
    const result = await synthesize(fakeInput());
    expect(result.pricing_recommendation).toContain("Linear");
    expect(result.pricing_recommendation).toContain("competitively");
  });

  it("builds evidence from the strongest results", async () => {
    const { synthesize } = await importSynthesize();
    const result = await synthesize(
      fakeInput({ redditResults: [fakeResult({ title: "Best evidence", url: "https://example.com/1" })] })
    );
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].url).toBe("https://example.com/1");
  });
});