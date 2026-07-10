"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { startResearch } from "@/lib/research/runner";

/**
 * Triggers a research run for a project. Synchronous in the scaffold — the
 * page polls for status. In production this kicks off a background job.
 */
export async function startResearchAction(projectId: string) {
  const user = await getUser();
  if (!user) redirect("/login");

  try {
    await startResearch({ projectId, userId: user.id });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Research failed",
    } as const;
  }

  return { ok: true } as const;
}