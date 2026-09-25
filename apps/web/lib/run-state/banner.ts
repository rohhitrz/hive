import type { RunState } from "./reducer";

export type Banner = { tone: "failed" | "warn"; text: string };

/** Explains how a run ended when it didn't simply finish; undefined for running or done runs. */
export function bannerFor(state: RunState): Banner | undefined {
  const findings = state.board.filter((e) => e.type === "finding").length;
  const detail = state.error ? `: ${state.error}` : ".";
  switch (state.phase) {
    case "failed":
      return { tone: "failed", text: `Run failed${detail} Partial results are shown below.` };
    case "cancelled":
      if (state.report) return { tone: "warn", text: `Cancelled. The report was written from the ${findings} findings collected before cancelling.` };
      if (findings > 0) {
        // The engine still tries to write a report after a cancel; this is the case where that failed.
        return { tone: "warn", text: `Cancelled with ${findings} findings, but the report could not be written${detail}` };
      }
      return { tone: "warn", text: "Cancelled before any findings were posted, so there is no report." };
    case "interrupted":
      return { tone: "warn", text: "Interrupted: the server stopped while this run was in progress. Showing everything recorded up to that point." };
    default:
      return undefined;
  }
}
