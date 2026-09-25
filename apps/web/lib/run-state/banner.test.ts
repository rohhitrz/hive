import { describe, expect, it } from "vitest";
import type { BoardEntry } from "@hive/core";
import { bannerFor } from "./banner";
import { initialRunState, type RunState } from "./reducer";

const finding: BoardEntry = {
  type: "finding",
  id: "m1",
  from: "a",
  at: 0,
  finding: { claim: "c", sourceUrl: "https://x.com", evidence: "e", confidence: "high" },
};
const withFindings: RunState = { ...initialRunState, board: [finding] };

describe("bannerFor", () => {
  it("is silent for running and done runs", () => {
    expect(bannerFor(initialRunState)).toBeUndefined();
    expect(bannerFor({ ...withFindings, phase: "done" })).toBeUndefined();
  });

  it("cancelled with a report mentions the findings it used", () => {
    const b = bannerFor({ ...withFindings, phase: "cancelled", report: { markdown: "# r", citations: [] } });
    expect(b?.text).toContain("written from the 1 findings");
  });

  it("cancelled with findings but no report shows the synthesis error, not 'no findings'", () => {
    const b = bannerFor({ ...withFindings, phase: "cancelled", error: "Rate limit reached" });
    expect(b?.text).toBe("Cancelled with 1 findings, but the report could not be written: Rate limit reached");
    expect(b?.text).not.toContain("before any findings");
  });

  it("cancelled before any findings says so", () => {
    expect(bannerFor({ ...initialRunState, phase: "cancelled" })?.text).toContain("before any findings");
  });

  it("failed and interrupted runs explain themselves", () => {
    expect(bannerFor({ ...initialRunState, phase: "failed", error: "boom" })).toEqual({ tone: "failed", text: "Run failed: boom Partial results are shown below." });
    expect(bannerFor({ ...initialRunState, phase: "interrupted" })?.text).toContain("Interrupted");
  });
});
