import type {
  SearchResult,
  CommunitySignal,
  EvidenceSignal,
  LLMSynthesizeOutput,
} from "@/lib/agent/tools/types";
import { exaSearch } from "@/lib/agent/tools/exa";
import { redditSearch } from "@/lib/agent/tools/reddit";
import { hnSearch } from "@/lib/agent/tools/hn";
import { synthesize } from "@/lib/agent/tools/synthesize";
import type { Report, Community, EvidenceItem, ReportContent, PocketDictionaryEntry } from "@/types/db";

/**
 * Real research agent.
 *
 * Orchestrates: web search (Exa) → Reddit search → HN search → LLM synthesis.
 * Replaces the stub agent from Brick 6 when this module is used.
 *
 * Falls back gracefully: if Exa isn't configured, Reddit + HN still work
 * (they don't need API keys). If no LLM key is set, the heuristic synthesizer
 * produces a reasonable report from the raw results alone.
 */

export interface AgentInput {
  projectName: string;
  problem: string;
  whoSuffers: string;
  whatTheyPay: string;
  appUrl: string | null;
  repoUrl: string | null;
}

export interface AgentResult {
  icp_summary: string;
  verdict: Report["verdict"];
  verdict_reason: string;
  pricing_recommendation: string;
  pricing_currency: string;
  pocket_dictionary: PocketDictionaryEntry[];
  content: ReportContent;
  communities: Omit<Community, "id" | "report_id" | "created_at">[];
  evidence: Omit<EvidenceItem, "id" | "report_id" | "created_at">[];
}

export async function runResearch(input: AgentInput): Promise<AgentResult> {
  // Build search queries from the project's problem + who_suffers.
  const queries = buildQueries(input);

  // Run all searches in parallel for speed.
  const [webResults, redditResults, hnResults] = await Promise.all([
    exaSearch(queries.web, { maxResults: 10 }).catch(() => [] as SearchResult[]),
    redditSearch(queries.reddit, { maxResults: 15 }).catch(() => [] as SearchResult[]),
    hnSearch(queries.hn, { maxResults: 15 }).catch(() => [] as SearchResult[]),
  ]);

  // Synthesize the structured report.
  const synthesis: LLMSynthesizeOutput = await synthesize({
    project: {
      name: input.projectName,
      problem: input.problem,
      whoSuffers: input.whoSuffers,
      whatTheyPay: input.whatTheyPay,
      appUrl: input.appUrl,
      repoUrl: input.repoUrl,
    },
    webResults,
    redditResults,
    hnResults,
  });

  // Map the synthesis output to our DB-shaped AgentResult.
  return {
    icp_summary: synthesis.icp_summary,
    verdict: synthesis.verdict,
    verdict_reason: synthesis.verdict_reason,
    pricing_recommendation: synthesis.pricing_recommendation,
    pricing_currency: synthesis.pricing_currency,
    pocket_dictionary: synthesis.pocket_dictionary,
    content: synthesis.content,
    communities: synthesis.communities.map((c) => ({
      name: c.name,
      platform: c.platform,
      url: c.url,
      relevance_reason: c.relevanceReason,
      estimated_size: c.estimatedSize,
      score: c.score,
    })) satisfies Omit<Community, "id" | "report_id" | "created_at">[],
    evidence: synthesis.evidence.map((e) => ({
      supports: e.supports,
      url: e.url,
      title: e.title,
      snippet: e.snippet,
      source: e.source,
    })) satisfies Omit<EvidenceItem, "id" | "report_id" | "created_at">[],
  };
}

/** Build search queries tuned for each platform. */
function buildQueries(input: AgentInput): { web: string; reddit: string; hn: string } {
  // Extract the core problem phrase.
  const problemShort = input.problem.split(".").slice(0, 2).join(". ").slice(0, 100);
  const whoShort = input.whoSuffers.split(",").slice(0, 3).join(",").slice(0, 80);

  return {
    web: `${whoShort} ${problemShort} discussion forum community`,
    reddit: `${problemShort} ${whoShort}`,
    hn: `${input.projectName} ${problemShort}`.slice(0, 80),
  };
}