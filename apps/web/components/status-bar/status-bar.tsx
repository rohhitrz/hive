import Link from "next/link";
import type { RunInfo } from "@/components/run/run-info";
import type { StreamStatus } from "@/hooks/use-run-stream";
import { isTerminal } from "@/lib/run-state/labels";
import type { RunState } from "@/lib/run-state/reducer";
import { CancelButton } from "./cancel-button";
import { CostMeter } from "./cost-meter";
import { Elapsed } from "./elapsed";
import { PhaseIndicator } from "./phase-indicator";

export function StatusBar({ run, state, stream }: { run: RunInfo; state: RunState; stream: StreamStatus }) {
  const finished = isTerminal(state.phase);
  const endedAt = finished ? (run.finishedAt ?? state.lastEventAt ?? run.createdAt) : undefined;

  return (
    <header className="flex h-11 shrink-0 items-center gap-5 border-b border-border bg-card px-4 text-xs">
      <Link href="/" className="font-semibold text-primary" title="New run">
        ⬡
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-medium" title={run.goal}>
        {run.goal}
      </h1>
      <PhaseIndicator phase={state.phase} round={state.round} />
      <CostMeter spentUsd={state.spentUsd} budgetUsd={run.budgetUsd} />
      <span className="tabular-nums" title="Agents spawned">
        {state.agentsSpawned}
        <span className="text-muted-foreground"> / {run.maxAgents} agents</span>
      </span>
      <span className="tabular-nums" title="Billed web searches (Tavily credits)">
        {state.searches}
        <span className="text-muted-foreground"> searches</span>
      </span>
      <Elapsed startedAt={run.createdAt} endedAt={endedAt} />
      {stream === "reconnecting" && <span className="text-amber-300">reconnecting…</span>}
      {!finished && run.status === "running" && <CancelButton runId={run.id} />}
    </header>
  );
}
