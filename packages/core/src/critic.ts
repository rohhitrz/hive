import { generateObject } from "ai";
import { MODELS } from "./config.js";
import type { Blackboard } from "./blackboard.js";
import type { Budget } from "./budget.js";
import { ReviewSchema, type Review } from "./types.js";

export async function critique(goal: string, board: Blackboard, budget: Budget): Promise<Review> {
  const findings = board
    .list("finding")
    .map((e) => `[${e.id}] ${e.finding.claim}\n  source: ${e.finding.sourceUrl}\n  evidence: ${e.finding.evidence}`)
    .join("\n");

  const { object, usage } = await generateObject({
    model: MODELS.lead,
    schema: ReviewSchema,
    system:
      "You are a skeptical fact-checker. For every finding, judge whether its evidence actually " +
      "supports the claim, and whether it contradicts another finding. Then list the most " +
      "important gaps left for answering the goal.",
    prompt: `Goal: ${goal}\n\nFindings:\n${findings || "(none)"}`,
  });
  budget.charge(usage, "lead");

  for (const v of object.verdicts) {
    if (v.verdict !== "supported") {
      board.post("critic", { type: "dispute", findingId: v.findingId, reason: v.note });
    }
  }
  return object;
}
