"use client";

import { useState } from "react";
import { ReplayControls } from "@/components/status-bar/replay-controls";
import { StatusBar } from "@/components/status-bar/status-bar";
import { useRunReplay } from "@/hooks/use-run-replay";
import type { ReplaySpeed } from "@/lib/run-state/replay";
import type { RunInfo } from "./run-info";
import { RunLayout } from "./run-layout";

export function ReplayRun({ run }: { run: RunInfo }) {
  const [speed, setSpeed] = useState<ReplaySpeed>("instant");
  const [restart, setRestart] = useState(0);
  const replay = useRunReplay(run.id, speed, restart);

  // "interrupted" never arrives as an event: it comes from the runs row once the replay is over.
  const state = run.status === "interrupted" && replay.status === "done" ? { ...replay.state, phase: "interrupted" as const } : replay.state;
  // The clock follows replay time.
  const startedAt = state.startedAt ?? run.createdAt;
  const endedAt = state.lastEventAt ?? startedAt;

  function changeSpeed(next: ReplaySpeed) {
    // After the replay finished, picking a timed speed plays it again from the start.
    if (replay.status === "done" && next !== "instant") setRestart((r) => r + 1);
    setSpeed(next);
  }

  return (
    <RunLayout
      state={state}
      statusBar={
        <StatusBar run={run} state={state} clock={{ startedAt, endedAt }}>
          <ReplayControls speed={speed} status={replay.status} progress={replay.progress} total={replay.total} onSpeed={changeSpeed} />
        </StatusBar>
      }
    />
  );
}
