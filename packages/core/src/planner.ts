import { generateObject } from "ai";
import { MODELS } from "./config.js";
import type { Budget } from "./budget.js";
import { PlanSchema, type SubQuestion } from "./types.js";

export async function plan(goal: string, budget: Budget): Promise<SubQuestion[]> {
  const { object, usage } = await generateObject({
    model: MODELS.lead,
    schema: PlanSchema,
    system:
      "You lead a research team. Split the goal into 2-6 independent sub-questions that can be " +
      "researched in parallel. Give each a specialist role. No overlap between questions.",
    prompt: goal,
  });
  budget.charge(usage, "lead");
  return object.subQuestions;
}
