import { createServerClient } from "@/lib/db/client";
import { env } from "@/lib/env";
import type {
  Project,
  ProjectInput,
  ResearchRun,
  Report,
  Community,
  EvidenceItem,
  NicheFit,
} from "@/types/db";

/**
 * Data access layer for projects and their downstream reports.
 * All server-side only. Each method authenticates via the caller
 * and scopes queries by user_id.
 */

// When Supabase is not yet wired (scaffolding), we use an in-memory store
// so the project flow is fully testable without a DB connection.
const memStore: Map<string, Project & { _report?: Report; _communities?: Community[]; _evidence?: EvidenceItem[]; _run?: ResearchRun }> = new Map();
let memCounter = 0;

function isDbConfigured() {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function newId() {
  memCounter += 1;
  return `proj_${Date.now()}_${memCounter}`;
}

export async function createProject(
  userId: string,
  input: ProjectInput
): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: newId(),
    user_id: userId,
    name: input.name,
    app_url: input.app_url || null,
    repo_url: input.repo_url || null,
    problem: input.problem,
    who_suffers: input.who_suffers,
    what_they_pay: input.what_they_pay,
    niche_fit: "pending",
    niche_fit_reason: null,
    status: "created",
    created_at: now,
    updated_at: now,
  };

  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: input.name,
        app_url: input.app_url || null,
        repo_url: input.repo_url || null,
        problem: input.problem,
        who_suffers: input.who_suffers,
        what_they_pay: input.what_they_pay,
        niche_fit: "pending",
        status: "created",
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return normalizeProject(data);
  }

  memStore.set(project.id, project);
  return project;
}

export async function getProject(
  projectId: string,
  userId: string
): Promise<Project | null> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();
    return data ? normalizeProject(data) : null;
  }

  const p = memStore.get(projectId);
  if (!p || p.user_id !== userId) return null;
  return p;
}

export async function listProjects(userId: string): Promise<Project[]> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data || []).map(normalizeProject);
  }

  return Array.from(memStore.values())
    .filter((p) => p.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateProjectNicheFit(
  projectId: string,
  userId: string,
  fit: NicheFit,
  reason: string
): Promise<Project | null> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("projects")
      .update({
        niche_fit: fit,
        niche_fit_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("user_id", userId)
      .select()
      .single();
    return data ? normalizeProject(data) : null;
  }

  const p = memStore.get(projectId);
  if (!p || p.user_id !== userId) return null;
  p.niche_fit = fit;
  p.niche_fit_reason = reason;
  p.updated_at = new Date().toISOString();
  return p;
}

export async function updateProjectStatus(
  projectId: string,
  userId: string,
  status: Project["status"]
): Promise<void> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    await supabase
      .from("projects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", userId);
    return;
  }

  const p = memStore.get(projectId);
  if (!p || p.user_id !== userId) return;
  p.status = status;
  p.updated_at = new Date().toISOString();
}

// --- Run + Report helpers (used by research agent brick later) ---

export async function createRun(projectId: string): Promise<string> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("research_runs")
      .insert({ project_id: projectId, status: "queued" })
      .select()
      .single();
    if (error) throw new Error(`Failed to create run: ${error.message}`);
    return data.id;
  }

  const runId = `run_${Date.now()}`;
  const p = memStore.get(projectId);
  if (p) {
    p._run = {
      id: runId,
      project_id: projectId,
      status: "queued",
      started_at: null,
      completed_at: null,
      error: null,
      trace: null,
      created_at: new Date().toISOString(),
    };
  }
  return runId;
}

export async function getLatestRun(projectId: string): Promise<ResearchRun | null> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("research_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data ? normalizeRun(data) : null;
  }

  const p = memStore.get(projectId);
  return p?._run ?? null;
}

