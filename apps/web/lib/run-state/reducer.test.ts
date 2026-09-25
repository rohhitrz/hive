import { describe, expect, it } from "vitest";
import type { RunEvent } from "../runner";
import fixture from "../../test/fixtures/run.json";
import failedFixture from "../../test/fixtures/run-failed-agents.json";
import { initialRunState, reduceAll, reduceRun, runStateReducer } from "./reducer";
import { replayDelays } from "./replay";

const run = fixture as unknown as RunEvent[];
const failedRun = failedFixture as unknown as RunEvent[];

describe("run reducer on the recorded fixture", () => {
  const state = reduceAll(run);

  it("ends done with the right phase, seq and totals", () => {
    expect(state.phase).toBe("done");
    expect(state.lastSeq).toBe(run.length);
    expect(state.agentsSpawned).toBe(2);
    expect(state.spentUsd).toBeGreaterThan(0);
    const budgets = run.filter((e) => e.event.type === "budget");
    const last = budgets.at(-1)!.event;
    expect(last.type === "budget" && state.spentUsd).toBe(last.type === "budget" ? last.spentUsd : -1);
  });

  it("tracks every agent with steps, findings and cost", () => {
    const agents = Object.values(state.agents);
    expect(agents).toHaveLength(2);
    for (const a of agents) {
      expect(a.status).toBe("done");
      expect(a.round).toBe(1);
      expect(a.steps.length).toBeGreaterThan(0);
      expect(a.costUsd).toBeGreaterThan(0);
      expect(a.summary).toBeTruthy();
    }
    const findings = state.board.filter((e) => e.type === "finding");
    expect(agents.flatMap((a) => a.findingIds).sort()).toEqual(findings.map((f) => f.id).sort());
  });

  it("collects disputes with the critic's reasons, and keeps them out of the report", () => {
    expect(Object.keys(state.disputes).sort()).toEqual(["m2", "m6", "m8"]);
    expect(Object.values(state.disputes).every((r) => r.length > 0)).toBe(true);
    expect(state.reviews[1]).toBeDefined();
    expect(state.report?.markdown.length).toBeGreaterThan(100);
    const cited = state.report!.citations.map((c) => c.findingId);
    expect(cited).toHaveLength(13);
    expect(cited.some((id) => id in state.disputes)).toBe(false);
  });

  it("marks failed agents with their error and keeps the run done", () => {
    const s = reduceAll(failedRun);
    const statuses = Object.values(s.agents).map((a) => a.status).sort();
    expect(statuses).toEqual(["done", "failed", "failed"]);
    expect(Object.values(s.agents).find((a) => a.status === "failed")?.error).toBeTruthy();
    expect(s.phase).toBe("done");
  });

  it("replaying the fixture twice gives identical state", () => {
    expect(reduceAll(run)).toEqual(reduceAll(run));
    expect(JSON.stringify(reduceAll(run))).toBe(JSON.stringify(state));
  });

  it("is idempotent across reconnects: duplicate and older seqs are ignored", () => {
    const withDupes = [...run.slice(0, 30), ...run.slice(20, 40), ...run.slice(35)];
    expect(reduceAll(withDupes)).toEqual(state);
  });

  it("batched and one-by-one application agree", () => {
    const batched = runStateReducer(initialRunState, { type: "events", events: run });
    expect(batched).toEqual(state);
  });
});

describe("reducer robustness", () => {
  const env = (seq: number, event: unknown): RunEvent => ({ runId: "r", seq, at: "2026-01-01T00:00:00.000Z", event }) as RunEvent;

  it("ignores unknown event types but advances seq", () => {
    const s = reduceRun(initialRunState, env(1, { type: "telemetry", foo: 1 }));
    expect(s).toEqual({ ...initialRunState, lastSeq: 1, startedAt: "2026-01-01T00:00:00.000Z", lastEventAt: "2026-01-01T00:00:00.000Z" });
  });

  it("never throws on malformed events", () => {
    const junk: unknown[] = [
      null,
      { seq: "x" },
      { seq: 1, event: null },
      { seq: 2, event: { type: "agent_spawned", agent: null } },
      { seq: 3, event: { type: "agent_step", agentId: "ghost" } },
      { seq: 4, event: { type: "board", entry: 5 } },
      { seq: 5, event: { type: "board", entry: { id: "m1", type: "finding", from: "ghost" } } },
      { seq: 6, event: { type: "review", round: 1, review: "nope" } },
      { seq: 7, event: { type: "report", markdown: 42 } },
      { seq: 8, event: { type: "budget", spentUsd: "NaN" } },
    ];
    let s = initialRunState;
    expect(() => {
      for (const j of junk) s = reduceRun(s, j as RunEvent);
    }).not.toThrow();
    expect(s.lastSeq).toBe(8);
    expect(s.spentUsd).toBe(0);
    expect(s.report).toBeUndefined();
  });
});

describe("replayDelays", () => {
  it("uses original gaps divided by speed, or zero for instant", () => {
    const evs = [0, 1000, 3000].map((ms, i) => ({ runId: "r", seq: i + 1, at: new Date(ms).toISOString(), event: { type: "plan", questions: [] } }) as RunEvent);
    expect(replayDelays(evs, 1)).toEqual([0, 1000, 2000]);
    expect(replayDelays(evs, 4)).toEqual([0, 250, 500]);
    expect(replayDelays(evs, "instant")).toEqual([0, 0, 0]);
  });
});
