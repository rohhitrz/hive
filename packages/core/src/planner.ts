import { generateObject } from "ai";
import { emitBudget, MAX_RETRIES, type RunContext } from "./context.js";
import { LIMITS, PlanSchema, type SubQuestion } from "./types.js";

export async function plan(ctx: RunContext): Promise<SubQuestion[]> {
  const { object, usage } = await generateObject({
    model: ctx.models.lead,
    schema: PlanSchema,
    system:
      "You lead a research team. Split the goal into 2-6 independent sub-questions that can be " +
      "researched in parallel. Give each a specialist role. No overlap between questions.",
    prompt: ctx.goal,
    abortSignal: ctx.signal,
    maxRetries: MAX_RETRIES,
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);
  return object.subQuestions.slice(0, LIMITS.subQuestions);
}
