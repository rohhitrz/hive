import { generateText } from "ai";
import { MODELS } from "./config.js";
import type { Blackboard } from "./blackboard.js";
import type { Budget } from "./budget.js";

export async function synthesize(goal: string, board: Blackboard, budget: Budget) {
  const disputed = new Set(board.list("dispute").map((d) => d.findingId));
  const kept = board.list("finding").filter((e) => !disputed.has(e.id));
  const sources = kept.map((e, i) => `[${i + 1}] ${e.finding.claim} (${e.finding.sourceUrl})`).join("\n");

  const { text, usage } = await generateText({
    model: MODELS.lead,
    system:
      "Write a decision-ready research report in markdown. Use only the numbered findings given; " +
      "cite them inline like [2]. End with a Sources list and a section on open questions.",
    prompt: `Goal: ${goal}\n\nVerified findings:\n${sources || "(none)"}`,
  });
  budget.charge(usage, "lead");
  return text;
}
