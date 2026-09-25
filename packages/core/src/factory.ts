import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import { MODELS } from "./config.js";
import type { Budget } from "./budget.js";
import { AgentSpecSchema, type AgentSpec } from "./types.js";

// Designs a sub-agent at runtime. Also powers the "describe an agent" builder in the UI.
export async function createAgent(
  description: string,
  goal: string,
  budget: Budget,
): Promise<AgentSpec> {
  const { object, usage } = await generateObject({
    model: MODELS.lead,
    schema: AgentSpecSchema,
    system:
      "You design specialist research agents. Write a focused system prompt that says what to " +
      "look for, which sources to trust, and when to stop. Every claim must cite a URL.",
    prompt: `Team goal: ${goal}\nAgent to design: ${description}`,
  });
  budget.charge(usage, "lead");
  return { ...object, id: `${object.role.replace(/\W+/g, "-").toLowerCase()}-${randomUUID().slice(0, 4)}` };
}
