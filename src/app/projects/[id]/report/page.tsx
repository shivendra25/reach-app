import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { getProject, getLatestReport } from "@/lib/projects/repo";
import ReportRunner from "@/app/projects/[id]/report/ReportRunner";

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

          {/* Verdict */}
          <div className="rounded-xl border border-foreground/10 p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <VerdictIcon verdict={existing.report.verdict} />
              <h2 className="text-lg font-semibold capitalize">
                {existing.report.verdict} — {verdictLabel(existing.report.verdict)}
              </h2>
            </div>
            <p className="text-sm text-foreground/70">{existing.report.verdict_reason}</p>
          </div>

          {/* ICP */}
          <div className="rounded-xl border border-foreground/10 p-6 mb-6">
            <h2 className="text-sm font-medium text-foreground/50 mb-2">Ideal Customer Profile</h2>
            <p className="text-sm">{existing.report.icp_summary}</p>
          </div>

          {/* Communities */}
          {existing.communities.length > 0 && (
            <div className="rounded-xl border border-foreground/10 p-6 mb-6">
              <h2 className="text-sm font-medium text-foreground/50 mb-4">Where They Hang Out</h2>
              <ul className="flex flex-col gap-4">
                {existing.communities.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-xs font-medium capitalize">
                        {c.platform}
                      </span>
                      <a href={c.url} target="_blank" rel="noopener" className="font-medium underline">
                        {c.name} ↗
                      </a>
                      {c.estimated_size && (
                        <span className="text-xs text-foreground/50">
                          ~{c.estimated_size.toLocaleString()} members
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/60">{c.relevance_reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pocket Dictionary */}
          {existing.report.pocket_dictionary.length > 0 && (
            <div className="rounded-xl border border-foreground/10 p-6 mb-6">
              <h2 className="text-sm font-medium text-foreground/50 mb-4">Messaging Pocket Dictionary</h2>
              <p className="text-xs text-foreground/50 mb-4">
                Their words, not yours. Use these to sound native.
              </p>
              <dl className="flex flex-col gap-3">
                {existing.report.pocket_dictionary.map((entry, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <dt className="font-medium">“{entry.term}”</dt>
                    <dd className="text-sm text-foreground/60">{entry.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Pricing */}
          {existing.report.pricing_recommendation && (
            <div className="rounded-xl border border-foreground/10 p-6 mb-6">
              <h2 className="text-sm font-medium text-foreground/50 mb-2">Pricing Recommendation</h2>
              <p className="text-sm">{existing.report.pricing_recommendation}</p>
            </div>
          )}

          {/* Evidence */}
          {existing.evidence.length > 0 && (
            <div className="rounded-xl border border-foreground/10 p-6">
              <h2 className="text-sm font-medium text-foreground/50 mb-4">
                Evidence ({existing.evidence.length})
              </h2>
              <ul className="flex flex-col gap-3">
                {existing.evidence.map((e) => (
                  <li key={e.id} className="flex flex-col gap-0.5">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm font-medium underline"
                    >
                      {e.title || e.url} ↗
                    </a>
                    {e.snippet && (
                      <p className="text-xs text-foreground/50 italic">{e.snippet}</p>
                    )}
                    <span className="text-xs text-foreground/40">supports: {e.supports}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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

function VerdictIcon({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };
  return <div className={`h-4 w-4 rounded-full ${styles[verdict] ?? "bg-gray-400"}`} />;
}

function verdictLabel(verdict: string) {
  const labels: Record<string, string> = {
    green: "Worth launching",
    yellow: "Proceed with caution",
    red: "Hard to reach",
  };
  return labels[verdict] ?? verdict;
}