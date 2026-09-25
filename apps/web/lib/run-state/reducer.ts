import type { AgentSpec, BoardEntry, Citation, HiveEvent, Phase, Review, ToolCallSummary } from "@hive/core";
import type { RunEvent } from "../runner";

export type AgentStep = { step: number; toolCalls: ToolCallSummary[]; text?: string; costUsd: number; at: string };

export type AgentStatus = "researching" | "done" | "failed";

export type AgentState = {
  spec: AgentSpec;
  round: number;
  status: AgentStatus;
  steps: AgentStep[];
  findingIds: string[];
  costUsd: number;
  summary?: string;
  error?: string;
};

export type RunPhase = Phase | "done" | "failed" | "cancelled" | "interrupted";

export type RunState = {
  phase: RunPhase;
  round: number;
  spentUsd: number;
  agentsSpawned: number;
  /** Insertion order = spawn order. */
  agents: Record<string, AgentState>;
  board: BoardEntry[];
  disputes: Record<string, string>;
  reviews: Record<number, Review>;
  report?: { markdown: string; citations: Citation[] };
  error?: string;
  startedAt?: string;
  lastEventAt?: string;
  lastSeq: number;
};

export const initialRunState: RunState = {
  phase: "planning",
  round: 0,
  spentUsd: 0,
  agentsSpawned: 0,
  agents: {},
  board: [],
  disputes: {},
  reviews: {},
  lastSeq: 0,
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function updateAgent(state: RunState, id: unknown, fn: (a: AgentState) => AgentState): RunState {
  if (typeof id !== "string") return state;
  const agent = state.agents[id];
  return agent ? { ...state, agents: { ...state.agents, [id]: fn(agent) } } : state;
}

/** Applies one HiveEvent. Unknown or malformed events leave the state unchanged. */
function apply(state: RunState, event: HiveEvent, at: string): RunState {
  switch (event.type) {
    case "phase":
      return { ...state, phase: event.phase, round: event.round > 0 ? event.round : state.round };

    case "plan":
      return state;

    case "agent_spawned": {
      const spec = event.agent;
      if (!isObject(spec) || typeof spec.id !== "string") return state;
      const agent: AgentState = { spec, round: num(event.round, 1), status: "researching", steps: [], findingIds: [], costUsd: 0 };
      return { ...state, agents: { ...state.agents, [spec.id]: agent } };
    }

    case "agent_step":
      return updateAgent(state, event.agentId, (a) => ({
        ...a,
        steps: [
          ...a.steps,
          {
            step: num(event.step, a.steps.length + 1),
            toolCalls: Array.isArray(event.toolCalls) ? event.toolCalls : [],
            text: str(event.text),
            costUsd: num(event.costUsd),
            at,
          },
        ],
        costUsd: a.costUsd + num(event.costUsd),
      }));

    case "agent_done":
      return updateAgent(state, event.agentId, (a) => ({
        ...a,
        status: event.ok ? "done" : "failed",
        costUsd: num(event.costUsd, a.costUsd),
        summary: str(event.summary),
        error: str(event.error),
      }));

    case "board": {
      const entry = event.entry;
      if (!isObject(entry) || typeof entry.id !== "string") return state;
      let next: RunState = { ...state, board: [...state.board, entry] };
      if (entry.type === "finding") {
        next = updateAgent(next, entry.from, (a) => ({ ...a, findingIds: [...a.findingIds, entry.id] }));
      } else if (entry.type === "dispute" && typeof entry.findingId === "string") {
        next = { ...next, disputes: { ...next.disputes, [entry.findingId]: str(entry.reason) ?? "" } };
      }
      return next;
    }

    case "review":
      if (!isObject(event.review)) return state;
      return { ...state, reviews: { ...state.reviews, [num(event.round, state.round)]: event.review } };

    case "budget":
      return { ...state, spentUsd: num(event.spentUsd, state.spentUsd), agentsSpawned: num(event.agentsSpawned, state.agentsSpawned) };

    case "report":
      if (typeof event.markdown !== "string") return state;
      return { ...state, report: { markdown: event.markdown, citations: Array.isArray(event.citations) ? event.citations : [] } };

    case "run_end":
      return { ...state, phase: event.status, error: str(event.error) };

    default:
      return state;
  }
}

/** Pure: never throws, ignores unknown types, and skips seqs it has already applied. */
export function reduceRun(state: RunState, envelope: RunEvent): RunState {
  try {
    if (!isObject(envelope) || typeof envelope.seq !== "number" || envelope.seq <= state.lastSeq) return state;
    const at = str(envelope.at) ?? state.lastEventAt ?? new Date(0).toISOString();
    const base: RunState = { ...state, lastSeq: envelope.seq, lastEventAt: at, startedAt: state.startedAt ?? at };
    if (!isObject(envelope.event) || typeof envelope.event.type !== "string") return base;
    return apply(base, envelope.event, at);
  } catch {
    return typeof envelope?.seq === "number" && envelope.seq > state.lastSeq ? { ...state, lastSeq: envelope.seq } : state;
  }
}

export type RunAction = { type: "events"; events: RunEvent[] } | { type: "reset" };

/** useReducer adapter: batches keep instant replay to a single render. */
export function runStateReducer(state: RunState, action: RunAction): RunState {
  if (action.type === "reset") return initialRunState;
  return action.events.reduce(reduceRun, state);
}

export function reduceAll(events: RunEvent[]): RunState {
  return events.reduce(reduceRun, initialRunState);
}
