export type NicheFit = "pending" | "fit" | "not_fit";
export type ProjectStatus = "created" | "researching" | "researched" | "distributing";
export type RunStatus = "queued" | "running" | "completed" | "failed";
export type Verdict = "green" | "yellow" | "red";
export type CommunityPlatform =
  | "reddit"
  | "hackernews"
  | "discord"
  | "newsletter"
  | "twitter"
  | "devto"
  | "other";
export type PostStatus = "draft" | "scheduled" | "posted" | "failed";
export type SignalKind = "views" | "upvotes" | "comments" | "clicks" | "conversions";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_pioneer: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  app_url: string | null;
  repo_url: string | null;
  problem: string;
  who_suffers: string;
  what_they_pay: string;
  niche_fit: NicheFit;
  niche_fit_reason: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ResearchRun {
  id: string;
  project_id: string;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  trace: unknown;
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  run_id: string;
  icp_summary: string;
  verdict: Verdict;
  verdict_reason: string;
  pricing_recommendation: string | null;
  pricing_currency: string;
  pocket_dictionary: PocketDictionaryEntry[];
  content: ReportContent;
  created_at: string;
}

export interface PocketDictionaryEntry {
  term: string;
  meaning: string;
  evidence_url?: string;
}

export interface Community {
  id: string;
  report_id: string;
  name: string;
  platform: CommunityPlatform;
  url: string;
  relevance_reason: string;
  estimated_size: number | null;
  score: number;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  report_id: string;
  supports: string;
  url: string;
  title: string | null;
  snippet: string | null;
  source: string | null;
  created_at: string;
}

export interface DistributionPost {
  id: string;
  project_id: string;
  community_id: string | null;
  platform: CommunityPlatform;
  title: string | null;
  body: string;
  status: PostStatus;
  posted_at: string | null;
  external_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: string;
  post_id: string;
  kind: SignalKind;
  value: number;
  captured_at: string;
}

/** The structured report payload stored in reports.content. */
export interface ReportContent {
  // The full audience narrative, sectioned.
  sections: ReportSection[];
}

export interface ReportSection {
  key: string;
  title: string;
  body: string;
  // Evidence link IDs that support this section.
  evidence_urls: string[];
}

/** The raw input a user gives when creating a project (before persistence). */
export interface ProjectInput {
  name: string;
  app_url: string;
  repo_url: string;
  problem: string;
  who_suffers: string;
  what_they_pay: string;
}