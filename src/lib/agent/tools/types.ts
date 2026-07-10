/**
 * Research tool interfaces.
 *
 * Each tool is a typed, mockable function that the agent orchestrator calls.
 * The agent doesn't know which provider backs each tool — it just sees the
 * interface. This makes the agent fully testable without real API keys.
 */

/** A single search result from any web search provider. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

/** A community where the audience might gather. */
export interface CommunitySignal {
  name: string;
  platform: "reddit" | "hackernews" | "discord" | "newsletter" | "twitter" | "devto" | "other";
  url: string;
  relevanceReason: string;
  estimatedSize: number | null;
  score: number;
}

/** Evidence that backs up a claim in the report. */
export interface EvidenceSignal {
  supports: string;
  url: string;
  title: string;
  snippet: string;
  source: string;
}

/** A tool the research agent can call. */
export interface ResearchTool {
  name: string;
  description: string;
  run: (query: string, opts?: ResearchToolOpts) => Promise<unknown>;
}

export interface ResearchToolOpts {
  maxResults?: number;
}

// --- Concrete tool signatures the agent uses ---

export type WebSearchFn = (query: string, opts?: ResearchToolOpts) => Promise<SearchResult[]>;

export type RedditSearchFn = (query: string, opts?: ResearchToolOpts) => Promise<SearchResult[]>;

export type HackerNewsSearchFn = (query: string, opts?: ResearchToolOpts) => Promise<SearchResult[]>;

// --- LLM orchestrator ---

export interface LLMSynthesizeInput {
  project: {
    name: string;
    problem: string;
    whoSuffers: string;
    whatTheyPay: string;
    appUrl: string | null;
    repoUrl: string | null;
  };
  webResults: SearchResult[];
  redditResults: SearchResult[];
  hnResults: SearchResult[];
}

export interface LLMSynthesizeOutput {
  icp_summary: string;
  verdict: "green" | "yellow" | "red";
  verdict_reason: string;
  pricing_recommendation: string;
  pricing_currency: string;
  pocket_dictionary: { term: string; meaning: string; evidence_url?: string }[];
  content: {
    sections: { key: string; title: string; body: string; evidence_urls: string[] }[];
  };
  communities: CommunitySignal[];
  evidence: EvidenceSignal[];
}

export type LLMSynthesizeFn = (input: LLMSynthesizeInput) => Promise<LLMSynthesizeOutput>;