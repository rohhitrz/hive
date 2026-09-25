import type { RunState } from "@/lib/run-state/reducer";

const STYLES = {
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
} as const;

/** Explains how a run ended when it didn't simply finish. */
export function RunBanner({ state }: { state: RunState }) {
  const findings = state.board.filter((e) => e.type === "finding").length;
  let tone: keyof typeof STYLES;
  let text: string;
  switch (state.phase) {
    case "failed":
      tone = "failed";
      text = `Run failed${state.error ? `: ${state.error}` : "."} Partial results are shown below.`;
      break;
    case "cancelled":
      tone = "warn";
      text = state.report
        ? `Cancelled. The report was written from the ${findings} findings collected before cancelling.`
        : "Cancelled before any findings were posted, so there is no report.";
      break;
    case "interrupted":
      tone = "warn";
      text = "Interrupted: the server stopped while this run was in progress. Showing everything recorded up to that point.";
      break;
    default:
      return null;
  }
  return (
    <div role="status" className={`shrink-0 border-b px-4 py-1.5 text-xs ${STYLES[tone]}`}>
      {text}
    </div>
  );
}
