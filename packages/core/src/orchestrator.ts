import { Blackboard } from "./blackboard.js";
import { Budget } from "./budget.js";
import { MODELS } from "./config.js";
import { plan } from "./planner.js";
import { createAgent } from "./factory.js";
import { AgentError, runSubAgent } from "./agent.js";
import { critique } from "./critic.js";
import { synthesize } from "./synthesizer.js";
import { defaultToolImpls } from "./tools.js";
import { errorMessage, type Models, type RunContext, type ToolImpls } from "./context.js";
import type { Citation, HiveEvent, RunStatus, SubQuestion } from "./types.js";

export type HiveOptions = {
  budgetUsd: number;
  maxAgents: number;
  maxRounds: number;
  onEvent?: (e: HiveEvent) => void;
  /** Aborting skips remaining work, still writes a report from existing findings, and ends "cancelled". */
  signal?: AbortSignal;
  /** Overrides for tests. */
  models?: Models;
  tools?: ToolImpls;
};

export type HiveResult = {
  status: RunStatus;
  report?: { markdown: string; citations: Citation[] };
  error?: string;
  spentUsd: number;
  agents: number;
};

export async function runHive(goal: string, opts: HiveOptions): Promise<HiveResult> {
  const onEvent = opts.onEvent ?? (() => {});
  // A listener bug must never break the run.
  const emit = (e: HiveEvent) => {
    try {
      onEvent(e);
    } catch {
      // ignore
    }
  };
  const board = new Blackboard();
  const budget = new Budget(opts.budgetUsd, opts.maxAgents);
  const signal = opts.signal ?? new AbortController().signal;
  const ctx: RunContext = {
    goal,
    board,
    budget,
    models: opts.models ?? MODELS,
    tools: opts.tools ?? defaultToolImpls,
    signal,
    emit,
  };
  board.on((entry) => emit({ type: "board", entry }));

  const finish = (status: RunStatus, report?: HiveResult["report"], error?: string): HiveResult => {
    emit({ type: "run_end", status, ...(error ? { error } : {}) });
    return { status, report, error, spentUsd: budget.spentUsd, agents: budget.agentsSpawned };
  };

  let status: RunStatus = "done";
  try {
    await research(ctx, opts.maxRounds);
  } catch (err) {
    if (!signal.aborted) return finish("failed", undefined, errorMessage(err));
  }
  if (signal.aborted) status = "cancelled";

  // A cancelled run with nothing on the board has nothing to report.
  if (status === "cancelled" && board.list("finding").length === 0) return finish(status);

  try {
    emit({ type: "phase", phase: "synthesizing", round: 0 });
    const report = await synthesize(ctx);
    emit({ type: "report", ...report });
    return finish(status, report);
  } catch (err) {
    return finish(status === "cancelled" ? status : "failed", undefined, errorMessage(err));
  }
}

/** Plan → (spawn → run → critique) × rounds. Returns early when the signal aborts. */
async function research(ctx: RunContext, maxRounds: number) {
  const { budget, signal, emit } = ctx;

  emit({ type: "phase", phase: "planning", round: 0 });
  let questions: SubQuestion[] = await plan(ctx);
  emit({ type: "plan", questions });

  for (let round = 1; round <= maxRounds && questions.length > 0; round++) {
    if (signal.aborted || budget.exhausted) return;

    emit({ type: "phase", phase: "researching", round });
    const granted = budget.reserveAgents(questions.length);

    // Parallel fan-out. One failed agent must not kill the run: keep partial results.
    await Promise.allSettled(
      questions.slice(0, granted).map(async (q) => {
        const spec = await createAgent(`${q.role}: ${q.question}`, ctx);
        emit({ type: "agent_spawned", agent: spec, round });
        try {
          const { summary, costUsd } = await runSubAgent(spec, ctx);
          emit({ type: "agent_done", agentId: spec.id, ok: true, summary, costUsd });
        } catch (err) {
          const costUsd = err instanceof AgentError ? err.costUsd : 0;
          emit({ type: "agent_done", agentId: spec.id, ok: false, error: errorMessage(err), costUsd });
        }
      }),
    );

    if (signal.aborted) return;
    emit({ type: "phase", phase: "critiquing", round });
    const review = await critique(ctx);
    emit({ type: "review", round, review });
    questions = review.gaps.map((gap) => ({ question: gap, role: "gap researcher" }));
  }
}
