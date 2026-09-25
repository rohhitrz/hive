"use client";

import { useStickToBottom } from "@/hooks/use-stick-to-bottom";
import { formatUsd } from "@/lib/format";
import type { AgentStep } from "@/lib/run-state/reducer";
import { isToolError } from "@/lib/run-state/selectors";
import { cn } from "@/lib/utils";

export function StepTimeline({ steps, running }: { steps: AgentStep[]; running: boolean }) {
  const { ref, onScroll } = useStickToBottom<HTMLOListElement>(steps.length);

  if (steps.length === 0) {
    return <p className="text-muted-foreground">{running ? "Waiting for the first step…" : "No steps recorded."}</p>;
  }
  return (
    <ol ref={ref} onScroll={onScroll} className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
      {steps.map((s, i) => (
        <li key={`${s.step}-${i}`} className="rounded border border-border bg-background/60 p-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>step {s.step}</span>
            <span className="tabular-nums">{formatUsd(s.costUsd, 4)}</span>
          </div>
          {s.toolCalls.length === 0 && !s.text && <p className="text-[11px] text-muted-foreground">(no tool calls)</p>}
          <ul className="space-y-1.5">
            {s.toolCalls.map((c, j) => (
              <li key={j} className="text-[11px]">
                <span className={cn("font-medium", isToolError(c.result) ? "text-red-400" : "text-sky-300")}>{c.name}</span>
                <span className="text-muted-foreground"> ← </span>
                <span className="break-all text-foreground/80">{c.input}</span>
                <div className={cn("mt-0.5 break-all border-l border-border pl-2 text-muted-foreground", isToolError(c.result) && "border-red-500/60 text-red-300")}>
                  → {c.result}
                </div>
              </li>
            ))}
          </ul>
          {s.text && <p className="mt-1.5 whitespace-pre-wrap text-[11px] text-foreground/90">{s.text}</p>}
        </li>
      ))}
      {running && <li className="animate-pulse px-2 text-[11px] text-sky-300">working…</li>}
    </ol>
  );
}
