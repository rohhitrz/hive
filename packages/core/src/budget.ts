import { PRICES } from "./config.js";

type Usage = { inputTokens?: number; outputTokens?: number };

export class Budget {
  spentUsd = 0;
  agentsSpawned = 0;

  constructor(
    readonly limitUsd: number,
    readonly maxAgents: number,
  ) {}

  /** Adds the cost of one model call and returns it. */
  charge(usage: Usage, tier: keyof typeof PRICES): number {
    const p = PRICES[tier];
    const cost = ((usage.inputTokens ?? 0) * p.input + (usage.outputTokens ?? 0) * p.output) / 1_000_000;
    this.spentUsd += cost;
    return cost;
  }

  get exhausted() {
    return this.spentUsd >= this.limitUsd;
  }

  /** Reserves up to n agent slots; returns how many were granted. */
  reserveAgents(n: number) {
    const granted = Math.max(0, Math.min(n, this.maxAgents - this.agentsSpawned));
    this.agentsSpawned += granted;
    return granted;
  }
}
