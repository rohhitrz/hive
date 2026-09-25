import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Lead = planning, agent design, critique, synthesis. Worker = sub-agents (many, cheap).
export const MODELS: Record<"lead" | "worker", LanguageModel> = {
  lead: openai(process.env.HIVE_LEAD_MODEL || "gpt-6-luna"),
  worker: openai(process.env.HIVE_WORKER_MODEL || "gpt-6-luna"),
};

// USD per 1M tokens (gpt-6-luna list price, Sep 2026). Update if you override the models above.
export const PRICES: Record<keyof typeof MODELS, { input: number; output: number }> = {
  lead: { input: 0.1, output: 0.5 },
  worker: { input: 0.1, output: 0.5 },
};
