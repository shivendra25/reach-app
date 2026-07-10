import type {
  Report,
  Community,
  EvidenceItem,
} from "@/types/db";

/**
 * Full Audience Report renderer.
 * Used on the report page and (later) exported / shared.
 *
 * Design rule: nothing renders without evidence. Every claim section
 * links to its backing evidence URLs.
 */
export function AudienceReport({
  report,
  communities,
  evidence,
}: {
  report: Report;
  communities: Community[];
  evidence: EvidenceItem[];
}) {
  // Index evidence by URL for quick lookup when linking.
  const evidenceByUrl = new Map(evidence.map((e) => [e.url, e]));

  return (
    <div className="flex flex-col gap-6">
      {/* Verdict */}
      <section className="rounded-xl border border-foreground/10 p-6">
        <div className="flex items-center gap-3 mb-3">
          <VerdictDot verdict={report.verdict} />
          <h2 className="text-lg font-semibold">
            {verdictLabel(report.verdict)}
          </h2>
        </div>
        <p className="text-sm text-foreground/70">{report.verdict_reason}</p>
      </section>

      {/* ICP */}
      <section className="rounded-xl border border-foreground/10 p-6">
        <h3 className="text-sm font-medium text-foreground/50 mb-2">
          Ideal Customer Profile
        </h3>
        <p className="text-sm">{report.icp_summary}</p>
      </section>

      {/* Content sections (from the structured report content) */}
      {report.content?.sections?.map((section) => (
        <section key={section.key} className="rounded-xl border border-foreground/10 p-6">
          <h3 className="text-sm font-medium text-foreground/50 mb-2">
            {section.title}
          </h3>
          <p className="text-sm mb-3">{section.body}</p>
          {section.evidence_urls.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {section.evidence_urls.map((url) => {
                const ev = evidenceByUrl.get(url);
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-foreground/50 underline hover:text-foreground/80"
                  >
                    ↳ {ev?.title ?? url}
                  </a>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {/* Communities — ranked */}
      {communities.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-6">
          <h3 className="text-sm font-medium text-foreground/50 mb-4">
            Where They Hang Out ({communities.length})
          </h3>
          <ol className="flex flex-col gap-4">
            {communities.map((c, i) => (
              <li key={c.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground/40">
                    #{i + 1}
                  </span>
                  <PlatformBadge platform={c.platform} />
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener"
                    className="font-medium underline"
                  >
                    {c.name} ↗
                  </a>
                  {c.estimated_size && (
                    <span className="text-xs text-foreground/50">
                      ~{c.estimated_size.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/60 ml-6">
                  {c.relevance_reason}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Pocket Dictionary */}
      {report.pocket_dictionary.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-6">
          <h3 className="text-sm font-medium text-foreground/50 mb-1">
            Messaging Pocket Dictionary
          </h3>
          <p className="text-xs text-foreground/40 mb-4">
            Their words, not yours. Use these to sound native.
          </p>
          <dl className="flex flex-col gap-3">
            {report.pocket_dictionary.map((entry, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <dt className="font-medium text-sm">&ldquo;{entry.term}&rdquo;</dt>
                <dd className="text-sm text-foreground/60">{entry.meaning}</dd>
                {entry.evidence_url && (
                  <a
                    href={entry.evidence_url}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-foreground/40 underline"
                  >
                    ↳ source
                  </a>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Pricing */}
      {report.pricing_recommendation && (
        <section className="rounded-xl border border-foreground/10 p-6">
          <h3 className="text-sm font-medium text-foreground/50 mb-2">
            Pricing Recommendation
          </h3>
          <p className="text-sm">{report.pricing_recommendation}</p>
        </section>
      )}

      {/* All Evidence */}
      {evidence.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-6">
          <h3 className="text-sm font-medium text-foreground/50 mb-4">
            Evidence ({evidence.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {evidence.map((e) => (
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
                  <p className="text-xs text-foreground/50 italic">
                    &ldquo;{e.snippet}&rdquo;
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {e.source && (
                    <span className="text-xs text-foreground/40">{e.source}</span>
                  )}
                  <span className="text-xs text-foreground/30">·</span>
                  <span className="text-xs text-foreground/40">
                    supports: {e.supports}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VerdictDot({ verdict }: { verdict: string }) {
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

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    reddit: "bg-orange-100 text-orange-800",
    hackernews: "bg-orange-100 text-orange-900",
    discord: "bg-indigo-100 text-indigo-800",
    newsletter: "bg-blue-100 text-blue-800",
    twitter: "bg-sky-100 text-sky-800",
    devto: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${styles[platform] ?? styles.other}`}>
      {platform}
    </span>
  );
}