"use client";

import { Badge } from "@/components/ui/badge";
import type { ReplayStatus } from "@/hooks/use-run-replay";
import type { ReplaySpeed } from "@/lib/run-state/replay";
import { cn } from "@/lib/utils";

const SPEEDS: { value: ReplaySpeed; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 4, label: "4×" },
  { value: "instant", label: "instant" },
];

type Props = { speed: ReplaySpeed; status: ReplayStatus; progress: number; total: number; onSpeed: (s: ReplaySpeed) => void };

export function ReplayControls({ speed, status, progress, total, onSpeed }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Badge tone="live">Replay</Badge>
      <div role="radiogroup" aria-label="Replay speed" className="flex overflow-hidden rounded border border-border">
        {SPEEDS.map((s) => (
          <button
            key={s.label}
            role="radio"
            aria-checked={speed === s.value}
            onClick={() => onSpeed(s.value)}
            className={cn("px-2 py-0.5 text-[11px] hover:bg-muted", speed === s.value && "bg-primary/15 text-primary")}
            title={status === "done" && s.value !== "instant" ? `Replay from the start at ${s.label}` : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>
      <span className="w-16 tabular-nums text-muted-foreground" aria-live="polite">
        {status === "loading" ? "loading…" : status === "error" ? "error" : `${progress}/${total}`}
      </span>
    </div>
  );
}
