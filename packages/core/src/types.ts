import { z } from "zod";

// Model-facing schemas avoid min/max limits: OpenAI structured outputs don't enforce them, so a
// response that breaks one would fail validation. Callers clamp instead (see LIMITS).
// minSteps 6 leaves room for read_board → search → post → read → post → summary.
export const LIMITS = { subQuestions: 6, gaps: 3, minSteps: 6, maxSteps: 12 } as const;

export const PlanSchema = z.object({
  subQuestions: z
    .array(z.object({ question: z.string(), role: z.string() }))
    .describe("2-6 independent sub-questions"),
});
export type SubQuestion = z.infer<typeof PlanSchema>["subQuestions"][number];

// What the agent factory generates at runtime.
export const AgentSpecSchema = z.object({
  role: z.string().describe("Short role name, e.g. 'regulatory researcher'"),
  objective: z.string().describe("The single question this agent must answer"),
  systemPrompt: z.string().describe("Instructions tailored to this role and objective"),
  maxSteps: z.number().int().describe("Tool-call budget between 6 and 12; harder questions get more"),
});
export type AgentSpec = z.infer<typeof AgentSpecSchema> & { id: string };

export const FindingSchema = z.object({
  claim: z.string(),
  sourceUrl: z.string().url(),
  evidence: z.string().describe("Short excerpt from the source that supports the claim"),
  confidence: z.enum(["low", "medium", "high"]),
});
export type Finding = z.infer<typeof FindingSchema>;

// Typed agent-to-agent messages. No free-form chat: it burns tokens and drifts.
export type Message =
  | { type: "finding"; finding: Finding }
  | { type: "question"; text: string }
  | { type: "dispute"; findingId: string; reason: string };

export type BoardEntry = Message & { id: string; from: string; at: number };

export const ReviewSchema = z.object({
  verdicts: z.array(
    z.object({
      findingId: z.string(),
      verdict: z.enum(["supported", "unsupported", "contradicted"]),
      note: z.string(),
    }),
  ),
  gaps: z.array(z.string()).describe("Up to 3 important open questions still unanswered"),
});
export type Review = z.infer<typeof ReviewSchema>;

// Event protocol streamed to the UI. Keep in sync with docs/ARCHITECTURE.md §3.
export type Phase = "planning" | "researching" | "critiquing" | "synthesizing";

export type ToolCallSummary = { name: string; input: string; result: string };

export type Citation = { n: number; findingId: string; claim: string; url: string };

export type RunStatus = "done" | "failed" | "cancelled";

export type HiveEvent =
  | { type: "phase"; phase: Phase; round: number }
  | { type: "plan"; questions: SubQuestion[] }
  | { type: "agent_spawned"; agent: AgentSpec; round: number }
  | {
      type: "agent_step";
      agentId: string;
      step: number;
      toolCalls: ToolCallSummary[];
      text?: string;
      costUsd: number;
    }
  | { type: "agent_done"; agentId: string; ok: boolean; summary?: string; error?: string; costUsd: number }
  | { type: "board"; entry: BoardEntry }
  | { type: "review"; round: number; review: Review }
  | { type: "budget"; spentUsd: number; agentsSpawned: number; searches: number }
  | { type: "report"; markdown: string; citations: Citation[] }
  | { type: "run_end"; status: RunStatus; error?: string };
