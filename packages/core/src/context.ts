import type { LanguageModel } from "ai";
import type { Blackboard } from "./blackboard.js";
import type { Budget } from "./budget.js";
import type { HiveEvent } from "./types.js";

export type SearchResult = { title: string; url: string; snippet: string };

/** Network-facing tool implementations. Injectable so tests run without API keys. */
export type ToolImpls = {
  webSearch: (query: string, signal?: AbortSignal) => Promise<SearchResult[]>;
  readPage: (url: string, signal?: AbortSignal) => Promise<string>;
};

export type Models = { lead: LanguageModel; worker: LanguageModel };

/** Everything a pipeline stage needs for one run. */
export type RunContext = {
  goal: string;
  board: Blackboard;
  budget: Budget;
  models: Models;
  tools: ToolImpls;
  signal: AbortSignal;
  emit: (e: HiveEvent) => void;
};

export function emitBudget(ctx: RunContext) {
  ctx.emit({ type: "budget", spentUsd: ctx.budget.spentUsd, agentsSpawned: ctx.budget.agentsSpawned });
}

export function truncate(value: unknown, max = 300): string {
  let text: string;
  if (typeof value === "string") text = value;
  else if (value instanceof Error) text = value.message;
  else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
