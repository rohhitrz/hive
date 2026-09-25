"use client";

import { FeedPanel } from "@/components/feed/feed-panel";
import { StatusBar } from "@/components/status-bar/status-bar";
import { useRunStream } from "@/hooks/use-run-stream";
import { AgentList } from "./agent-list";
import type { RunInfo } from "./run-info";

export function RunView({ run }: { run: RunInfo }) {
  const { state: streamed, status } = useRunStream(run.id);
  // "interrupted" never arrives as an event: it comes from the runs row.
  const state = run.status === "interrupted" ? { ...streamed, phase: "interrupted" as const } : streamed;

  return (
    <div className="flex h-screen flex-col">
      <StatusBar run={run} state={state} stream={status} />
      {state.error && <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">Run failed: {state.error}</div>}
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <AgentList state={state} />
        </main>
        <FeedPanel state={state} />
      </div>
    </div>
  );
}
