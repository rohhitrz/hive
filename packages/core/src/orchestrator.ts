import { Blackboard } from "./blackboard.js";
import { Budget } from "./budget.js";
import { plan } from "./planner.js";
import { createAgent } from "./factory.js";
import { runSubAgent } from "./agent.js";
import { critique } from "./critic.js";
import { synthesize } from "./synthesizer.js";
import type { HiveEvent, SubQuestion } from "./types.js";

export type HiveOptions = {
  budgetUsd: number;
  maxAgents: number;
  maxRounds: number;
  onEvent?: (e: HiveEvent) => void;
};

export async function runHive(goal: string, opts: HiveOptions) {
  const emit = opts.onEvent ?? (() => {});
  const board = new Blackboard();
  const budget = new Budget(opts.budgetUsd, opts.maxAgents);
  board.on((entry) => emit({ type: "board", entry }));

  let questions: SubQuestion[] = await plan(goal, budget);
  emit({ type: "plan", questions });

  for (let round = 0; round < opts.maxRounds && questions.length > 0; round++) {
    if (budget.exhausted) break;

    const granted = budget.reserveAgents(questions.length);
    const specs = await Promise.all(
      questions.slice(0, granted).map((q) => createAgent(`${q.role}: ${q.question}`, goal, budget)),
    );

    // Parallel fan-out. One failed agent must not kill the run: keep partial results.
    await Promise.allSettled(
      specs.map(async (spec) => {
        emit({ type: "agent_spawned", agent: spec });
        try {
          await runSubAgent(spec, { goal, board, budget });
          emit({ type: "agent_done", agentId: spec.id, ok: true });
        } catch {
          emit({ type: "agent_done", agentId: spec.id, ok: false });
        } finally {
          emit({ type: "budget", spentUsd: budget.spentUsd });
        }
      }),
    );

    const review = await critique(goal, board, budget);
    emit({ type: "review", review });
    questions = review.gaps.map((gap) => ({ question: gap, role: "gap researcher" }));
  }

  const report = await synthesize(goal, board, budget);
  return { report, spentUsd: budget.spentUsd, agents: budget.agentsSpawned };
}
