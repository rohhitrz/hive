import { generateText } from "ai";
import { emitBudget, type RunContext } from "./context.js";
import type { Citation } from "./types.js";

const SYNTH_TIMEOUT_MS = 120_000;

/** Rewrites "[1, 3]" as "[1][3]", drops markers that don't match a finding, and returns the cited ones. */
export function resolveCitations(markdown: string, numbered: Omit<Citation, "n">[]) {
  const used = new Set<number>();
  const out = markdown.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_m, group: string) =>
    group
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n >= 1 && n <= numbered.length)
      .map((n) => {
        used.add(n);
        return `[${n}]`;
      })
      .join(""),
  );
  const citations = [...used]
    .sort((a, b) => a - b)
    .map((n) => ({ n, ...numbered[n - 1]! }));
  return { markdown: out, citations };
}

/**
 * Writes the report from undisputed findings. Uses its own timeout rather than the run signal,
 * so a cancelled run can still produce a report from partial results.
 */
export async function synthesize(ctx: RunContext): Promise<{ markdown: string; citations: Citation[] }> {
  const disputed = new Set(ctx.board.list("dispute").map((d) => d.findingId));
  const kept = ctx.board.list("finding").filter((e) => !disputed.has(e.id));
  const sources = kept.map((e, i) => `[${i + 1}] ${e.finding.claim} (${e.finding.sourceUrl})`).join("\n");

  const { text, usage } = await generateText({
    model: ctx.models.lead,
    system:
      "Write a decision-ready research report in markdown. Use only the numbered findings given; " +
      "cite them inline like [2]. End with a Sources list and a section on open questions.",
    prompt: `Goal: ${ctx.goal}\n\nVerified findings:\n${sources || "(none)"}`,
    abortSignal: AbortSignal.timeout(SYNTH_TIMEOUT_MS),
  });
  ctx.budget.charge(usage, "lead");
  emitBudget(ctx);

  return resolveCitations(
    text,
    kept.map((e) => ({ findingId: e.id, claim: e.finding.claim, url: e.finding.sourceUrl })),
  );
}
