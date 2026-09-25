"use client";

import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/lib/format";

/** Ticks while running; frozen at `endedAt` once finished. */
export function Elapsed({ startedAt, endedAt }: { startedAt: string; endedAt?: string }) {
  const now = useNow(!endedAt);
  const end = endedAt ? Date.parse(endedAt) : now;
  return <span className="tabular-nums">{end === null ? "–" : formatDuration(end - Date.parse(startedAt))}</span>;
}
