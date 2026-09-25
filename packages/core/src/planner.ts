import { generateObject } from "ai";
import { emitBudget, type RunContext } from "./context.js";
import { PlanSchema, type SubQuestion } from "./types.js";

export async function plan(ctx: RunContext): Promise<SubQuestion[]> {
  const { object, usage } = await generateObject({
    model: ctx.models.lead,
    schema: PlanSchema,
    system:
      "You lead a research team. Split the goal into 2-6 independent sub-questions that can be " +
      "researched in parallel. Give each a specialist role. No overlap between questions.",
    prompt: ctx.goal,
    abortSignal: ctx.signal,
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);
  return object.subQuestions;
}
