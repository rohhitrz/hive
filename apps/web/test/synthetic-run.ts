import type { HiveEvent } from "@hive/core";
import type { RunEvent } from "@/lib/runner";

/**
 * Builds a plausible multi-round event log: `agentsPerRound[i]` agents in round i+1, each posting
 * findings; the round-1 critic disputes one finding per agent. Padded with steps to reach `minEvents`.
 */
export function syntheticRun(agentsPerRound: number[], minEvents = 0): RunEvent[] {
  const events: HiveEvent[] = [];
  let finding = 0;
  let spent = 0;
  let spawned = 0;
  events.push({ type: "phase", phase: "planning", round: 0 });
  events.push({ type: "plan", questions: [] });

  agentsPerRound.forEach((count, i) => {
    const round = i + 1;
    events.push({ type: "phase", phase: "researching", round });
    const ids = Array.from({ length: count }, (_, j) => `agent-r${round}-${j}`);
    for (const id of ids) {
      spawned += 1;
      events.push({ type: "agent_spawned", round, agent: { id, role: `Role ${round}.${id.split("-").at(-1)}`, objective: "Find things", systemPrompt: "You research.", maxSteps: 6 } });
    }
    for (const id of ids) {
      for (let step = 1; step <= 3; step++) {
        spent += 0.001;
        events.push({ type: "agent_step", agentId: id, step, toolCalls: [{ name: "web_search", input: "{}", result: "[]" }], costUsd: 0.001 });
        events.push({ type: "budget", spentUsd: spent, agentsSpawned: spawned, searches: 0 });
      }
      finding += 1;
      events.push({ type: "board", entry: { type: "finding", id: `m${finding}`, from: id, at: 0, finding: { claim: `Claim ${finding}`, sourceUrl: "https://example.com", evidence: "e", confidence: "high" } } });
    }
    for (const id of ids) events.push({ type: "agent_done", agentId: id, ok: !id.endsWith("-1"), summary: "done", costUsd: 0.003 });
    events.push({ type: "phase", phase: "critiquing", round });
    if (round === 1) {
      events.push({ type: "board", entry: { type: "dispute", id: `d${round}`, from: "critic", at: 0, findingId: "m1", reason: "unsupported" } });
    }
    events.push({ type: "review", round, review: { verdicts: [], gaps: [] } });
  });

  while (events.length < minEvents - 3) {
    const id = `agent-r1-0`;
    events.push({ type: "agent_step", agentId: id, step: 99, toolCalls: [], costUsd: 0 });
  }
  events.push({ type: "phase", phase: "synthesizing", round: 0 });
  events.push({ type: "report", markdown: "# Report [1]", citations: [{ n: 1, findingId: "m2", claim: "Claim 2", url: "https://example.com" }] });
  events.push({ type: "run_end", status: "done" });

  const t0 = Date.parse("2026-09-25T10:00:00.000Z");
  return events.map((event, i) => ({ runId: "synthetic", seq: i + 1, at: new Date(t0 + i * 250).toISOString(), event }));
}
