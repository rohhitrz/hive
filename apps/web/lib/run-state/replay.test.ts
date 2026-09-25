import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/run.json";
import failedFixture from "../../test/fixtures/run-failed-agents.json";
import type { RunEvent } from "../runner";
import { initialRunState, reduceAll, runStateReducer } from "./reducer";

/** Deterministic pseudo-random batch sizes (seeded LCG). */
function batches<T>(items: T[], seed: number): T[][] {
  const out: T[][] = [];
  let s = seed;
  for (let i = 0; i < items.length; ) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const size = 1 + (s % 9);
    out.push(items.slice(i, i + size));
    i += size;
  }
  return out;
}

describe("replay equals live", () => {
  for (const [name, events] of [
    ["run.json", fixture],
    ["run-failed-agents.json", failedFixture],
  ] as const) {
    it(`${name}: any batching (1×, 4×, instant) ends in the live state`, () => {
      const live = reduceAll(events as unknown as RunEvent[]);
      const instant = runStateReducer(initialRunState, { type: "events", events: events as unknown as RunEvent[] });
      expect(instant).toEqual(live);
      for (const seed of [1, 7, 42]) {
        const replayed = batches(events as unknown as RunEvent[], seed).reduce(
          (s, b) => runStateReducer(s, { type: "events", events: b }),
          initialRunState,
        );
        expect(replayed).toEqual(live);
      }
    });
  }
});
