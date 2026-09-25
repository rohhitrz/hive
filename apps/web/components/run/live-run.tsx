"use client";

import { CancelButton } from "@/components/status-bar/cancel-button";
import { StatusBar } from "@/components/status-bar/status-bar";
import { useRunStream } from "@/hooks/use-run-stream";
import { isTerminal } from "@/lib/run-state/labels";
import type { RunInfo } from "./run-info";
import { RunLayout } from "./run-layout";

export function LiveRun({ run }: { run: RunInfo }) {
  const { state, status } = useRunStream(run.id);
  const finished = isTerminal(state.phase);
  const endedAt = finished ? (run.finishedAt ?? state.lastEventAt ?? run.createdAt) : undefined;

  return (
    <RunLayout
      state={state}
      statusBar={
        <StatusBar run={run} state={state} clock={{ startedAt: run.createdAt, endedAt }}>
          {status === "reconnecting" && <span className="text-amber-300">reconnecting…</span>}
          {!finished && <CancelButton runId={run.id} />}
        </StatusBar>
      }
    />
  );
}
