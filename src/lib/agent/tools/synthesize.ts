import type {
  LLMSynthesizeFn,
  LLMSynthesizeInput,
  LLMSynthesizeOutput,
  SearchResult,
  CommunitySignal,
  EvidenceSignal,
} from "@/lib/agent/tools/types";

/**
 * LLM synthesis. Takes raw search results from all tools and produces a
 * structured Audience Report.
 *
 * Uses Anthropic Claude if ANTHROPIC_API_KEY is set. Falls back to a
 * heuristic synthesizer that extracts signal from the raw results — no
 * LLM call needed, so the agent works (at reduced quality) in scaffolding.
 */

export const synthesize: LLMSynthesizeFn = async (input) => {
  if (process.env.ANTHROPIC_API_KEY) {
    return synthesizeWithClaude(input);
  }
  if (process.env.OPENAI_API_KEY) {
    return synthesizeWithOpenAI(input);
  }
  return synthesizeHeuristic(input);
};

// --- Heuristic synthesizer (no LLM, works offline) ---

function synthesizeHeuristic(input: LLMSynthesizeInput): LLMSynthesizeOutput {
  const { project, webResults, redditResults, hnResults } = input;

  const allResults = [...webResults, ...redditResults, ...hnResults];

  // Derive communities from Reddit + HN results.
  const communities = extractCommunities(redditResults, hnResults);

  // Build evidence from the strongest results.
  const evidence: EvidenceSignal[] = allResults.slice(0, 5).map((r) => ({
    supports: "icp",
    url: r.url,
    title: r.title,
    snippet: r.snippet,
    source: r.source ?? new URL(r.url).hostname,
  }));

  // ICP summary from the problem + who_suffers + top results.
  const topSnippet = allResults[0]?.snippet ?? "";
  const icp_summary = `${project.whoSuffers}. ${project.problem}. ${
    topSnippet ? `Community signal: "${topSnippet.slice(0, 200)}"` : ""
  }`.trim();

  // Verdict: green if we found 5+ results, yellow if 2+, red otherwise.
  const totalResults = allResults.length;
  const verdict = totalResults >= 5 ? "green" : totalResults >= 2 ? "yellow" : "red";
  const verdict_reason =
    totalResults >= 5
      ? `Strong community signal — found ${totalResults} relevant discussions across web, Reddit, and HN.`
      : totalResults >= 2
        ? `Moderate signal — found ${totalResults} discussions. The audience exists but may be scattered.`
        : `Weak signal — found only ${totalResults} discussions. This audience may be hard to reach through communities.`;

  const pricing_recommendation = inferPricing(project.whatTheyPay);
  const pocket_dictionary = extractPocketDictionary(allResults);

  return {
    icp_summary,
    verdict,
    verdict_reason,
    pricing_recommendation,
    pricing_currency: "usd",
    pocket_dictionary,
    content: {
      sections: [
        {
          key: "icp",
          title: "Ideal Customer Profile",
          body: icp_summary,
          evidence_urls: evidence.slice(0, 2).map((e) => e.url),
        },
        {
          key: "where",
          title: "Where They Hang Out",
          body: `Based on the research, your audience is most active in these communities, ranked by relevance and engagement density.`,
          evidence_urls: evidence.slice(2).map((e) => e.url),
        },
        {
          key: "pricing",
          title: "Pricing Signal",
          body: pricing_recommendation,
          evidence_urls: [evidence[0]?.url].filter(Boolean) as string[],
        },
      ],
    },
    communities,
    evidence,
  };
}

function extractCommunities(reddit: SearchResult[], hn: SearchResult[]): CommunitySignal[] {
  const communities: CommunitySignal[] = [];

  // Group Reddit results by subreddit.
  const subredditMap = new Map<string, { results: SearchResult[]; count: number }>();
  for (const r of reddit) {
    const sub = r.source ?? "unknown";
    const existing = subredditMap.get(sub) ?? { results: [], count: 0 };
    existing.results.push(r);
    existing.count += 1;
    subredditMap.set(sub, existing);
  }

  for (const [subname, { results, count }] of subredditMap) {
    const firstUrl = results[0]?.url ?? "";
    communities.push({
      name: subname,
      platform: "reddit",
      url: firstUrl.replace(/\/comments\/.*/, "") || `https://reddit.com/${subname}`,
      relevanceReason: `${count} relevant posts found discussing this problem.`,
      estimatedSize: null,
      score: Math.min(95, 50 + count * 10),
    });
  }

  // HN as a single community.
  if (hn.length > 0) {
    communities.push({
      name: "Hacker News",
      platform: "hackernews",
      url: "https://news.ycombinator.com",
      relevanceReason: `${hn.length} relevant discussions found on HN.`,
      estimatedSize: null,
      score: Math.min(90, 60 + hn.length * 5),
    });
  }

  return communities.sort((a, b) => b.score - a.score);
}

