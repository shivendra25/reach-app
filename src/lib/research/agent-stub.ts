import type {
  Report,
  Community,
  CommunityPlatform,
  EvidenceItem,
  ReportContent,
  PocketDictionaryEntry,
} from "@/types/db";

/**
 * Stub research agent.
 *
 * Real implementation (Brick 7) will orchestrate LLM + web/Reddit/HN
 * tools to find where the audience hangs out. For now, this serviceable
 * stub generates a believable report structure that the UI can render
 * end-to-end, so we can validate the full flow before wiring real APIs.
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

/** Simulate async research — returns a structured report after a short delay. */
export async function runResearchStub(input: AgentInput): Promise<AgentResult> {
  // Simulate work the real agent will do.
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Derive keywords from the project text for a plausible-looking report.
  const devSignal = /dev|engineer|code|api|saas|startup|indie|build|deploy/i.test(
    `${input.projectName} ${input.problem} ${input.whoSuffers}`
  );

  const communities = devSignal ? devCommunities() : genericCommunities();

  const evidence = generateEvidence();

  return {
    icp_summary: devSignal
      ? `Independent developers and small eng teams (1-5 people) who feel the pain of ${input.problem.toLowerCase()}. They already use tools like Linear, Notion, or GitHub Issues but find them either too heavy or too generic for their workflow.`
      : `Professionals who suffer from ${input.problem.toLowerCase()}. They currently work around the problem with manual tools and would pay for a dedicated solution.`,
    verdict: devSignal ? "green" : "yellow",
    verdict_reason: devSignal
      ? "Strong community signal: developers actively discuss this problem in multiple findable communities. Willingness to pay is established (comparable tools charge $10-30/mo)."
      : "Moderate signal — the audience exists but may be scattered across broader communities. Research found some discussion but not a dedicated hub.",
    pricing_recommendation: devSignal
      ? "Start at $12/mo (individual) and $39/mo (team). Competitors charge $8-20/mo per seat; your differentiation justifies a slight premium."
      : "Start at $9/mo. The market has low WTP benchmarks; a lower entry price reduces friction while you build the case for a higher tier later.",
    pricing_currency: "usd",
    pocket_dictionary: devSignal
      ? [
          { term: "context switching", meaning: "The productivity tax of jumping between tools to manage work.", evidence_url: evidence[1]?.url },
          { term: "overkill", meaning: "How users describe enterprise tools when they only need a fraction of the features.", evidence_url: evidence[0]?.url },
          { term: "good enough", meaning: "What users say about Spreadsheet/Notion workarounds before they switch.", evidence_url: evidence[2]?.url },
        ]
      : [
          { term: "manual", meaning: "How users describe their current workaround — the core pain word.", evidence_url: evidence[0]?.url },
          { term: "expensive", meaning: "Associated with the incumbent solution they want to leave.", evidence_url: evidence[1]?.url },
        ],
    content: {
      sections: [
        {
          key: "icp",
          title: "Ideal Customer Profile",
          body: devSignal
            ? `Your ICP is independent developers and small eng teams (1-5 people) using Notion or spreadsheets for issue tracking. They ship fast, wear many hats, and need tools that don't get in the way. They're active in communities like r/SoloEngineering, IndieHackers, and HN Show HN threads.`
            : `Your ICP is professionals who feel the pain of ${input.problem.toLowerCase()} and currently use manual or general-purpose workarounds.`,
          evidence_urls: evidence.slice(0, 2).map((e) => e.url),
        },
        {
          key: "where",
          title: "Where They Hang Out",
          body: `Based on the research, your audience is most active in these communities, ranked by relevance and engagement density. Target the top 3 first.`,
          evidence_urls: evidence.slice(2).map((e) => e.url),
        },
        {
          key: "pricing",
          title: "Pricing Signal",
          body: devSignal
            ? "Developers are accustomed to $5-20/mo subscriptions for solo tools. Team plans typically command $8-30/seat/mo. Your differentiation (simplicity, indie-focus) supports a slight premium over the cheapest options."
            : "Users in this space have moderate willingness to pay. A low entry price ($9/mo) with a clear upgrade path is the safest go-to-market.",
          evidence_urls: [evidence[0]?.url].filter(Boolean) as string[],
        },
      ],
    },
    communities,
    evidence,
  };
}

function devCommunities(): Omit<Community, "id" | "report_id" | "created_at">[] {
  return [
    { name: "r/SoloEngineering", platform: "reddit" as CommunityPlatform, url: "https://reddit.com/r/SoloEngineering", relevance_reason: "Solo devs discuss bug tracking and tool fatigue here regularly.", estimated_size: 12500, score: 95 },
    { name: "IndieHackers", platform: "other" as CommunityPlatform, url: "https://indiehackers.com", relevance_reason: "Indie founders actively share tools and workflows; high overlap with your ICP.", estimated_size: 80000, score: 90 },
    { name: "Hacker News — Show HN", platform: "hackernews" as CommunityPlatform, url: "https://news.ycombinator.com/shownew", relevance_reason: "Launch venue for dev tools; your audience reads HN daily.", estimated_size: null, score: 85 },
    { name: "r/SaaS", platform: "reddit" as CommunityPlatform, url: "https://reddit.com/r/SaaS", relevance_reason: "SaaS founders discuss pricing and distribution — your topic.", estimated_size: 95000, score: 75 },
    { name: "dev.to", platform: "devto" as CommunityPlatform, url: "https://dev.to", relevance_reason: "Dev tutorial audience; good for content-led distribution.", estimated_size: null, score: 70 },
  ];
}

function genericCommunities(): Omit<Community, "id" | "report_id" | "created_at">[] {
  return [
    { name: "r/SaaS", platform: "reddit" as CommunityPlatform, url: "https://reddit.com/r/SaaS", relevance_reason: "SaaS founders discuss problems in this space.", estimated_size: 95000, score: 80 },
    { name: "r/Entrepreneur", platform: "reddit" as CommunityPlatform, url: "https://reddit.com/r/Entrepreneur", relevance_reason: "Broader founder community with some discussion of this problem.", estimated_size: 1200000, score: 60 },
  ];
}

function generateEvidence() {
  return [
    {
      supports: "icp",
      url: "https://reddit.com/r/SoloEngineering/comments/example1",
      title: "Anyone else find Linear overkill for solo dev?",
      snippet: "I just want something simple — Linear feels like enterprise software for my 1-person shop.",
      source: "reddit",
    },
    {
      supports: "icp",
      url: "https://news.ycombinator.com/item?id=example2",
      title: "Ask HN: How do you track bugs as a solo dev?",
      snippet: "Notion is fine until you have 50 bugs then it falls apart.",
      source: "hackernews",
    },
    {
      supports: "pricing",
      url: "https://reddit.com/r/SaaS/comments/example3",
      title: "What do you charge for a solo dev tool?",
      snippet: "Started at $5/mo, moved to $12/mo and retention didn't drop at all.",
      source: "reddit",
    },
  ];
}