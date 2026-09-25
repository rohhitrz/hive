import Link from "next/link";
import { RunStatusBadge } from "@/components/run-status-badge";
import type { Run } from "@/lib/db/schema";
import { formatDate, formatUsd } from "@/lib/format";

export function RecentRuns({ runs }: { runs: Run[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent runs</h2>
        <Link href="/runs" className="text-[11px] text-muted-foreground hover:text-foreground">
          All runs →
        </Link>
      </div>
      {runs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No runs yet. Start one above.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/runs/${r.id}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-3 py-2 hover:bg-muted/50">
                <span className="truncate" title={r.goal}>
                  {r.goal}
                </span>
                <RunStatusBadge status={r.status} />
                <span className="w-16 text-right tabular-nums text-muted-foreground">{formatUsd(r.spentUsd)}</span>
                <span className="whitespace-nowrap text-right tabular-nums text-muted-foreground">{formatDate(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
