import type { RedditSearchFn, SearchResult } from "@/lib/agent/tools/types";

/**
 * Reddit search via the public JSON API. No API key required.
 * Searches across all subreddits for posts matching the query, sorted by
 * relevance, and returns structured results.
 *
 * Uses the old.reddit.com JSON endpoint which doesn't require OAuth.
 */
export const redditSearch: RedditSearchFn = async (query, opts) => {
  const maxResults = opts?.maxResults ?? 15;

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=${maxResults}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Reach/1.0 (research agent)" },
    });

    if (!res.ok) {
      console.error("Reddit search failed:", res.status);
      return [];
    }

    const data = (await res.json()) as {
      data: {
        children: {
          data: {
            title: string;
            url: string;
            permalink: string;
            selftext: string;
            subreddit: string;
            score: number;
            num_comments: number;
            created_utc: number;
          };
        }[];
      };
    };

    return data.data.children.map((c): SearchResult => {
      const p = c.data;
      const fullUrl = `https://reddit.com${p.permalink}`;
      const snippet = p.selftext
        ? p.selftext.slice(0, 300)
        : `${p.score} upvotes · ${p.num_comments} comments in r/${p.subreddit}`;
      return {
        title: p.title,
        url: fullUrl,
        snippet,
        source: `r/${p.subreddit}`,
        publishedDate: new Date(p.created_utc * 1000).toISOString(),
      };
    });
  } catch (err) {
    console.error("Reddit search error:", err);
    return [];
  }
};