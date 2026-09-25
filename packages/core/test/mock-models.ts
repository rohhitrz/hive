import { MockLanguageModelV2 } from "ai/test";
import type { Models, ToolImpls } from "../src/context.js";

type Generate = MockLanguageModelV2["doGenerate"];
type CallOptions = Parameters<Generate>[0];
type Content = Awaited<ReturnType<Generate>>["content"];

const usage = { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 };

function systemText(opts: CallOptions): string {
  const sys = opts.prompt.find((m) => m.role === "system");
  return sys && typeof sys.content === "string" ? sys.content : "";
}

function userText(opts: CallOptions): string {
  return opts.prompt
    .filter((m) => m.role === "user")
    .flatMap((m) => m.content)
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n");
}

async function respond(opts: CallOptions, content: Content, delayMs = 5) {
  await new Promise((r) => setTimeout(r, delayMs));
  if (opts.abortSignal?.aborted) throw new DOMException("aborted", "AbortError");
  const finishReason = content.some((c) => c.type === "tool-call") ? "tool-calls" : "stop";
  return { content, finishReason, usage, warnings: [] } as Awaited<ReturnType<Generate>>;
}

const json = (value: unknown): Content => [{ type: "text", text: JSON.stringify(value) }];

export type Scenario = {
  /** Roles the planner returns. A role containing "broken" makes that agent's search throw. */
  roles: string[];
  /** Gaps returned by the critic in round 1 (none afterwards). */
  gaps?: string[];
  /** Critic disputes the finding with this id. */
  disputeId?: string;
  /** Synthesizer output; defaults to a report citing [1] and [2]. */
  report?: string;
  workerDelayMs?: number;
};

export function mockModels(s: Scenario): Models {
  let critiques = 0;
  const lead = new MockLanguageModelV2({
    doGenerate: async (opts) => {
      const sys = systemText(opts);
      if (sys.includes("You lead a research team")) {
        return respond(opts, json({ subQuestions: s.roles.map((role) => ({ role, question: `What about ${role}?` })) }));
      }
      if (sys.includes("You design specialist research agents")) {
        const role = /Agent to design: ([^:]+):/.exec(userText(opts))?.[1] ?? "agent";
        return respond(opts, json({ role, objective: `Answer for ${role}`, systemPrompt: `You are ${role}.`, maxSteps: 4 }));
      }
      if (sys.includes("skeptical fact-checker")) {
        critiques += 1;
        const verdicts = s.disputeId
          ? [{ findingId: s.disputeId, verdict: "unsupported", note: "evidence does not match claim" }]
          : [];
        return respond(opts, json({ verdicts, gaps: critiques === 1 ? (s.gaps ?? []) : [] }));
      }
      return respond(opts, [{ type: "text", text: s.report ?? "# Report\nMarket is growing [1]. Costs are high [2, 99].\n" }]);
    },
  });

  let callId = 0;
  const worker = new MockLanguageModelV2({
    doGenerate: async (opts) => {
      const broken = systemText(opts).includes("broken");
      const toolTurns = opts.prompt.filter((m) => m.role === "tool").length;
      const call = (toolName: string, input: unknown): Content => [
        { type: "tool-call", toolCallId: `c${++callId}`, toolName, input: JSON.stringify(input) },
      ];
      const delay = s.workerDelayMs ?? 5;
      if (toolTurns === 0) return respond(opts, call("web_search", { query: broken ? "boom" : "market size" }), delay);
      if (toolTurns === 1 && !broken) {
        return respond(
          opts,
          call("post_finding", {
            claim: "The market grew 12% in 2025",
            sourceUrl: "https://example.com/report",
            evidence: "grew 12%",
            confidence: "high",
          }),
          delay,
        );
      }
      return respond(opts, [{ type: "text", text: "Summary: found what I could." }], delay);
    },
  });

  return { lead, worker };
}

export const mockTools: ToolImpls = {
  webSearch: async (query) => {
    if (query === "boom") throw new Error("search exploded");
    return [{ title: "Report", url: "https://example.com/report", snippet: "grew 12%" }];
  },
  readPage: async () => "page text",
};
