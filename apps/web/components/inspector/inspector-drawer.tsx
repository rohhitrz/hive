"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import type { AgentState } from "@/lib/run-state/reducer";
import type { AgentFinding } from "@/lib/run-state/selectors";
import { AgentFindings } from "./agent-findings";
import { InspectorSection } from "./inspector-section";
import { StepTimeline } from "./step-timeline";

const TONE = { researching: "live", done: "ok", failed: "bad" } as const;

type Props = { agent: AgentState; findings: AgentFinding[]; runEnded: boolean; onClose: () => void };

export function InspectorDrawer({ agent, findings, runEnded, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { spec } = agent;
  const running = agent.status === "researching" && !runEnded;

  return (
    <aside
      role="dialog"
      aria-label={`Agent ${spec.role}`}
      className="absolute inset-y-0 right-0 z-20 flex w-[480px] max-w-full flex-col border-l border-border bg-card shadow-2xl hive-slide-in"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-border p-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{spec.role}</h2>
            <Badge tone={running ? "live" : TONE[agent.status]}>{running ? "researching" : agent.status === "researching" ? "stopped" : agent.status}</Badge>
          </div>
          <div className="flex gap-3 text-[11px] tabular-nums text-muted-foreground">
            <span>round {agent.round}</span>
            <span>
              {agent.steps.length}/{spec.maxSteps} steps
            </span>
            <span>{findings.length} findings</span>
            <span className="text-foreground">{formatUsd(agent.costUsd, 4)}</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close inspector" className="rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <InspectorSection title="Objective">
          <p className="leading-snug">{spec.objective}</p>
        </InspectorSection>

        <details className="group">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Generated system prompt
          </summary>
          <pre className="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-background/60 p-2 text-[11px] leading-snug text-foreground/85">
            {spec.systemPrompt}
          </pre>
        </details>

        {agent.error && (
          <InspectorSection title="Error">
            <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-red-300">{agent.error}</p>
          </InspectorSection>
        )}

        <InspectorSection title={`Steps (${agent.steps.length})`}>
          <StepTimeline steps={agent.steps} running={running} />
        </InspectorSection>

        <InspectorSection title={`Findings (${findings.length})`}>
          <AgentFindings findings={findings} />
        </InspectorSection>

        {agent.summary && (
          <InspectorSection title="Summary">
            <p className="whitespace-pre-wrap leading-snug text-foreground/90">{agent.summary}</p>
          </InspectorSection>
        )}
      </div>
    </aside>
  );
}
