"use client";

import { useStickToBottom } from "@/hooks/use-stick-to-bottom";
import type { RunState } from "@/lib/run-state/reducer";
import { BoardEntryRow } from "./board-entry";

export function BoardTab({ state }: { state: RunState }) {
  const { ref, onScroll, stuck, scrollToBottom } = useStickToBottom<HTMLDivElement>(state.board.length);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto">
        {state.board.length === 0 ? (
          <p className="p-4 text-muted-foreground">Nothing on the board yet. Agents post findings here as they verify them.</p>
        ) : (
          <ul className="divide-y divide-border">
            {state.board.map((entry) => (
              <BoardEntryRow
                key={entry.id}
                entry={entry}
                agentName={state.agents[entry.from]?.spec.role ?? entry.from}
                disputed={entry.type === "finding" ? state.disputes[entry.id] : undefined}
              />
            ))}
          </ul>
        )}
      </div>
      {!stuck && (
        <button onClick={scrollToBottom} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-[11px] shadow hover:bg-muted">
          ↓ Latest
        </button>
      )}
    </div>
  );
}
