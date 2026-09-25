import { sourceDomain } from "@/lib/run-state/labels";
import type { RunState } from "@/lib/run-state/reducer";
import { safeHref } from "@/lib/safe-href";

export function DisputedClaims({ state }: { state: RunState }) {
  const disputed = state.board.flatMap((e) => (e.type === "finding" && state.disputes[e.id] !== undefined ? [e] : []));
  if (disputed.length === 0) return null;
  return (
    <details className="mt-6 rounded-md border border-red-500/30 bg-red-500/5">
      <summary className="cursor-pointer px-3 py-2 text-[11px] uppercase tracking-wider text-red-300">
        Disputed claims excluded from the report ({disputed.length})
      </summary>
      <ul className="divide-y divide-border border-t border-red-500/20">
        {disputed.map((e) => (
          <li key={e.id} className="space-y-1 px-3 py-2 text-xs" data-disputed={e.id}>
            <p className="text-muted-foreground line-through decoration-red-500/50">{e.finding.claim}</p>
            <p className="text-red-200/80">{state.disputes[e.id]}</p>
            <a href={safeHref(e.finding.sourceUrl)} target="_blank" rel="noreferrer noopener" className="text-[11px] text-sky-400 hover:underline">
              {sourceDomain(e.finding.sourceUrl)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
