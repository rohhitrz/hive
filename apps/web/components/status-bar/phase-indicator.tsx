import { phaseLabel } from "@/lib/run-state/labels";
import type { RunPhase } from "@/lib/run-state/reducer";
import { cn } from "@/lib/utils";

const DOT: Record<RunPhase, string> = {
  planning: "bg-sky-400 animate-pulse",
  researching: "bg-sky-400 animate-pulse",
  critiquing: "bg-violet-400 animate-pulse",
  synthesizing: "bg-primary animate-pulse",
  done: "bg-emerald-400",
  failed: "bg-red-500",
  cancelled: "bg-amber-400",
  interrupted: "bg-amber-400",
};

export function PhaseIndicator({ phase, round }: { phase: RunPhase; round: number }) {
  return (
    <span className="flex items-center gap-2" aria-live="polite">
      <span className={cn("size-2 rounded-full", DOT[phase])} />
      {phaseLabel(phase, round)}
    </span>
  );
}
