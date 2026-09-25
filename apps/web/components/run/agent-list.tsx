import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import type { RunState } from "@/lib/run-state/reducer";

const TONE = { researching: "live", done: "ok", failed: "bad" } as const;

// Interim center panel until the agent graph (T8).
export function AgentList({ state }: { state: RunState }) {
  const agents = Object.values(state.agents);
  if (agents.length === 0) {
    return <p className="p-6 text-muted-foreground">{state.phase === "planning" ? "Lead agent is planning the research…" : "No agents yet."}</p>;
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-4">
      {agents.map((a) => (
        <li key={a.spec.id} className="space-y-1.5 rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium" title={a.spec.role}>
              {a.spec.role}
            </span>
            <Badge tone={TONE[a.status]}>{a.status}</Badge>
          </div>
          <p className="line-clamp-2 text-[11px] text-muted-foreground" title={a.spec.objective}>
            {a.spec.objective}
          </p>
          <div className="flex gap-3 text-[11px] tabular-nums text-muted-foreground">
            <span>R{a.round}</span>
            <span>{a.steps.length} steps</span>
            <span>{a.findingIds.length} findings</span>
            <span>{formatUsd(a.costUsd)}</span>
          </div>
          {a.error && <p className="truncate text-[11px] text-red-400" title={a.error}>{a.error}</p>}
        </li>
      ))}
    </ul>
  );
}
