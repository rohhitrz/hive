import { describe, expect, it } from "vitest";
import type { HiveEvent, HiveOptions, HiveResult } from "@hive/core";
import { createRunner, type RunEvent, type RunHiveFn, type RunPatch, type RunStore } from "./runner";

const input = { goal: "Research the matcha market", mode: "research" as const, budgetUsd: 0.5, maxAgents: 4, maxRounds: 1 };

function memoryStore(appendDelayMs = 0) {
  const events: { runId: string; seq: number; event: HiveEvent }[] = [];
  const patches: RunPatch[] = [];
  let orphanCalls = 0;
  const store: RunStore = {
    createRun: async () => "run-1",
    appendEvent: async (runId, seq, _at, event) => {
      await new Promise((r) => setTimeout(r, appendDelayMs * Math.random()));
      events.push({ runId, seq, event });
    },
    updateRun: async (_id, patch) => {
      patches.push(patch);
    },
    markOrphansInterrupted: async () => {
      orphanCalls += 1;
    },
  };
  return { store, events, patches, orphans: () => orphanCalls };
}

const result: HiveResult = { status: "done", spentUsd: 0.01, agents: 1, searches: 0 };

const scripted = (events: HiveEvent[]): RunHiveFn => async (_goal, opts) => {
  for (const e of events) opts.onEvent?.(e);
  return result;
};

const script: HiveEvent[] = [
  { type: "phase", phase: "planning", round: 0 },
  { type: "budget", spentUsd: 0.001, agentsSpawned: 0, searches: 0 },
  { type: "plan", questions: [{ role: "analyst", question: "q" }] },
  { type: "budget", spentUsd: 0.002, agentsSpawned: 1, searches: 0 },
  { type: "report", markdown: "# R [1]", citations: [{ n: 1, findingId: "m1", claim: "c", url: "https://a.com" }] },
  { type: "run_end", status: "done" },
];

describe("runner", () => {
  it("assigns gapless seqs and persists each event before emitting it", async () => {
    const mem = memoryStore(3);
    const runner = createRunner(mem.store, scripted(script));
    const emitted: RunEvent[] = [];

    const id = await runner.start(input);
    runner.subscribe(id, (e) => {
      // Persist-before-emit: the event must already be in the store.
      expect(mem.events.some((s) => s.seq === e.seq)).toBe(true);
      emitted.push(e);
    });
    await runner.settled(id);

    expect(emitted.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(mem.events.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(emitted.map((e) => e.event.type)).toEqual(script.map((e) => e.type));
    expect(runner.isActive(id)).toBe(false);
  });

  it("updates the run row on budget, report and run_end", async () => {
    const mem = memoryStore();
    const runner = createRunner(mem.store, scripted(script));
    await runner.settled(await runner.start(input));

    expect(mem.patches).toEqual([
      { spentUsd: 0.001, agentCount: 0 },
      { spentUsd: 0.002, agentCount: 1 },
      { reportMd: "# R [1]", citations: script[4]!.type === "report" ? script[4]!.citations : [] },
      { status: "done", error: null, finishedAt: expect.any(Date) },
    ]);
  });

  it("marks orphaned runs interrupted once per process", async () => {
    const mem = memoryStore();
    const runner = createRunner(mem.store, scripted(script));
    await runner.settled(await runner.start(input));
    await runner.ensureOrphansMarked();
    expect(mem.orphans()).toBe(1);
  });

  it("cancel aborts the run's signal", async () => {
    const mem = memoryStore();
    let seen: AbortSignal | undefined;
    const runHive: RunHiveFn = (_goal, opts: HiveOptions) =>
      new Promise((resolve) => {
        seen = opts.signal;
        opts.signal?.addEventListener("abort", () => {
          opts.onEvent?.({ type: "run_end", status: "cancelled" });
          resolve({ ...result, status: "cancelled" });
        });
      });
    const runner = createRunner(mem.store, runHive);
    const id = await runner.start(input);

    expect(runner.cancel(id)).toBe(true);
    await runner.settled(id);
    expect(seen?.aborted).toBe(true);
    expect(mem.patches.at(-1)).toMatchObject({ status: "cancelled" });
    expect(runner.cancel(id)).toBe(false);
  });

  it("records run_end failed if runHive rejects unexpectedly", async () => {
    const mem = memoryStore();
    const runner = createRunner(mem.store, async () => {
      throw new Error("boom");
    }, () => {});
    await runner.settled(await runner.start(input));
    expect(mem.events.at(-1)?.event).toEqual({ type: "run_end", status: "failed", error: "boom" });
  });
});
