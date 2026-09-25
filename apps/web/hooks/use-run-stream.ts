"use client";

import { useEffect, useReducer, useState } from "react";
import type { RunEvent } from "@/lib/runner";
import { initialRunState, runStateReducer, type RunState } from "@/lib/run-state/reducer";

export type StreamStatus = "connecting" | "open" | "reconnecting" | "closed";

/**
 * Live run state. EventSource resumes with Last-Event-ID on its own; we close it once the run ends
 * (or the server ends the stream for a run that is no longer running) so it doesn't reconnect forever.
 */
export function useRunStream(runId: string): { state: RunState; status: StreamStatus } {
  const [state, dispatch] = useReducer(runStateReducer, initialRunState);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  useEffect(() => {
    dispatch({ type: "reset" });
    setStatus("connecting");
    let ended = false;
    const es = new EventSource(`/api/runs/${runId}/events`);

    es.onopen = () => setStatus("open");
    es.onmessage = (msg: MessageEvent<string>) => {
      let envelope: RunEvent;
      try {
        envelope = JSON.parse(msg.data) as RunEvent;
      } catch {
        return;
      }
      dispatch({ type: "events", events: [envelope] });
      if (envelope.event?.type === "run_end") {
        ended = true;
        es.close();
        setStatus("closed");
      }
    };
    es.onerror = () => {
      if (ended) return;
      // The server closes the stream when a run is finished or interrupted. Stop if so; else let it retry.
      void fetch(`/api/runs/${runId}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ status?: string }>) : { status: "missing" }))
        .then((run) => {
          if (run.status !== "running") {
            ended = true;
            es.close();
            setStatus("closed");
          } else if (es.readyState !== EventSource.CLOSED) {
            setStatus("reconnecting");
          }
        })
        .catch(() => setStatus("reconnecting"));
    };

    return () => {
      ended = true;
      es.close();
    };
  }, [runId]);

  return { state, status };
}
