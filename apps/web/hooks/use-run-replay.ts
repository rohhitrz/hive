"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { RunEvent } from "@/lib/runner";
import { initialRunState, runStateReducer, type RunState } from "@/lib/run-state/reducer";
import { replayDelays, type ReplaySpeed } from "@/lib/run-state/replay";

export type ReplayStatus = "loading" | "playing" | "done" | "error";

/**
 * Replays a finished run from events.json with the original timing ÷ speed. Speed can change
 * mid-replay (remaining events are rescheduled); bumping `restartToken` plays again from the start.
 */
export function useRunReplay(
  runId: string,
  speed: ReplaySpeed,
  restartToken = 0,
): { state: RunState; status: ReplayStatus; progress: number; total: number } {
  const [state, dispatch] = useReducer(runStateReducer, initialRunState);
  const [events, setEvents] = useState<RunEvent[] | null>(null);
  const [status, setStatus] = useState<ReplayStatus>("loading");
  const [progress, setProgress] = useState(0);
  const cursor = useRef(0);
  const lastRestart = useRef(restartToken);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setStatus("loading");
    fetch(`/api/runs/${runId}/events.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RunEvent[]>;
      })
      .then((data) => {
        if (cancelled) return;
        dispatch({ type: "reset" });
        cursor.current = 0;
        setProgress(0);
        setEvents(data);
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    if (!events) return;
    if (lastRestart.current !== restartToken) {
      lastRestart.current = restartToken;
      dispatch({ type: "reset" });
      cursor.current = 0;
      setProgress(0);
    }
    const remaining = events.slice(cursor.current);
    if (remaining.length === 0) {
      setStatus("done");
      return;
    }
    if (speed === "instant") {
      dispatch({ type: "events", events: remaining });
      cursor.current = events.length;
      setProgress(events.length);
      setStatus("done");
      return;
    }

    setStatus("playing");
    const delays = replayDelays(events, speed);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = () => {
      const event = events[cursor.current];
      if (!event) {
        setStatus("done");
        return;
      }
      dispatch({ type: "events", events: [event] });
      cursor.current += 1;
      setProgress(cursor.current);
      if (cursor.current < events.length) timer = setTimeout(step, delays[cursor.current]);
      else setStatus("done");
    };
    timer = setTimeout(step, cursor.current === 0 ? 0 : delays[cursor.current]);
    return () => clearTimeout(timer);
  }, [events, speed, restartToken]);

  return { state, status, progress, total: events?.length ?? 0 };
}
