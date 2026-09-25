import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import { emitBudget, MAX_RETRIES, type RunContext } from "./context.js";
import { AgentSpecSchema, LIMITS, type AgentSpec } from "./types.js";

// Designs a sub-agent at runtime. Also powers the "describe an agent" builder in the UI.
export async function createAgent(description: string, ctx: RunContext): Promise<AgentSpec> {
  const { object, usage } = await generateObject({
    model: ctx.models.lead,
    schema: AgentSpecSchema,
    system:
      "You design specialist research agents. Write a focused system prompt that says what to " +
      "look for, which sources to trust, and when to stop. Every claim must cite a URL.",
    prompt: `Team goal: ${ctx.goal}\nAgent to design: ${description}`,
    abortSignal: ctx.signal,
    maxRetries: MAX_RETRIES,
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);
  const maxSteps = Math.min(LIMITS.maxSteps, Math.max(LIMITS.minSteps, Math.round(object.maxSteps)));
  return { ...object, maxSteps, id: `${object.role.replace(/\W+/g, "-").toLowerCase()}-${randomUUID().slice(0, 4)}` };
}
