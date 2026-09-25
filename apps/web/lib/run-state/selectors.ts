import type { Finding } from "@hive/core";
import type { RunState } from "./reducer";

export type AgentFinding = { id: string; finding: Finding; dispute?: string };

/** Findings posted by one agent, in board order, with the critic's dispute reason if any. */
export function agentFindings(state: RunState, agentId: string): AgentFinding[] {
  const out: AgentFinding[] = [];
  for (const e of state.board) {
    if (e.type === "finding" && e.from === agentId) out.push({ id: e.id, finding: e.finding, dispute: state.disputes[e.id] });
  }
  return out;
}

/** Tool results that are errors, as produced by core ("error: …"). */
export function isToolError(result: string): boolean {
  return result.startsWith("error:") || result.startsWith('"error:');
}
