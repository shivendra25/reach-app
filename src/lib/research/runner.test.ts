import { describe, it, expect, beforeEach } from "vitest";
import {
  createProject,
  getProject,
  getLatestRun,
  getLatestReport,
  updateProjectNicheFit,
  _resetMemStore,
} from "@/lib/projects/repo";
import { startResearch } from "@/lib/research/runner";

// Force in-memory mode.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  _resetMemStore();
});

const USER = "user-1";
const INPUT = {
  name: "BugNest",
  app_url: "https://bugnest.app",
  repo_url: "https://github.com/me/bugnest",
  problem: "Solo devs can't track bugs in Notion without it becoming chaos",
  who_suffers: "Indie developers shipping fast who need lightweight bug tracking",
  what_they_pay: "$10/mo for Linear or $0 for a spreadsheet",
};

describe("research runner (in-memory, stub agent)", () => {
  it("creates a completed run and stores a report", async () => {
    // Setup: create project, pass niche-fit gate.
    const project = await createProject(USER, INPUT);
    await updateProjectNicheFit(project.id, USER, "fit", "Dev tool, niche audience.");

    // Run research.
    await startResearch({ projectId: project.id, userId: USER });

    // Verify project status advanced.
    const updated = await getProject(project.id, USER);
    expect(updated?.status).toBe("researched");

    // Verify a run exists and is completed.
    const run = await getLatestRun(project.id);
    expect(run?.status).toBe("completed");
    expect(run?.error).toBeNull();

    // Verify a report was stored.
    const report = await getLatestReport(project.id);
    expect(report).not.toBeNull();
    expect(report!.report.verdict).toBe("green"); // dev-signal → green
    expect(report!.report.icp_summary).toContain("developers");
    expect(report!.communities.length).toBeGreaterThan(0);
    expect(report!.evidence.length).toBeGreaterThan(0);
  }, 10000);

  it("rejects research on a project that hasn't passed the gate", async () => {
    const project = await createProject(USER, INPUT);
    // niche_fit defaults to "pending".

    await expect(
      startResearch({ projectId: project.id, userId: USER })
    ).rejects.toThrow("niche-fit gate");
  });

  it("rejects research from a different user", async () => {
    const project = await createProject(USER, INPUT);
    await updateProjectNicheFit(project.id, USER, "fit", "ok");

    await expect(
      startResearch({ projectId: project.id, userId: "other-user" })
    ).rejects.toThrow();
  });
});