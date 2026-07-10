import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { getProject } from "@/lib/projects/repo";

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

      <div className="grid gap-6 md:grid-cols-2">
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

      {/* The audience report and research trigger land in the next bricks. */}
      <div className="mt-8 rounded-xl border border-dashed border-foreground/15 p-8 text-center">
        <p className="text-foreground/50 text-sm">
          Audience Report — coming in the next brick.
        </p>
      </div>
    </main>
  );
}