"use client";

import { useCallback, useState } from "react";
import { FeedPanel } from "@/components/feed/feed-panel";
import { AgentGraph } from "@/components/graph/agent-graph";
import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { isTerminal } from "@/lib/run-state/labels";
import type { RunState } from "@/lib/run-state/reducer";
import { agentFindings } from "@/lib/run-state/selectors";

/** Shared body for live and replayed runs: graph, feed, inspector. */
export function RunLayout({ state, statusBar }: { state: RunState; statusBar: React.ReactNode }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const selected = selectedAgentId ? state.agents[selectedAgentId] : undefined;
  const closeInspector = useCallback(() => setSelectedAgentId(undefined), []);

  return (
    <div className="flex h-screen flex-col">
      {statusBar}
      {state.phase === "failed" && state.error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">Run failed: {state.error}</div>
      )}
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <AgentGraph state={state} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onClearSelection={closeInspector} />
        </main>
        <div className="relative flex min-h-0">
          <FeedPanel state={state} />
          {selected && (
            <InspectorDrawer agent={selected} findings={agentFindings(state, selected.spec.id)} runEnded={isTerminal(state.phase)} onClose={closeInspector} />
          )}
        </div>
      </div>
    </div>
  );
}
