import { describe, expect, it } from "vitest";
import { runHive, type HiveEvent } from "../src/index.js";
import { resolveCitations } from "../src/synthesizer.js";
import { mockModels, mockTools, type Scenario } from "./mock-models.js";

async function run(s: Scenario, opts: { maxRounds?: number; signal?: AbortSignal; onEvent?: (e: HiveEvent) => void } = {}) {
  const events: HiveEvent[] = [];
  const result = await runHive("Should I launch a matcha brand in Germany?", {
    budgetUsd: 5,
    maxAgents: 10,
    maxRounds: opts.maxRounds ?? 2,
    models: mockModels(s),
    tools: mockTools,
    signal: opts.signal,
    onEvent: (e) => {
      events.push(e);
      opts.onEvent?.(e);
    },
  });
  return { events, result };
}

const phases = (events: HiveEvent[]) =>
  events.flatMap((e) => (e.type === "phase" ? [`${e.phase}:${e.round}`] : []));

describe("runHive events", () => {
  it("emits events in protocol order across rounds", async () => {
    const { events, result } = await run({ roles: ["market analyst", "regulatory expert"], gaps: ["pricing?"] });
    const types = events.map((e) => e.type);

    expect(phases(events)).toEqual([
      "planning:0",
      "researching:1",
      "critiquing:1",
      "researching:2",
      "critiquing:2",
      "synthesizing:0",
    ]);
    expect(types.indexOf("plan")).toBeLessThan(types.indexOf("agent_spawned"));
    expect(types.indexOf("agent_spawned")).toBeLessThan(types.indexOf("agent_step"));
    expect(types.indexOf("agent_step")).toBeLessThan(types.indexOf("agent_done"));
    expect(types.indexOf("agent_done")).toBeLessThan(types.indexOf("review"));
    expect(types.at(-2)).toBe("report");
    expect(events.at(-1)).toEqual({ type: "run_end", status: "done" });
    expect(result.status).toBe("done");

    const spawned = events.filter((e) => e.type === "agent_spawned");
    expect(spawned.map((e) => e.round)).toEqual([1, 1, 2]);
    expect(events.filter((e) => e.type === "review").map((e) => e.round)).toEqual([1, 2]);

    for (const e of events) {
      if (e.type === "agent_done") {
        expect(e.ok).toBe(true);
        expect(e.summary).toContain("Summary");
        expect(e.costUsd).toBeGreaterThan(0);
      }
    }
  });

  it("charges the budget per step: a budget event follows each agent_step", async () => {
    const { events } = await run({ roles: ["market analyst", "supply chain analyst"] }, { maxRounds: 1 });
    const steps = events.map((e, i) => [e, i] as const).filter(([e]) => e.type === "agent_step");
    expect(steps.length).toBe(6); // 2 agents × 3 steps

    let lastSpent = 0;
    for (const [step, i] of steps) {
      const next = events[i + 1];
      expect(next?.type).toBe("budget");
      if (next?.type === "budget" && step.type === "agent_step") {
        expect(step.costUsd).toBeGreaterThan(0);
        expect(next.spentUsd).toBeGreaterThan(lastSpent);
        lastSpent = next.spentUsd;
      }
    }
    const withTools = steps.find(([e]) => e.type === "agent_step" && e.toolCalls.length > 0)?.[0];
    expect(withTools?.type === "agent_step" && withTools.toolCalls[0]?.name).toBe("web_search");
  });

  it("marks an agent whose tool throws as failed and still finishes the run", async () => {
    const { events, result } = await run({ roles: ["market analyst", "broken scraper"] }, { maxRounds: 1 });
    const done = events.filter((e) => e.type === "agent_done");
    const broken = done.find((e) => e.agentId.startsWith("broken"));
    const ok = done.find((e) => e.agentId.startsWith("market"));

    expect(broken).toMatchObject({ ok: false });
    expect(broken?.type === "agent_done" && broken.error).toContain("search exploded");
    expect(ok).toMatchObject({ ok: true });
    expect(result.status).toBe("done");
    expect(events.at(-1)).toEqual({ type: "run_end", status: "done" });
  });

  it("on abort mid-research, skips remaining work, writes a report from findings, ends cancelled", async () => {
    const controller = new AbortController();
    const { events, result } = await run(
      { roles: ["market analyst", "regulatory expert", "slow analyst"], gaps: ["more?"], workerDelayMs: 30 },
      {
        signal: controller.signal,
        onEvent: (e) => {
          if (e.type === "board" && e.entry.type === "finding") controller.abort();
        },
      },
    );

    expect(result.status).toBe("cancelled");
    expect(events.at(-1)).toEqual({ type: "run_end", status: "cancelled" });
    expect(events.some((e) => e.type === "report")).toBe(true);
    expect(phases(events)).not.toContain("critiquing:1");
    expect(phases(events)).not.toContain("researching:2");
    const failed = events.filter((e) => e.type === "agent_done" && !e.ok);
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((e) => e.type === "agent_done" && e.error === "cancelled")).toBe(true);
  });

  it("on abort before any findings, ends cancelled without a report", async () => {
    const controller = new AbortController();
    const { events } = await run(
      { roles: ["market analyst"] },
      { signal: controller.signal, onEvent: (e) => e.type === "plan" && controller.abort() },
    );
    expect(events.some((e) => e.type === "report")).toBe(false);
    expect(events.at(-1)).toEqual({ type: "run_end", status: "cancelled" });
  });

  it("maps every [n] in the report to a citation with a real finding id", async () => {
    const { events } = await run({ roles: ["market analyst", "regulatory expert"] }, { maxRounds: 1 });
    const report = events.find((e) => e.type === "report");
    if (report?.type !== "report") throw new Error("no report");

    const findingIds = new Set(
      events.flatMap((e) => (e.type === "board" && e.entry.type === "finding" ? [e.entry.id] : [])),
    );
    const refs = [...report.markdown.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(refs).toEqual([1, 2]); // "[2, 99]" became "[2]"
    for (const n of refs) {
      const c = report.citations.find((c) => c.n === n);
      expect(c).toBeDefined();
      expect(findingIds.has(c!.findingId)).toBe(true);
      expect(c!.url).toBe("https://example.com/report");
    }
  });

  it("excludes disputed findings from the report sources", async () => {
    const { events } = await run({ roles: ["market analyst", "regulatory expert"], disputeId: "m1" }, { maxRounds: 1 });
    const disputes = events.filter((e) => e.type === "board" && e.entry.type === "dispute");
    expect(disputes).toHaveLength(1);
    const report = events.find((e) => e.type === "report");
    if (report?.type !== "report") throw new Error("no report");
    expect(report.citations.map((c) => c.findingId)).not.toContain("m1");
  });
});

