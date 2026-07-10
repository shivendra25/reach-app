import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { getProject, getLatestReport } from "@/lib/projects/repo";
import ReportRunner from "@/app/projects/[id]/report/ReportRunner";
import { AudienceReport } from "@/app/projects/[id]/report/AudienceReport";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  const { id } = await params;

  if (!user) {
    notFound();
  }

  const project = await getProject(id, user.id);
  if (!project) notFound();

  // If project hasn't passed the gate, redirect back.
  if (project.niche_fit !== "fit") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Not ready yet</h1>
          <p className="text-foreground/60 mb-6">
            Your project needs to pass the niche-fit gate before we can run
            audience research.
          </p>
          <Link
            href={`/projects/${id}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium"
          >
            Back to project
          </Link>
        </div>
      </main>
    );
  }

  // Check for an existing completed report.
  const existing = await getLatestReport(id);

  return (
    <main className="flex flex-1 flex-col px-6 py-12 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-2">
        <Link href={`/projects/${id}`} className="text-sm text-foreground/50 hover:text-foreground">
          ← {project.name}
        </Link>
      </div>

      {existing ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Audience Report
          </h1>
          <p className="text-foreground/60 mb-8">
            For <span className="font-medium">{project.name}</span>
          </p>

          <AudienceReport
            report={existing.report}
            communities={existing.communities}
            evidence={existing.evidence}
          />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Generating Audience Report
          </h1>
          <p className="text-foreground/60 mb-8">
            This takes a minute. We&apos;re searching communities and collecting
            evidence for <span className="font-medium">{project.name}</span>.
          </p>
          <ReportRunner projectId={id} />
        </>
      )}
    </main>
  );
}