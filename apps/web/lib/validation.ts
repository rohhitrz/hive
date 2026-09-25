import { z } from "zod";

export const CreateRunSchema = z.object({
  goal: z.string().trim().min(10, "Goal must be at least 10 characters").max(1000, "Goal must be at most 1000 characters"),
  mode: z.literal("research").default("research"),
  budgetUsd: z.number({ invalid_type_error: "Enter a number" }).min(0.1, "Budget must be at least $0.10").max(2, "Budget must be at most $2.00"),
  maxAgents: z.number({ invalid_type_error: "Enter a number" }).int("Whole number").min(1, "At least 1 agent").max(20, "At most 20 agents"),
  maxRounds: z.number({ invalid_type_error: "Enter a number" }).int("Whole number").min(1, "At least 1 round").max(5, "At most 5 rounds"),
});
export type CreateRunInput = z.infer<typeof CreateRunSchema>;

export const ListRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RunIdSchema = z.string().uuid();

/** Resume point for the SSE stream: Last-Event-ID header wins over ?after. */
export const AfterSeqSchema = z.coerce.number().int().min(0).default(0);
