import { describe, expect, it } from "vitest";
import { DEPTH_PRESETS } from "./presets";
import { CreateRunSchema } from "./validation";

const goal = "Should I launch a matcha brand in Germany?";

describe("CreateRunSchema", () => {
  it("accepts every depth preset", () => {
    for (const p of DEPTH_PRESETS) {
      expect(CreateRunSchema.safeParse({ goal, budgetUsd: p.budgetUsd, maxAgents: p.maxAgents, maxRounds: p.maxRounds }).success).toBe(true);
    }
  });

  it("rejects short/long goals and out-of-range numbers with readable messages", () => {
    const r = CreateRunSchema.safeParse({ goal: "  too short ", budgetUsd: 5, maxAgents: 0, maxRounds: 1.5 });
    expect(r.success).toBe(false);
    const e = r.success ? {} : r.error.flatten().fieldErrors;
    expect(e.goal?.[0]).toMatch(/at least 10/);
    expect(e.budgetUsd?.[0]).toMatch(/\$2\.00/);
    expect(e.maxAgents?.[0]).toMatch(/At least 1/);
    expect(e.maxRounds?.[0]).toMatch(/Whole number/);
    expect(CreateRunSchema.safeParse({ goal: "x".repeat(1001), budgetUsd: 1, maxAgents: 1, maxRounds: 1 }).success).toBe(false);
  });

  it("reports empty number fields as 'Enter a number'", () => {
    const r = CreateRunSchema.safeParse({ goal, budgetUsd: Number.NaN, maxAgents: 4, maxRounds: 1 });
    expect(r.success ? "" : r.error.flatten().fieldErrors.budgetUsd?.[0]).toBe("Enter a number");
  });
});
