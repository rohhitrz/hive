import type { BoardEntry } from "@hive/core";
import { Badge } from "@/components/ui/badge";
import { sourceDomain } from "@/lib/run-state/labels";
import { cn } from "@/lib/utils";
import { safeHref } from "@/lib/safe-href";

const CONFIDENCE_TONE = { low: "bad", medium: "warn", high: "ok" } as const;

export function BoardEntryRow({ entry, agentName, disputed }: { entry: BoardEntry; agentName: string; disputed?: string }) {
  if (entry.type === "finding") {
    const f = entry.finding;
    return (
      <li className={cn("space-y-1 px-3 py-2", disputed && "bg-red-500/5")}>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-foreground/60">{entry.id}</span>
          <span className="truncate">{agentName}</span>
          <Badge tone={CONFIDENCE_TONE[f.confidence] ?? "neutral"}>{f.confidence}</Badge>
          {disputed && <Badge tone="bad">disputed</Badge>}
        </div>
        <p className={cn("leading-snug", disputed && "text-muted-foreground line-through decoration-red-500/60")}>{f.claim}</p>
        <a href={safeHref(f.sourceUrl)} target="_blank" rel="noreferrer noopener" className="text-[11px] text-sky-400 hover:underline">
          {sourceDomain(f.sourceUrl)}
        </a>
      </li>
    );
  }
  if (entry.type === "dispute") {
    return (
      <li className="space-y-1 border-l-2 border-red-500/60 px-3 py-2">
        <div className="text-[10px] text-red-300">
          critic disputes <span className="text-foreground/70">{entry.findingId}</span>
        </div>
        <p className="leading-snug text-muted-foreground">{entry.reason}</p>
      </li>
    );
  }
  return (
    <li className="space-y-1 px-3 py-2">
      <div className="text-[10px] text-violet-300">question · {agentName}</div>
      <p className="leading-snug">{entry.text}</p>
    </li>
  );
}
