import type { RunPhase } from "./reducer";

const PHASE_LABELS: Record<RunPhase, string> = {
  planning: "Planning",
  researching: "Researching",
  critiquing: "Critiquing",
  synthesizing: "Synthesizing",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  interrupted: "Interrupted",
};

export function phaseLabel(phase: RunPhase, round: number): string {
  const label = PHASE_LABELS[phase] ?? phase;
  return (phase === "researching" || phase === "critiquing") && round > 0 ? `${label} (round ${round})` : label;
}

export const TERMINAL_PHASES: ReadonlySet<RunPhase> = new Set(["done", "failed", "cancelled", "interrupted"]);

export function isTerminal(phase: RunPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

/** "https://www.example.com/a/b" → "example.com" */
export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** PRD §5.2: the cost meter turns amber above 80% of budget. */
export function costTone(spentUsd: number, budgetUsd: number): "ok" | "warn" | "over" {
  if (budgetUsd <= 0) return "ok";
  const ratio = spentUsd / budgetUsd;
  return ratio >= 1 ? "over" : ratio > 0.8 ? "warn" : "ok";
}
