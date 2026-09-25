import { z } from "zod";

export const CreateRunSchema = z.object({
  goal: z.string().trim().min(10, "Goal must be at least 10 characters").max(1000, "Goal must be at most 1000 characters"),
  mode: z.literal("research").default("research"),
  budgetUsd: z.number().min(0.1).max(2),
  maxAgents: z.number().int().min(1).max(20),
  maxRounds: z.number().int().min(1).max(5),
});
export type CreateRunInput = z.infer<typeof CreateRunSchema>;

export const ListRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RunIdSchema = z.string().uuid();
