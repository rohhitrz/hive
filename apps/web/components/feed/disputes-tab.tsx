import type { RunState } from "@/lib/run-state/reducer";
import { sourceDomain } from "@/lib/run-state/labels";
import { safeHref } from "@/lib/safe-href";

export function DisputesTab({ state }: { state: RunState }) {
  const disputed = state.board.flatMap((e) => (e.type === "finding" && state.disputes[e.id] !== undefined ? [e] : []));
  if (disputed.length === 0) return <p className="p-4 text-muted-foreground">No disputed findings.</p>;

  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      {disputed.map((e) => (
        <li key={e.id} className="space-y-1 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">
            {e.id} · {state.agents[e.from]?.spec.role ?? e.from} ·{" "}
            <a href={safeHref(e.finding.sourceUrl)} target="_blank" rel="noreferrer noopener" className="text-sky-400 hover:underline">
              {sourceDomain(e.finding.sourceUrl)}
            </a>
          </div>
          <p className="leading-snug">{e.finding.claim}</p>
          <p className="border-l-2 border-red-500/60 pl-2 leading-snug text-red-200/80">{state.disputes[e.id]}</p>
        </li>
      ))}
    </ul>
  );
}
