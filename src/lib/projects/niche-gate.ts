import type { NicheFit, Project } from "@/types/db";

/**
 * Niche-fit gate.
 *
 * v1 only works for apps whose audience is findable in online communities
 * (dev tools, prosumer tools, vertical SaaS). Pure entertainment / general
 * B2C novelty apps get rejected early so reports stay high quality and we
 * don't waste a research run producing a blank report.
 *
 * This is a heuristic gate — fast, synchronous, no LLM call needed.
 * The LLM agent can override later if there's enough signal.
 */

export interface NicheGateInput {
  name: string;
  problem: string;
  who_suffers: string;
  what_they_pay: string;
}

export interface NicheGateResult {
  fit: NicheFit;
  reason: string;
}

// Qualifying questions the user sees after project creation.
// Their answers refine the gate before the full research run.
export const QUALIFYING_QUESTIONS = [
  {
    key: "audience_type",
    label: "Who is your app primarily for?",
    options: [
      { value: "devs", label: "Developers / engineers" },
      { value: "prosumers", label: "Power users of a specific tool (designers, analysts, writers)" },
      { value: "vertical_saas", label: "Professionals in a specific industry (lawyers, doctors, accountants)" },
      { value: "general_b2c", label: "General consumers / mass market" },
      { value: "entertainment", label: "Games, fun, or novelty" },
    ],
  } as const,
  {
    key: "community_findable",
    label: "Can your users be found discussing this problem online?",
    options: [
      { value: "yes_specific", label: "Yes — there are specific subreddits, forums, or Discords" },
      { value: "yes_general", label: "Somewhat — they're in general communities but discuss this" },
      { value: "no", label: "No — this audience doesn't gather anywhere online" },
    ],
  } as const,
  {
    key: "willingness_to_pay",
    label: "Would users plausibly pay for this?",
    options: [
      { value: "yes_b2b", label: "Yes — it's for work, budget exists" },
      { value: "yes_b2c_small", label: "Yes — small personal subscription ($5-20/mo)" },
      { value: "maybe_ad", label: "Maybe — free with ads or one-time purchase" },
      { value: "no_free", label: "No — users expect this to be free" },
    ],
  } as const,
] as const;

export type QualifyingAnswers = Record<string, string>;

const FIT_AUDIENCES = new Set(["devs", "prosumers", "vertical_saas"]);
const NOTFIT_AUDIENCES = new Set(["entertainment"]);

export function evaluateNicheFit(
  project: Pick<Project, "name" | "problem" | "who_suffers" | "what_they_pay">,
  answers?: QualifyingAnswers
): NicheGateResult {
  // Without qualifying answers, use the project text alone.
  if (!answers || Object.keys(answers).length === 0) {
    return evaluateFromText(project);
  }

  const audience = answers.audience_type;
  const findable = answers.community_findable;
  const wtp = answers.willingness_to_pay;

  // Hard reject: entertainment + can't find community.
  if (NOTFIT_AUDIENCES.has(audience)) {
    return {
      fit: "not_fit",
      reason:
        "Entertainment / novelty apps don't have a findable niche audience for community-based distribution. Reach works best when your users gather in specific online communities.",
    };
  }

  // Hard reject: audience explicitly says they can't be found online.
  if (findable === "no") {
    return {
      fit: "not_fit",
      reason:
        "If your audience doesn't gather in online communities, Reach can't find or reach them. This tool is designed for apps whose users discuss their problems in places like Reddit, HN, Discord, or niche newsletters.",
    };
  }

  // Green: fit audience + findable + willing to pay.
  if (FIT_AUDIENCES.has(audience) && findable === "yes_specific" && wtp !== "no_free") {
    return {
      fit: "fit",
      reason:
        "Your audience is findable in specific online communities and has willingness to pay. Reach can find them and draft native posts to reach them.",
    };
  }

  // Yellow: fit audience but not specifically findable, or uncertain WTP.
  if (FIT_AUDIENCES.has(audience)) {
    return {
      fit: "fit",
      reason:
        "Your audience type is findable, though they may be spread across general communities. Reach will look harder for the specific pockets where they gather.",
    };
  }

  // General B2C — only fit if specifically findable and willing to pay.
  if (audience === "general_b2c" && findable === "yes_specific" && wtp !== "no_free") {
    return {
      fit: "fit",
      reason:
        "General B2C, but your users gather in specific online communities and have willingness to pay. Proceeding with caution — the research report will confirm whether there's enough signal.",
    };
  }

  // General B2C, uncertain.
  return {
    fit: "not_fit",
    reason:
      "General B2C audiences are hard to find in specific communities without more targeting. Consider narrowing your audience definition and try again.",
  };
}

/** Fallback heuristic from project text alone (used when answers aren't provided yet). */
function evaluateFromText(
  project: Pick<Project, "name" | "problem" | "who_suffers" | "what_they_pay">
): NicheGateResult {
  const text = `${project.name} ${project.problem} ${project.who_suffers} ${project.what_they_pay}`.toLowerCase();

  // Positive signals — the who_suffers names a specific role.
  const nicheSignals = [
    "dev", "developer", "engineer", "designer", "analyst", "writer",
    "lawyer", "doctor", "accountant", "researcher", "marketer", "founder",
    "indie", "saas", "startup", "team", "agency", "freelancer", "consult",
    "data", "ai", "ml", "api", "code", "deploy", "database", "workflow",
    "content", "creator", "newsletter", "podcast",
  ];

  // Negative signals — mass market / entertainment.
  const broadSignals = [
    "everyone", "anyone", "fun", "game", "party", "everyone", "all people",
    "social", "dating", "meme", "entertainment", "kids", "casual",
  ];

  const nicheCount = nicheSignals.filter((s) => text.includes(s)).length;
  const broadCount = broadSignals.filter((s) => text.includes(s)).length;

  if (broadCount > nicheCount) {
    return {
      fit: "not_fit",
      reason:
        "Your app description sounds like a broad consumer or entertainment product. Reach works best for apps with a definable, findable niche audience (dev tools, prosumer tools, vertical SaaS).",
    };
  }

  if (nicheCount >= 2) {
    return {
      fit: "fit",
      reason:
        "Your app targets a specific audience that's likely findable in online communities.",
    };
  }

  return {
    fit: "pending",
    reason:
      "We don't have enough signal from your description yet. Please answer a few qualifying questions to determine if Reach is a good fit.",
  };
}