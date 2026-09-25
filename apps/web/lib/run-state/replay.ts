import type { RunEvent } from "../runner";

export type ReplaySpeed = 1 | 4 | "instant";

/** Delay (ms) before each event: the original gap between events ÷ speed. */
export function replayDelays(events: RunEvent[], speed: ReplaySpeed): number[] {
  if (speed === "instant") return events.map(() => 0);
  return events.map((e, i) => {
    if (i === 0) return 0;
    const gap = Date.parse(e.at) - Date.parse(events[i - 1]!.at);
    return Number.isFinite(gap) && gap > 0 ? gap / speed : 0;
  });
}