describe("resolveCitations", () => {
  const numbered = [
    { findingId: "m1", claim: "a", url: "https://a.com" },
    { findingId: "m2", claim: "b", url: "https://b.com" },
  ];

  it("expands lists, drops unknown numbers, and leaves markdown links alone", () => {
    const { markdown, citations } = resolveCitations("x [1, 2] y [7] z [see](https://q.com) [2]", numbered);
    expect(markdown).toBe("x [1][2] y  z [see](https://q.com) [2]");
    expect(citations.map((c) => c.findingId)).toEqual(["m1", "m2"]);
  });
});

describe("lenient model output", () => {
  it("clamps critic gaps to 3 instead of failing validation", async () => {
    const { events, result } = await run({ roles: ["market analyst"], gaps: ["a?", "b?", "c?", "d?", "e?"] });
    const review = events.find((e) => e.type === "review");
    expect(review?.type === "review" && review.review.gaps).toHaveLength(3);
    expect(events.filter((e) => e.type === "agent_spawned" && e.round === 2)).toHaveLength(3);
    expect(result.status).toBe("done");
  });
});

describe("agent slots", () => {
  it("stops the round loop when no agent slots are left", async () => {
    const events: HiveEvent[] = [];
    await runHive("Should I launch a matcha brand in Germany?", {
      budgetUsd: 5,
      maxAgents: 2,
      maxRounds: 3,
      models: mockModels({ roles: ["market analyst", "regulatory expert"], gaps: ["pricing?"] }),
      tools: mockTools,
      onEvent: (e) => events.push(e),
    });
    expect(phases(events)).toEqual(["planning:0", "researching:1", "critiquing:1", "synthesizing:0"]);
    expect(events.at(-1)).toEqual({ type: "run_end", status: "done" });
  });
});
