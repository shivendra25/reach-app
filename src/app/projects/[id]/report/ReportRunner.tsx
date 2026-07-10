"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startResearchAction } from "@/app/projects/[id]/report/actions";

interface RunStatus {
  run: { id: string; status: string; error: string | null } | null;
  reportReady: boolean;
}

/**
 * Client component that triggers research then polls for completion.
 * When the report is ready, it refreshes the route so the server renders
 * the full report (Brick 8).
 */
export default function ReportRunner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("starting");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/research/${projectId}/status`);
        if (!res.ok || cancelled) return;
        const data: RunStatus = await res.json();

        if (data.run) {
          setStatus(data.run.status);
          if (data.run.status === "failed" && data.run.error) {
            setError(data.run.error);
            return;
          }
        }

        if (data.reportReady) {
          router.refresh();
          return;
        }

        setTimeout(poll, 1500);
      } catch {
        setTimeout(poll, 3000);
      }
    }

    pollRef.current = poll;

    async function start() {
      const result = await startResearchAction(projectId);
      if (cancelled) return;
      if (result && !result.ok) {
        setStatus("failed");
        setError(result.error);
        return;
      }
      if (pollRef.current) pollRef.current();
    }

    start();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {status === "starting" && (
        <>
          <div className="h-10 w-10 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin mb-4" />
          <h2 className="text-lg font-medium">Starting research…</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Finding where your audience hangs out.
          </p>
        </>
      )}
      {status === "queued" && (
        <>
          <div className="h-10 w-10 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin mb-4" />
          <h2 className="text-lg font-medium">Queued…</h2>
        </>
      )}
      {status === "running" && (
        <>
          <div className="h-10 w-10 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin mb-4" />
          <h2 className="text-lg font-medium">Researching your audience…</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Searching communities, collecting evidence, building your report.
          </p>
        </>
      )}
      {status === "completed" && (
        <>
          <div className="h-10 w-10 rounded-full bg-green-500 mb-4" />
          <h2 className="text-lg font-medium">Report ready!</h2>
          <p className="text-sm text-foreground/50 mt-1">Loading…</p>
        </>
      )}
      {status === "failed" && (
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-medium text-red-600">Research failed</h2>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}