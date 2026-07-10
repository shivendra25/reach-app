import type { HackerNewsSearchFn, SearchResult } from "@/lib/agent/tools/types";

/**
 * Hacker News search via the Algolia HN Search API. No API key required.
 * Searches stories + comments, sorted by relevance.
 */
export const hnSearch: HackerNewsSearchFn = async (query, opts) => {
  const maxResults = opts?.maxResults ?? 15;

  try {
    const tags = "story";
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=${maxResults}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("HN search failed:", res.status);
      return [];
    }

    const data = (await res.json()) as {
      hits: {
        title: string | null;
        url: string | null;
        story_id: number | null;
        points: number | null;
        num_comments: number | null;
        author: string | null;
        created_at: string;
      }[];
    };

    return data.hits
      .filter((h) => h.story_id !== null)
      .map((h): SearchResult => {
        const hnUrl = `https://news.ycombinator.com/item?id=${h.story_id}`;
        const title = h.title || "(no title)";
        const snippet = `${h.points ?? 0} points · ${h.num_comments ?? 0} comments by ${h.author ?? "unknown"}`;
        return {
          title,
          url: hnUrl,
          snippet,
          source: "hackernews",
          publishedDate: h.created_at,
        };
      });
  } catch (err) {
    console.error("HN search error:", err);
    return [];
  }
};