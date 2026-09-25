import { MockLanguageModelV2 } from "ai/test";
import { describe, expect, it } from "vitest";
import { gatheredSources } from "../src/agent.js";
import { runHive, type HiveEvent, type HiveOptions } from "../src/index.js";
import { Blackboard } from "../src/blackboard.js";
import { createSearchGate } from "../src/context.js";
import { buildTools } from "../src/tools.js";
import { countingTools, mockModels, type Scenario } from "./mock-models.js";

async function run(s: Scenario, opts: Partial<HiveOptions> = {}) {
  const { tools, queries } = countingTools();
  const events: HiveEvent[] = [];
  const result = await runHive("Should I launch a matcha brand in Germany?", {
    budgetUsd: 5,
    maxAgents: 10,
    maxRounds: 1,
    models: mockModels(s),
    tools,
    onEvent: (e) => events.push(e),
    ...opts,
  });
  const toolResults = events.flatMap((e) => (e.type === "agent_step" ? e.toolCalls.filter((c) => c.name === "web_search") : []));
  return { result, events, queries, toolResults };
}

describe("search budget", () => {
  it("caps a burst of parallel searches at the per-agent limit", async () => {
    const { queries, result, toolResults } = await run({ roles: ["market analyst"], searchBurst: 12 }, { maxSearchesPerAgent: 4 });
    expect(queries).toHaveLength(4);
    expect(result.searches).toBe(4);
    expect(toolResults.filter((r) => r.result.includes("Search budget used up"))).toHaveLength(8);
    expect(result.status).toBe("done");
  });

  it("shares identical queries across agents within a run", async () => {
    const { queries, result } = await run(
      { roles: ["market analyst", "regulatory expert", "supply chain analyst"], sharedQueries: ["Matcha market Germany", "matcha  market germany"] },
      { maxSearchesPerAgent: 4 },
    );
    expect(queries).toHaveLength(1);
    expect(result.searches).toBe(1);
  });

  it("stops real searches at the run-wide limit", async () => {
    const { tools, queries } = countingTools();
    const gate = createSearchGate(4, 3);
    const board = new Blackboard();
    const opts = { toolCallId: "t", messages: [] };
    const results: unknown[] = [];
    for (const agent of ["a", "b"]) {
      const t = buildTools(agent, board, tools, gate);
      for (let i = 0; i < 3; i++) results.push(await t.web_search.execute!({ query: `${agent}${i}` }, opts));
    }
    expect(queries).toEqual(["a0", "a1", "a2"]);
    expect(gate.used).toBe(3);
    expect(results.slice(3).every((r) => typeof r === "string" && r.includes("team's search budget"))).toBe(true);
  });

  it("reports the search count on budget events", async () => {
    const { events, result } = await run({ roles: ["market analyst", "regulatory expert"] });
    const last = events.filter((e) => e.type === "budget").at(-1);
    expect(last?.type === "budget" && last.searches).toBe(result.searches);
    expect(result.searches).toBe(1); // both agents search "market size": one shared call
  });
});

describe("gather → post cadence", () => {
  it("forces a post_finding-only step right after search results arrive", async () => {
    const models = mockModels({ roles: ["market analyst"] });
    await runHive("Should I launch a matcha brand in Germany?", {
      budgetUsd: 5,
      maxAgents: 1,
      maxRounds: 1,
      models,
      tools: countingTools().tools,
    });
    const calls = (models.worker as MockLanguageModelV2).doGenerateCalls;
    // Step 1 searched; step 2 may only post findings, and must.
    expect(calls[0]!.tools?.map((t) => t.name).sort()).toEqual(["post_finding", "read_board", "read_page", "web_search"]);
    expect(calls[1]!.tools?.map((t) => t.name)).toEqual(["post_finding"]);
    expect(calls[1]!.toolChoice).toEqual({ type: "required" });
    // After posting, all tools are back.
    expect(calls[2]!.tools?.length).toBe(4);
  });

  it("detects usable sources", () => {
    expect(gatheredSources([{ toolName: "web_search", output: [{ url: "x" }] }])).toBe(true);
    expect(gatheredSources([{ toolName: "web_search", output: "Search budget used up" }])).toBe(false);
    expect(gatheredSources([{ toolName: "read_page", output: "<untrusted_page …" }])).toBe(true);
    expect(gatheredSources([{ toolName: "post_finding", output: "m1" }])).toBe(false);
  });
});