function inferPricing(whatTheyPay: string): string {
  const text = whatTheyPay.toLowerCase();
  if (/\$\d+/i.test(text) || /month|mo|year/i.test(text)) {
    return `Users are already paying for alternatives: "${whatTheyPay}". Price competitively — start at the lower end of the mentioned range and differentiate on your niche focus.`;
  }
  return "Limited pricing signal from the input. Start with a free tier and a $9-15/mo pro plan, then adjust based on early conversion data.";
}

function extractPocketDictionary(results: SearchResult[]): { term: string; meaning: string; evidence_url?: string }[] {
  // Extract recurring phrases from snippets as a crude pocket dictionary.
  const wordFreq = new Map<string, number>();
  for (const r of results) {
    const words = r.snippet.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    for (const w of words) {
      wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    }
  }

  const recurring = Array.from(wordFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return recurring.map(([term, count]) => {
    const matchingResult = results.find((r) => r.snippet.toLowerCase().includes(term));
    return {
      term,
      meaning: `Appears ${count} times across community discussions.`,
      evidence_url: matchingResult?.url,
    };
  });
}

// --- Claude synthesizer (real LLM) ---

async function synthesizeWithClaude(input: LLMSynthesizeInput): Promise<LLMSynthesizeOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const prompt = buildSynthesisPrompt(input);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Claude synthesis failed:", res.status, await res.text());
    return synthesizeHeuristic(input);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };

  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  return parseLLMResponse(text, input);
}

// --- OpenAI synthesizer (real LLM) ---

async function synthesizeWithOpenAI(input: LLMSynthesizeInput): Promise<LLMSynthesizeOutput> {
  const apiKey = process.env.OPENAI_API_KEY!;

  const prompt = buildSynthesisPrompt(input);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    console.error("OpenAI synthesis failed:", res.status, await res.text());
    return synthesizeHeuristic(input);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const text = data.choices[0]?.message?.content ?? "";
  return parseLLMResponse(text, input);
}

function buildSynthesisPrompt(input: LLMSynthesizeInput): string {
  const { project, webResults, redditResults, hnResults } = input;

  const formatResults = (label: string, results: SearchResult[]) => {
    if (results.length === 0) return `${label}: (no results)`;
    const items = results.slice(0, 15).map((r, i) => `${i + 1}. [${r.source ?? ""}] ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`).join("\n");
    return `${label}:\n${items}`;
  };

  return `You are Reach, an audience research agent. Given an app and raw search results from communities, produce a structured Audience Report as JSON.

APP:
- Name: ${project.name}
- Problem: ${project.problem}
- Who suffers: ${project.whoSuffers}
- What they pay: ${project.whatTheyPay}
- App URL: ${project.appUrl ?? "N/A"}
- Repo URL: ${project.repoUrl ?? "N/A"}

${formatResults("WEB RESULTS", webResults)}

${formatResults("REDDIT RESULTS", redditResults)}

${formatResults("HACKER NEWS RESULTS", hnResults)}

Respond with ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "icp_summary": "1-2 paragraph ideal customer profile description",
  "verdict": "green" | "yellow" | "red",
  "verdict_reason": "why this verdict — be specific about signal strength",
  "pricing_recommendation": "specific pricing recommendation with reasoning",
  "pricing_currency": "usd",
  "pocket_dictionary": [{"term": "a word users use", "meaning": "what it means in their context", "evidence_url": "a URL from the results"}],
  "content": {
    "sections": [
      {"key": "icp", "title": "Ideal Customer Profile", "body": "...", "evidence_urls": ["..."]},
      {"key": "where", "title": "Where They Hang Out", "body": "...", "evidence_urls": ["..."]},
      {"key": "pricing", "title": "Pricing Signal", "body": "...", "evidence_urls": ["..."]}
    ]
  },
  "communities": [
    {"name": "r/subreddit or community name", "platform": "reddit|hacknews|discord|newsletter|twitter|devto|other", "url": "full URL", "relevanceReason": "why this community is relevant", "estimatedSize": null, "score": 0-100}
  ],
  "evidence": [
    {"supports": "icp|pricing|community", "url": "...", "title": "...", "snippet": "...", "source": "reddit|hackernews|..."}
  ]
}

Rules:
- Every claim MUST be backed by at least one evidence URL from the results.
- If no results were found, verdict = "red".
- pocket_dictionary should use the USERS' words from snippets, not marketing speak.
- communities must only include communities that appeared in the results.
- Be specific and actionable, not generic.`;
}

function parseLLMResponse(text: string, input: LLMSynthesizeInput): LLMSynthesizeOutput {
  try {
    // Strip markdown code fences if present.
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      icp_summary: parsed.icp_summary ?? "",
      verdict: parsed.verdict ?? "yellow",
      verdict_reason: parsed.verdict_reason ?? "",
      pricing_recommendation: parsed.pricing_recommendation ?? "",
      pricing_currency: parsed.pricing_currency ?? "usd",
      pocket_dictionary: parsed.pocket_dictionary ?? [],
      content: parsed.content ?? { sections: [] },
      communities: parsed.communities ?? [],
      evidence: parsed.evidence ?? [],
    };
  } catch (err) {
    console.error("Failed to parse LLM response:", err);
    return synthesizeHeuristic(input);
  }
}