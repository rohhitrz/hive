import { PRICES } from "./config.js";

type Usage = { inputTokens?: number; outputTokens?: number };

export class Budget {
  spentUsd = 0;
  agentsSpawned = 0;

  constructor(
    readonly limitUsd: number,
    readonly maxAgents: number,
  ) {}

  charge(usage: Usage, tier: keyof typeof PRICES) {
    const p = PRICES[tier];
    this.spentUsd +=
      ((usage.inputTokens ?? 0) * p.input + (usage.outputTokens ?? 0) * p.output) / 1_000_000;
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
