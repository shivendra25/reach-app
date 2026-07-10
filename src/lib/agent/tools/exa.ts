import type { WebSearchFn, SearchResult } from "@/lib/agent/tools/types";

/**
 * Exa — semantic web search. Great for finding community discussions.
 * Falls back to no results if API key is missing (scaffolding mode).
 */
export const exaSearch: WebSearchFn = async (query, opts) => {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const maxResults = opts?.maxResults ?? 10;

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      useAutoprompt: true,
      type: "neural",
      contents: {
        text: { maxCharacters: 200 },
      },
    }),
  });

  if (!res.ok) {
    console.error("Exa search failed:", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as {
    results: { title: string; url: string; text?: string; publishedDate?: string }[];
  };

  return data.results.map((r): SearchResult => ({
    title: r.title,
    url: r.url,
    snippet: r.text?.slice(0, 300) ?? "",
    publishedDate: r.publishedDate,
    source: new URL(r.url).hostname,
  }));
};