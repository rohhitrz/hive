import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import { emitBudget, type RunContext } from "./context.js";
import { AgentSpecSchema, type AgentSpec } from "./types.js";

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
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);
  return { ...object, id: `${object.role.replace(/\W+/g, "-").toLowerCase()}-${randomUUID().slice(0, 4)}` };
}
