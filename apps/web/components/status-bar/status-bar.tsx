import Link from "next/link";
import type { RunInfo } from "@/components/run/run-info";
import type { RunState } from "@/lib/run-state/reducer";
import { CostMeter } from "./cost-meter";
import { Elapsed } from "./elapsed";
import { PhaseIndicator } from "./phase-indicator";

type Props = {
  run: RunInfo;
  state: RunState;
  /** Elapsed clock: ticks while endedAt is undefined. */
  clock: { startedAt: string; endedAt?: string };
  /** Mode-specific controls (cancel for live runs, speed for replays). */
  children?: React.ReactNode;
};

export function StatusBar({ run, state, clock, children }: Props) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-5 border-b border-border bg-card px-4 text-xs">
      <Link href="/" className="font-semibold text-primary" title="New run">
        ⬡
      </Link>
      <Link href="/runs" className="text-muted-foreground hover:text-foreground" title="Run history">
        runs
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
      {state.searches !== undefined && (
        <span className="tabular-nums" title="Billed web searches (Tavily credits)">
          {state.searches}
          <span className="text-muted-foreground"> searches</span>
        </span>
      )}
      <Elapsed startedAt={clock.startedAt} endedAt={clock.endedAt} />
      {children}
    </header>
  );
}
