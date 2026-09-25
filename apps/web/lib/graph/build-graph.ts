import type { RunState } from "../run-state/reducer";

export type NodeStatus = "idle" | "active" | "spawning" | "researching" | "done" | "failed" | "stopped";

export type GraphNode =
  | { id: string; kind: "lead"; label: string; status: NodeStatus }
  | { id: string; kind: "agent"; label: string; status: NodeStatus; round: number; findings: number; costUsd: number }
  | { id: string; kind: "critic"; label: string; status: NodeStatus; round: number; disputes: number }
  | { id: string; kind: "synth"; label: string; status: NodeStatus };

export type GraphEdge = { id: string; source: string; target: string; kind: "flow" | "dispute" };

export const LEAD_ID = "lead";
export const SYNTH_ID = "synth";
export const criticId = (round: number) => `critic-r${round}`;

/** Pure: RunState → nodes + edges, per ARCHITECTURE.md §6 graph rules. */
export function buildGraph(state: RunState): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const terminal = ["done", "failed", "cancelled", "interrupted"].includes(state.phase);

  nodes.push({
    id: LEAD_ID,
    kind: "lead",
    label: "Lead · planner",
    status: state.phase === "planning" ? "active" : "done",
  });

  const agents = Object.values(state.agents);
  const critics = new Set(state.criticRounds);

  for (const a of agents) {
    const status: NodeStatus =
      a.status === "researching"
        ? a.steps.length === 0
          ? "spawning"
          : "researching"
        : a.status === "failed" && a.error === "cancelled"
          ? "stopped"
          : a.status;
    // A cancelled or interrupted run leaves agents that will never finish: stopped, not failed.
    const shown: NodeStatus = terminal && (status === "researching" || status === "spawning") ? "stopped" : status;
    nodes.push({ id: a.spec.id, kind: "agent", label: a.spec.role, status: shown, round: a.round, findings: a.findingIds.length, costUsd: a.costUsd });
    const prevCritic = criticId(a.round - 1);
    const source = a.round > 1 && critics.has(a.round - 1) ? prevCritic : LEAD_ID;
    edges.push({ id: `${source}->${a.spec.id}`, source, target: a.spec.id, kind: "flow" });
  }

  const disputesByRound = new Map<number, number>();
  for (const round of Object.values(state.disputeRound)) disputesByRound.set(round, (disputesByRound.get(round) ?? 0) + 1);

  for (const round of state.criticRounds) {
    const id = criticId(round);
    const active = state.phase === "critiquing" && state.round === round;
    const reviewed = state.reviews[round] !== undefined;
    const criticStatus: NodeStatus = active ? "active" : reviewed ? "done" : state.phase === "failed" ? "failed" : "stopped";
    nodes.push({ id, kind: "critic", label: `Critic · round ${round}`, status: criticStatus, round, disputes: disputesByRound.get(round) ?? 0 });
    for (const a of agents) {
      if (a.round === round) edges.push({ id: `${a.spec.id}->${id}`, source: a.spec.id, target: id, kind: "flow" });
    }
  }

  if (state.synthStarted) {
    const lastCritic = state.criticRounds.at(-1);
    const source = lastCritic !== undefined ? criticId(lastCritic) : LEAD_ID;
    const status: NodeStatus = state.report ? "done" : state.phase === "synthesizing" ? "active" : state.phase === "failed" ? "failed" : "stopped";
    nodes.push({ id: SYNTH_ID, kind: "synth", label: "Synthesizer · report", status });
    edges.push({ id: `${source}->${SYNTH_ID}`, source, target: SYNTH_ID, kind: "flow" });
  }

  // Dispute edges: critic of that round → agent that posted the disputed finding.
  const poster = new Map<string, string>();
  for (const e of state.board) if (e.type === "finding") poster.set(e.id, e.from);
  const seen = new Set<string>();
  for (const [findingId, round] of Object.entries(state.disputeRound)) {
    const agentId = poster.get(findingId);
    const source = criticId(round);
    const id = `dispute:${source}->${agentId}`;
    if (!agentId || !state.agents[agentId] || !critics.has(round) || seen.has(id)) continue;
    seen.add(id);
    edges.push({ id, source, target: agentId, kind: "dispute" });
  }

  return { nodes, edges };
}

/** Changes only when nodes are added or removed: the layout cache key. */
export function topologyKey(nodes: GraphNode[]): string {
  return nodes.map((n) => n.id).join("|");
}
