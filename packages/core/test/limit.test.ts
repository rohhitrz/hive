import { describe, expect, it } from "vitest";
import { createLimiter } from "../src/limit.js";
import { runHive, type HiveEvent } from "../src/index.js";
import { mockModels, mockTools } from "./mock-models.js";

describe("createLimiter", () => {
  it("never runs more than n tasks at once and runs them all", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((r) => setTimeout(r, 5));
          active -= 1;
          return n;
        }),
      ),
    );
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("frees the slot when a task throws", async () => {
    const limit = createLimiter(1);
    await expect(limit(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    await expect(limit(async () => "ok")).resolves.toBe("ok");
  });
});

describe("runHive maxConcurrency", () => {
  async function peakAgents(maxConcurrency: number) {
    const events: HiveEvent[] = [];
    await runHive("Should I launch a matcha brand in Germany?", {
      budgetUsd: 5,
      maxAgents: 10,
      maxRounds: 1,
      maxConcurrency,
      models: mockModels({ roles: ["a analyst", "b analyst", "c analyst", "d analyst"] }),
      tools: mockTools,
      onEvent: (e) => events.push(e),
    });
    let running = 0;
    let peak = 0;
    for (const e of events) {
      if (e.type === "agent_spawned") peak = Math.max(peak, ++running);
      if (e.type === "agent_done") running -= 1;
    }
    return { peak, spawned: events.filter((e) => e.type === "agent_spawned").length };
  }

  it("caps agents running at once and still runs every agent", async () => {
    expect(await peakAgents(1)).toEqual({ peak: 1, spawned: 4 });
    expect(await peakAgents(2)).toEqual({ peak: 2, spawned: 4 });
    expect((await peakAgents(10)).peak).toBe(4);
  });
});
