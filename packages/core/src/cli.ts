import { runHive } from "./orchestrator.js";

const goal = process.argv.slice(2).join(" ");
if (!goal) {
  console.error('Usage: pnpm --filter @hive/core hive "your research goal"');
  process.exit(1);
}

const result = await runHive(goal, {
  budgetUsd: 1,
  maxAgents: 8,
  maxRounds: 2,
  onEvent: (e) => {
    if (e.type === "agent_spawned") console.log(`+ ${e.agent.id}: ${e.agent.objective}`);
    if (e.type === "agent_done") console.log(`${e.ok ? "✓" : "✗"} ${e.agentId}`);
    if (e.type === "board" && e.entry.type === "dispute") console.log(`! dispute ${e.entry.findingId}`);
  },
});

console.log(`\n${result.report}\n\n— ${result.agents} agents, $${result.spentUsd.toFixed(3)}`);
