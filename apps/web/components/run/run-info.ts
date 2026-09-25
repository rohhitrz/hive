import type { RunStatus } from "@/lib/db/schema";

/** The slice of the runs row the run view needs (serializable for client components). */
export type RunInfo = {
  id: string;
  goal: string;
  status: RunStatus;
  budgetUsd: number;
  maxAgents: number;
  maxRounds: number;
  createdAt: string;
  finishedAt: string | null;
};
