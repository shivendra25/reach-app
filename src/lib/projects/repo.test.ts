import { describe, it, expect, beforeEach } from "vitest";
import {
  createProject,
  getProject,
  listProjects,
  updateProjectNicheFit,
  updateProjectStatus,
  _resetMemStore,
} from "@/lib/projects/repo";

// Ensure no real DB — force in-memory mode.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  _resetMemStore();
});

const USER = "user-1";
const INPUT = {
  name: "Test App",
  app_url: "https://test.app",
  repo_url: "https://github.com/me/test",
  problem: "Devs lose track of bugs in Notion",
  who_suffers: "Solo indie devs juggling issues in spreadsheets",
  what_they_pay: "$10/mo for Linear",
};

describe("project repo (in-memory)", () => {
  it("creates and fetches a project by id", async () => {
    const p = await createProject(USER, INPUT);
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("Test App");
    expect(p.status).toBe("created");
    expect(p.niche_fit).toBe("pending");

    const fetched = await getProject(p.id, USER);
    expect(fetched?.id).toBe(p.id);
  });

  it("rejects fetch from a different user", async () => {
    const p = await createProject(USER, INPUT);
    const fetched = await getProject(p.id, "other-user");
    expect(fetched).toBeNull();
  });

  it("lists only the user's projects, newest first", async () => {
    await createProject(USER, { ...INPUT, name: "First" });
    await new Promise((r) => setTimeout(r, 5));
    await createProject(USER, { ...INPUT, name: "Second" });
    await createProject("user-2", { ...INPUT, name: "Theirs" });

    const list = await listProjects(USER);
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("Second");
    expect(list[1].name).toBe("First");
  });

  it("updates niche fit and reason", async () => {
    const p = await createProject(USER, INPUT);
    const updated = await updateProjectNicheFit(p.id, USER, "fit", "Dev tool with a clear niche.");
    expect(updated?.niche_fit).toBe("fit");
    expect(updated?.niche_fit_reason).toBe("Dev tool with a clear niche.");
  });

  it("updates project status", async () => {
    const p = await createProject(USER, INPUT);
    await updateProjectStatus(p.id, USER, "researching");
    const fetched = await getProject(p.id, USER);
    expect(fetched?.status).toBe("researching");
  });
});