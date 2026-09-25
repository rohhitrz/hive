import { runHive } from "./orchestrator.js";

const goal = process.argv.slice(2).join(" ");
if (!goal) {
  console.error('Usage: pnpm --filter @hive/core hive "your research goal"');
  process.exit(1);
}

const controller = new AbortController();
process.once("SIGINT", () => {
  console.log("\n… cancelling (Ctrl+C again to force quit)");
  controller.abort();
});

const result = await runHive(goal, {
  budgetUsd: 1,
  maxAgents: 8,
  maxRounds: 2,
  signal: controller.signal,
  onEvent: (e) => {
    if (e.type === "phase") console.log(`\n== ${e.phase}${e.round ? ` (round ${e.round})` : ""}`);
    if (e.type === "agent_spawned") console.log(`+ ${e.agent.id}: ${e.agent.objective}`);
    if (e.type === "agent_done") console.log(`${e.ok ? "✓" : "✗"} ${e.agentId}${e.error ? ` (${e.error})` : ""}`);
    if (e.type === "board" && e.entry.type === "dispute") console.log(`! dispute ${e.entry.findingId}`);
  },
});

if (result.report) console.log(`\n${result.report.markdown}`);
if (result.error) console.error(`\nerror: ${result.error}`);
console.log(`\n— ${result.status}, ${result.agents} agents, $${result.spentUsd.toFixed(4)}`);
