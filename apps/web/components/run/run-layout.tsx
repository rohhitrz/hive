"use client";

import { useCallback, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { FeedPanel } from "@/components/feed/feed-panel";
import { AgentGraph } from "@/components/graph/agent-graph";
import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { isTerminal } from "@/lib/run-state/labels";
import type { RunState } from "@/lib/run-state/reducer";
import { agentFindings } from "@/lib/run-state/selectors";
import { RunBanner } from "./run-banner";

/** Shared body for live and replayed runs: graph, feed, inspector. */
export function RunLayout({ state, statusBar }: { state: RunState; statusBar: React.ReactNode }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const selected = selectedAgentId ? state.agents[selectedAgentId] : undefined;
  const closeInspector = useCallback(() => setSelectedAgentId(undefined), []);

  return (
    <div className="flex h-screen flex-col">
      {statusBar}
      <RunBanner state={state} />
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <ErrorBoundary label="agent graph">
            <AgentGraph state={state} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onClearSelection={closeInspector} />
          </ErrorBoundary>
        </main>
        <div className="relative flex min-h-0">
          <ErrorBoundary label="feed">
            <FeedPanel state={state} />
          </ErrorBoundary>
          {selected && (
            <ErrorBoundary key={selected.spec.id} label="inspector">
              <InspectorDrawer agent={selected} findings={agentFindings(state, selected.spec.id)} runEnded={isTerminal(state.phase)} onClose={closeInspector} />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