export async function getLatestReport(projectId: string): Promise<{
  report: Report;
  communities: Community[];
  evidence: EvidenceItem[];
} | null> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!report) return null;

    const [{ data: communities }, { data: evidence }] = await Promise.all([
      supabase.from("communities").select("*").eq("report_id", report.id).order("score", { ascending: false }),
      supabase.from("evidence_items").select("*").eq("report_id", report.id),
    ]);

    return {
      report: normalizeReport(report),
      communities: (communities || []).map(normalizeCommunity),
      evidence: (evidence || []).map(normalizeEvidence),
    };
  }

  const p = memStore.get(projectId);
  if (!p?._report) return null;
  return {
    report: p._report,
    communities: p._communities ?? [],
    evidence: p._evidence ?? [],
  };
}

// --- In-memory helpers for the research agent to store results ---

export async function storeReport(
  projectId: string,
  runId: string,
  report: Omit<Report, "id" | "project_id" | "run_id" | "created_at">,
  communities: Omit<Community, "id" | "report_id" | "created_at">[],
  evidence: Omit<EvidenceItem, "id" | "report_id" | "created_at">[]
): Promise<void> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const { data: reportRow, error: reportErr } = await supabase
      .from("reports")
      .insert({
        project_id: projectId,
        run_id: runId,
        icp_summary: report.icp_summary,
        verdict: report.verdict,
        verdict_reason: report.verdict_reason,
        pricing_recommendation: report.pricing_recommendation,
        pricing_currency: report.pricing_currency,
        pocket_dictionary: report.pocket_dictionary,
        content: report.content,
      })
      .select()
      .single();
    if (reportErr) throw new Error(`Failed to store report: ${reportErr.message}`);

    const reportId = reportRow.id;

    if (communities.length > 0) {
      await supabase.from("communities").insert(
        communities.map((c) => ({ ...c, report_id: reportId }))
      );
    }
    if (evidence.length > 0) {
      await supabase.from("evidence_items").insert(
        evidence.map((e) => ({ ...e, report_id: reportId }))
      );
    }
    return;
  }

  const p = memStore.get(projectId);
  if (!p) return;
  const now = new Date().toISOString();
  const reportId = `rep_${Date.now()}`;
  p._report = {
    ...report,
    id: reportId,
    project_id: projectId,
    run_id: runId,
    created_at: now,
  };
  p._communities = communities.map((c, i) => ({
    ...c,
    id: `com_${Date.now()}_${i}`,
    report_id: reportId,
    created_at: now,
  }));
  p._evidence = evidence.map((e, i) => ({
    ...e,
    id: `ev_${Date.now()}_${i}`,
    report_id: reportId,
    created_at: now,
  }));
}

export async function updateRunStatus(
  runId: string,
  projectId: string,
  status: ResearchRun["status"],
  error?: string
): Promise<void> {
  if (isDbConfigured()) {
    const supabase = createServerClient();
    const updates: Record<string, unknown> = { status };
    if (status === "running") updates.started_at = new Date().toISOString();
    if (status === "completed" || status === "failed") updates.completed_at = new Date().toISOString();
    if (error) updates.error = error;
    await supabase.from("research_runs").update(updates).eq("id", runId);
    return;
  }

  const p = memStore.get(projectId);
  if (!p?._run || p._run.id !== runId) return;
  p._run.status = status;
  if (status === "running") p._run.started_at = new Date().toISOString();
  if (status === "completed" || status === "failed") p._run.completed_at = new Date().toISOString();
  if (error) p._run.error = error;
}

// --- Normalizers (Supabase returns snake_case; our types match) ---

function normalizeProject(data: Record<string, unknown>): Project {
  return data as unknown as Project;
}
function normalizeRun(data: Record<string, unknown>): ResearchRun {
  return data as unknown as ResearchRun;
}
function normalizeReport(data: Record<string, unknown>): Report {
  return data as unknown as Report;
}
function normalizeCommunity(data: Record<string, unknown>): Community {
  return data as unknown as Community;
}
function normalizeEvidence(data: Record<string, unknown>): EvidenceItem {
  return data as unknown as EvidenceItem;
}

// --- Test helper: clear in-memory store ---
export function _resetMemStore() {
  memStore.clear();
  memCounter = 0;
}