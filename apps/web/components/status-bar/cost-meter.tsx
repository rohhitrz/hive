import { costTone } from "@/lib/run-state/labels";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CostMeter({ spentUsd, budgetUsd }: { spentUsd: number; budgetUsd: number }) {
  const tone = costTone(spentUsd, budgetUsd);
  const pct = budgetUsd > 0 ? Math.min(100, (spentUsd / budgetUsd) * 100) : 0;
  return (
    <div className="flex items-center gap-2" title={`${pct.toFixed(0)}% of budget`}>
      <span className={cn("tabular-nums", tone !== "ok" && "text-amber-300")}>
        {formatUsd(spentUsd)} <span className="text-muted-foreground">/ {formatUsd(budgetUsd, 2)}</span>
      </span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
        <div className={cn("h-full transition-[width] duration-300", tone === "ok" ? "bg-primary" : "bg-amber-400")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
