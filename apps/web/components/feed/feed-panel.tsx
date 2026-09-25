"use client";

import { useState } from "react";
import type { RunState } from "@/lib/run-state/reducer";
import { cn } from "@/lib/utils";
import { BoardTab } from "./board-tab";
import { DisputesTab } from "./disputes-tab";

type Tab = "board" | "disputes" | "report";

export function FeedPanel({ state }: { state: RunState }) {
  const [tab, setTab] = useState<Tab>("board");
  const disputeCount = Object.keys(state.disputes).length;
  const reportReady = !!state.report;

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "board", label: `Board ${state.board.length}` },
    { id: "disputes", label: `Disputes ${disputeCount}` },
    { id: "report", label: "Report", disabled: !reportReady },
  ];

  return (
    <aside className="flex min-h-0 w-[420px] shrink-0 flex-col border-l border-border bg-card/40">
      <div role="tablist" className="flex shrink-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            disabled={t.disabled}
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 border-transparent px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground",
              tab === t.id && "border-primary text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "board" && <BoardTab state={state} />}
      {tab === "disputes" && <DisputesTab state={state} />}
      {tab === "report" && (
        <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-4 leading-relaxed">
          {state.report?.markdown ?? "The report appears when the run finishes."}
        </div>
      )}
    </aside>
  );
}
