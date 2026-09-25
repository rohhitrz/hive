import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/run.json";
import type { RunEvent } from "../runner";
import { reduceAll } from "./reducer";
import { agentFindings, isToolError } from "./selectors";

describe("agentFindings", () => {
  const state = reduceAll(fixture as unknown as RunEvent[]);

  it("returns each agent's findings in order, with dispute reasons", () => {
    const all = Object.keys(state.agents).flatMap((id) => agentFindings(state, id));
    expect(all.map((f) => f.id).sort()).toEqual(state.board.filter((e) => e.type === "finding").map((e) => e.id).sort());
    const disputed = all.filter((f) => f.dispute);
    expect(disputed.map((f) => f.id).sort()).toEqual(["m2", "m6", "m8"]);
    expect(disputed.every((f) => f.dispute === state.disputes[f.id])).toBe(true);
  });

  it("is empty for unknown agents", () => {
    expect(agentFindings(state, "nobody")).toEqual([]);
  });
});

describe("isToolError", () => {
  it("detects core's error summaries", () => {
    expect(isToolError("error: read failed: 403")).toBe(true);
    expect(isToolError('[{"title":"x"}]')).toBe(false);
  });
});
