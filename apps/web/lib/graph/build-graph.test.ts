import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/run.json";
import { syntheticRun } from "../../test/synthetic-run";
import type { RunEvent } from "../runner";
import { reduceAll, reduceRun, initialRunState } from "../run-state/reducer";
import { buildGraph, topologyKey } from "./build-graph";
import { layoutGraph, NODE_SIZE } from "./layout";

const edgeSet = (edges: { source: string; target: string; kind: string }[], kind: string) =>
  edges.filter((e) => e.kind === kind).map((e) => `${e.source}->${e.target}`).sort();

describe("buildGraph on the recorded fixture", () => {
  const state = reduceAll(fixture as unknown as RunEvent[]);
  const { nodes, edges } = buildGraph(state);
  const agentIds = Object.keys(state.agents);

  it("has lead, every agent, critic-r1 and synth", () => {
    expect(nodes.map((n) => n.id).sort()).toEqual(["critic-r1", "lead", "synth", ...agentIds].sort());
    expect(nodes.find((n) => n.id === "synth")?.status).toBe("done");
  });

  it("wires lead → round-1 agents → critic-r1 → synth", () => {
    expect(edgeSet(edges, "flow")).toEqual(
      [...agentIds.map((id) => `lead->${id}`), ...agentIds.map((id) => `${id}->critic-r1`), "critic-r1->synth"].sort(),
    );
  });

  it("draws one dashed dispute edge per disputed agent, from critic-r1", () => {
    const board = state.board;
    const posters = new Set(Object.keys(state.disputes).map((fid) => board.find((e) => e.id === fid)?.from));
    expect(edgeSet(edges, "dispute")).toEqual([...posters].map((a) => `critic-r1->${a}`).sort());
  });

  it("shows findings and cost on agent nodes", () => {
    for (const n of nodes) {
      if (n.kind !== "agent") continue;
      expect(n.findings).toBe(state.agents[n.id]!.findingIds.length);
      expect(n.costUsd).toBeGreaterThan(0);
      expect(n.status).toBe("done");
    }
  });
});

describe("buildGraph across rounds", () => {
  const events = syntheticRun([3, 2]);
  const { nodes, edges } = buildGraph(reduceAll(events));

  it("spawns round-2 agents from critic-r1 and synth from the last critic", () => {
    const flow = edgeSet(edges, "flow");
    expect(flow).toContain("lead->agent-r1-0");
    expect(flow).toContain("critic-r1->agent-r2-0");
    expect(flow).toContain("agent-r2-1->critic-r2");
    expect(flow).toContain("critic-r2->synth");
    expect(flow).not.toContain("lead->agent-r2-0");
    expect(edgeSet(edges, "dispute")).toEqual(["critic-r1->agent-r1-0"]);
    expect(nodes.find((n) => n.id === "agent-r1-1")?.status).toBe("failed");
  });

  it("adds critic and synth nodes only when their phases start", () => {
    let s = initialRunState;
    const ids: string[][] = [];
    for (const e of events) {
      s = reduceRun(s, e);
      if (e.event.type === "phase") ids.push(buildGraph(s).nodes.map((n) => n.id));
    }
    expect(ids[0]).toEqual(["lead"]);
    expect(ids.find((x) => x.includes("critic-r1"))).not.toContain("critic-r2");
    expect(ids.at(-1)).toContain("synth");
  });

  it("marks a researching agent with no steps as spawning", () => {
    const upToSpawn = events.slice(0, events.findIndex((e) => e.event.type === "agent_step"));
    const agent = buildGraph(reduceAll(upToSpawn)).nodes.find((n) => n.kind === "agent");
    expect(agent?.status).toBe("spawning");
  });
});

describe("layout", () => {
  it("lays out top-to-bottom: lead above agents above critic above synth", () => {
    const { nodes, edges } = buildGraph(reduceAll(syntheticRun([2, 1])));
    const p = layoutGraph(nodes, edges);
    expect(p.lead!.y).toBeLessThan(p["agent-r1-0"]!.y);
    expect(p["agent-r1-0"]!.y).toBeLessThan(p["critic-r1"]!.y);
    expect(p["critic-r1"]!.y).toBeLessThan(p["agent-r2-0"]!.y);
    expect(p["critic-r2"]!.y).toBeLessThan(p.synth!.y);
    // no overlaps within a rank
    expect(Math.abs(p["agent-r1-0"]!.x - p["agent-r1-1"]!.x)).toBeGreaterThanOrEqual(NODE_SIZE.width);
  });

  it("topology key changes when nodes are added, not when data changes", () => {
    const events = syntheticRun([2]);
    const mid = reduceAll(events.slice(0, 20));
    const later = reduceRun(mid, { ...events[20]!, event: { type: "budget", spentUsd: 1, agentsSpawned: 2, searches: 0 } });
    expect(topologyKey(buildGraph(mid).nodes)).toBe(topologyKey(buildGraph(later).nodes));
    expect(topologyKey(buildGraph(reduceAll(events)).nodes)).not.toBe(topologyKey(buildGraph(mid).nodes));
  });
});

describe("performance", () => {
  it("handles 20 agent nodes and 500 events quickly", () => {
    const events = syntheticRun([10, 10], 500);
    expect(events.length).toBeGreaterThanOrEqual(500);
    const t0 = performance.now();
    let s = initialRunState;
    // Worst case for the UI: rebuild the graph after every single event.
    for (const e of events) {
      s = reduceRun(s, e);
      buildGraph(s);
    }
    const perEvent = (performance.now() - t0) / events.length;
    const { nodes, edges } = buildGraph(s);
    expect(nodes.filter((n) => n.kind === "agent")).toHaveLength(20);
    const t1 = performance.now();
    layoutGraph(nodes, edges);
    const layoutMs = performance.now() - t1;
    expect(perEvent).toBeLessThan(2); // ms per event, far under a 16ms frame
    expect(layoutMs).toBeLessThan(100);
  });
});

describe("ended runs", () => {
  it("shows agents cut off by cancel as stopped, not failed", () => {
    const events = syntheticRun([2]);
    const cut = events.findIndex((e) => e.event.type === "agent_done");
    const s = reduceAll([
      ...events.slice(0, cut),
      { ...events[cut]!, event: { type: "run_end", status: "cancelled" } },
    ]);
    const agents = buildGraph(s).nodes.filter((n) => n.kind === "agent");
    expect(agents.map((a) => a.status)).toEqual(["stopped", "stopped"]);
  });
});

describe("cancelled agents", () => {
  it("shows agents that ended with error 'cancelled' as stopped", () => {
    const events = syntheticRun([2]);
    const cut = events.findIndex((e) => e.event.type === "agent_done");
    const at = events[cut]!.at;
    const s = reduceAll([
      ...events.slice(0, cut),
      { runId: "synthetic", seq: cut + 1, at, event: { type: "agent_done", agentId: "agent-r1-0", ok: false, error: "cancelled", costUsd: 0 } },
      { runId: "synthetic", seq: cut + 2, at, event: { type: "agent_done", agentId: "agent-r1-1", ok: false, error: "search exploded", costUsd: 0 } },
    ]);
    const byId = Object.fromEntries(buildGraph(s).nodes.map((n) => [n.id, n.status]));
    expect(byId["agent-r1-0"]).toBe("stopped");
    expect(byId["agent-r1-1"]).toBe("failed");
  });
});
