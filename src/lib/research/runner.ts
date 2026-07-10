import {
  createRun,
  updateRunStatus,
  storeReport,
  getProject,
  updateProjectStatus,
} from "@/lib/projects/repo";
import type { Project } from "@/types/db";
import { runResearch } from "@/lib/agent/research-agent";
import { runResearchStub } from "@/lib/research/agent-stub";

export interface StartResearchArgs {
  projectId: string;
  userId: string;
}

/**
 * Start a research run. Creates a queued run, calls the agent, and stores
 * the report. In production this would be async (background worker / queue);
 * for now it runs synchronously and falls back to the stub agent when real
 * LLM keys are missing.
 *
 * Non-streaming first — we'll add streaming + real async in Brick 7.
 */
export async function startResearch({
  projectId,
  userId,
}: StartResearchArgs): Promise<void> {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Project not found");
  if (project.niche_fit !== "fit") {
    throw new Error("Project must pass the niche-fit gate before research.");
  }

  // Mark project as researching.
  await updateProjectStatus(projectId, userId, "researching");

  // Create a new run record.
  const runId = await createRun(projectId);
  await updateRunStatus(runId, projectId, "running");

  try {
    const agentResult = await runAgent(project);
    await storeReport(projectId, runId, agentResult, agentResult.communities, agentResult.evidence);
    await updateRunStatus(runId, projectId, "completed");
    await updateProjectStatus(projectId, userId, "researched");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown research failure";
    await updateRunStatus(runId, projectId, "failed", message);
    await updateProjectStatus(projectId, userId, "created");
    throw err;
  }
}

/**
 * Decide which agent to run. If any real API key is configured, use the
 * real agent (which falls back gracefully per-tool). Otherwise use the stub
 * so the flow works end-to-end in scaffolding mode.
 */
function isRealAgentConfigured() {
  return !!(
    process.env.EXA_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

async function runAgent(project: Project) {
  const agentInput = {
    projectName: project.name,
    problem: project.problem,
    whoSuffers: project.who_suffers,
    whatTheyPay: project.what_they_pay,
    appUrl: project.app_url,
    repoUrl: project.repo_url,
  };

  if (isRealAgentConfigured()) {
    return runResearch(agentInput);
  }

  return runResearchStub(agentInput);
}