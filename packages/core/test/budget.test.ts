import { describe, expect, it } from "vitest";
import { Budget } from "../src/budget.js";

describe("Budget", () => {
  it("charges by token usage and caps agent slots", () => {
    const budget = new Budget(1, 3);
    budget.charge({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, "worker");
    expect(budget.spentUsd).toBeCloseTo(0.6);
    expect(budget.reserveAgents(2)).toBe(2);
    expect(budget.reserveAgents(5)).toBe(1);
    expect(budget.exhausted).toBe(false);
  });
});
