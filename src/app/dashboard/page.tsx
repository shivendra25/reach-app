import Link from "next/link";
import { getUser } from "@/lib/auth/server";
import { listProjects } from "@/lib/projects/repo";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to see your projects</h1>
        <Link
          href="/login"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const projects = await listProjects(user.id);

  return (
    <main className="flex flex-1 flex-col px-6 py-16 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <Link
          href="/new"
          className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-90 transition"
        >
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-foreground/60 mb-4">
            You haven&apos;t analyzed any apps yet.
          </p>
          <Link
            href="/new"
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium"
          >
            Analyze my first app
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={p.status === "researched" ? `/projects/${p.id}/report` : `/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-foreground/10 px-5 py-4 hover:border-foreground/25 transition"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-foreground/50">{p.problem}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FitBadge fit={p.niche_fit} />
                  <StatusBadge status={p.status} />
                  {p.status === "researched" && (
                    <span className="text-xs text-foreground/40">View report →</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function FitBadge({ fit }: { fit: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    fit: "bg-green-100 text-green-800",
    not_fit: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[fit] ?? styles.pending}`}>
      {fit}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    created: "bg-gray-100 text-gray-700",
    researching: "bg-blue-100 text-blue-800",
    researched: "bg-purple-100 text-purple-800",
    distributing: "bg-indigo-100 text-indigo-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.created}`}>
      {status}
    </span>
  );
}