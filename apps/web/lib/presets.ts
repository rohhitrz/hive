export type DepthPreset = { id: "quick" | "standard" | "deep"; label: string; budgetUsd: number; maxAgents: number; maxRounds: number };

// PRD §5.1
export const DEPTH_PRESETS: DepthPreset[] = [
  { id: "quick", label: "Quick", budgetUsd: 0.15, maxAgents: 4, maxRounds: 1 },
  { id: "standard", label: "Standard", budgetUsd: 0.5, maxAgents: 8, maxRounds: 2 },
  { id: "deep", label: "Deep", budgetUsd: 1.5, maxAgents: 14, maxRounds: 3 },
];

export const DEFAULT_PRESET = DEPTH_PRESETS[1]!;
