import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { getLatestRun, getLatestReport } from "@/lib/projects/repo";

/**
 * GET /api/research/[projectId]/status
 * Returns the latest run status + whether a report is ready.
 * Used by the client to poll while research is running.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;
  const run = await getLatestRun(projectId);
  const report = await getLatestReport(projectId);

  if (!run) {
    return NextResponse.json({ run: null, reportReady: false });
  }

  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      error: run.error,
    },
    reportReady: run.status === "completed" && !!report,
  });
}