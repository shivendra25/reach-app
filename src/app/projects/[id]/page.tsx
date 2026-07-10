import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { getProject } from "@/lib/projects/repo";
import NicheGateForm from "@/app/projects/[id]/NicheGateForm";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  const { id } = await params;

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Sign in to view this project</h1>
        <Link href="/login" className="mt-4 text-foreground/60 underline">
          Sign in
        </Link>
      </main>
    );
  }

  const project = await getProject(id, user.id);
  if (!project) notFound();

  const showGate = project.niche_fit === "pending" || project.niche_fit === "not_fit";
  const showNotFitWarning = project.niche_fit === "not_fit";
  const researchReady = project.niche_fit === "fit";

  return (
    <main className="flex flex-1 flex-col px-6 py-12 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-2 text-sm text-foreground/60">
          {project.app_url && (
            <a href={project.app_url} target="_blank" rel="noopener" className="underline">
              App ↗
            </a>
          )}
          {project.repo_url && (
            <a href={project.repo_url} target="_blank" rel="noopener" className="underline">
              Repo ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="rounded-xl border border-foreground/10 p-5">
          <h2 className="text-sm font-medium text-foreground/50 mb-2">Problem</h2>
          <p className="text-sm">{project.problem}</p>
        </div>
        <div className="rounded-xl border border-foreground/10 p-5">
          <h2 className="text-sm font-medium text-foreground/50 mb-2">Who suffers</h2>
          <p className="text-sm">{project.who_suffers}</p>
        </div>
        <div className="rounded-xl border border-foreground/10 p-5">
          <h2 className="text-sm font-medium text-foreground/50 mb-2">What they pay</h2>
          <p className="text-sm">{project.what_they_pay}</p>
        </div>
        <div className="rounded-xl border border-foreground/10 p-5">
          <h2 className="text-sm font-medium text-foreground/50 mb-2">Niche fit</h2>
          <p className="text-sm capitalize">{project.niche_fit}</p>
          {project.niche_fit_reason && (
            <p className="text-xs text-foreground/50 mt-1">{project.niche_fit_reason}</p>
          )}
        </div>
      </div>

      {showNotFitWarning && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-medium text-red-800 mb-1">
            This app doesn&apos;t fit Reach yet
          </h2>
          <p className="text-sm text-red-700">{project.niche_fit_reason}</p>
          <p className="text-xs text-red-600 mt-2">
            You can still re-evaluate below if you&apos;ve narrowed your audience.
          </p>
        </div>
      )}

      {showGate && (
        <div className="mb-8 rounded-xl border border-foreground/10 p-6">
          <h2 className="text-lg font-semibold mb-1">Quick fit check</h2>
          <p className="text-sm text-foreground/60 mb-6">
            Answer 3 questions so we can determine if your app is a good fit for
            community-based audience discovery.
          </p>
          <NicheGateForm projectId={project.id} />
        </div>
      )}

      {researchReady && (
        <div className="mt-2 flex flex-col gap-4">
          <Link
            href={`/projects/${project.id}/report`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium hover:opacity-90 transition self-start"
          >
            {project.status === "researched" ? "View Audience Report" : "Generate Audience Report"}
          </Link>
          {project.niche_fit_reason && (
            <p className="text-sm text-foreground/50">{project.niche_fit_reason}</p>
          )}
        </div>
      )}
    </main>
  );
}