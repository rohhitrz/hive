import { describe, expect, it } from "vitest";
import { costTone, isTerminal, phaseLabel, sourceDomain } from "./labels";

describe("labels", () => {
  it("formats phases with rounds", () => {
    expect(phaseLabel("researching", 2)).toBe("Researching (round 2)");
    expect(phaseLabel("critiquing", 1)).toBe("Critiquing (round 1)");
    expect(phaseLabel("synthesizing", 0)).toBe("Synthesizing");
    expect(phaseLabel("interrupted", 3)).toBe("Interrupted");
  });

  it("knows terminal phases", () => {
    expect(isTerminal("done")).toBe(true);
    expect(isTerminal("interrupted")).toBe(true);
    expect(isTerminal("critiquing")).toBe(false);
  });

  it("extracts source domains", () => {
    expect(sourceDomain("https://www.who.int/news/item/1")).toBe("who.int");
    expect(sourceDomain("not a url")).toBe("not a url");
  });

  it("turns amber above 80% of budget", () => {
    expect(costTone(0.4, 0.5)).toBe("ok");
    expect(costTone(0.41, 0.5)).toBe("warn");
    expect(costTone(0.5, 0.5)).toBe("over");
  });
});
