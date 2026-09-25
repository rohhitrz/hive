import { Badge } from "@/components/ui/badge";
import { sourceDomain } from "@/lib/run-state/labels";
import type { AgentFinding } from "@/lib/run-state/selectors";
import { safeHref } from "@/lib/safe-href";

export function AgentFindings({ findings }: { findings: AgentFinding[] }) {
  if (findings.length === 0) return <p className="text-muted-foreground">No findings posted.</p>;
  return (
    <ul className="space-y-2">
      {findings.map(({ id, finding, dispute }) => (
        <li key={id} className="space-y-1 rounded border border-border p-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{id}</span>
            <Badge tone={finding.confidence === "high" ? "ok" : finding.confidence === "medium" ? "warn" : "bad"}>{finding.confidence}</Badge>
            {dispute !== undefined ? <Badge tone="bad">disputed</Badge> : <Badge tone="ok">kept</Badge>}
          </div>
          <p className="leading-snug">{finding.claim}</p>
          <a href={safeHref(finding.sourceUrl)} target="_blank" rel="noreferrer noopener" className="text-[11px] text-sky-400 hover:underline">
            {sourceDomain(finding.sourceUrl)}
          </a>
          {dispute !== undefined && <p className="border-l-2 border-red-500/60 pl-2 text-[11px] text-red-200/80">{dispute}</p>}
        </li>
      ))}
    </ul>
  );
}
