import { generateObject } from "ai";
import { emitBudget, MAX_RETRIES, type RunContext } from "./context.js";
import { LIMITS, ReviewSchema, type Review } from "./types.js";

export async function critique(ctx: RunContext): Promise<Review> {
  const findings = ctx.board
    .list("finding")
    .map((e) => `[${e.id}] ${e.finding.claim}\n  source: ${e.finding.sourceUrl}\n  evidence: ${e.finding.evidence}`)
    .join("\n");

  const { object, usage } = await generateObject({
    model: ctx.models.lead,
    schema: ReviewSchema,
    system:
      "You are a skeptical fact-checker. For every finding, judge whether its evidence actually " +
      "supports the claim, and whether it contradicts another finding. Then list the most " +
      "important gaps left for answering the goal.",
    prompt: `Goal: ${ctx.goal}\n\nFindings:\n${findings || "(none)"}`,
    abortSignal: ctx.signal,
    maxRetries: MAX_RETRIES,
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);

  const known = new Set(ctx.board.list("finding").map((e) => e.id));
  for (const v of object.verdicts) {
    if (v.verdict !== "supported" && known.has(v.findingId)) {
      ctx.board.post("critic", { type: "dispute", findingId: v.findingId, reason: v.note });
    }
  }
  return { ...object, gaps: object.gaps.slice(0, LIMITS.gaps) };
}
