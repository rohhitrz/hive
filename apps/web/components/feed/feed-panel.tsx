"use client";

import { useState } from "react";
import type { RunState } from "@/lib/run-state/reducer";
import { cn } from "@/lib/utils";
import { BoardTab } from "./board-tab";
import { DisputesTab } from "./disputes-tab";
import { ReportView } from "@/components/report/report-view";

type Tab = "board" | "disputes" | "report";

export function FeedPanel({ state }: { state: RunState }) {
  const [tab, setTab] = useState<Tab>("board");
  const [wide, setWide] = useState(false);
  const disputeCount = Object.keys(state.disputes).length;
  const reportReady = !!state.report;

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "board", label: `Board ${state.board.length}` },
    { id: "disputes", label: `Disputes ${disputeCount}` },
    { id: "report", label: "Report", disabled: !reportReady },
  ];

  return (
    <aside className={cn("flex min-h-0 shrink-0 flex-col border-l border-border bg-card/40 transition-[width]", tab === "report" && wide ? "w-[min(760px,60vw)]" : "w-[420px]")}>
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
        {tab === "report" && (
          <button onClick={() => setWide((w) => !w)} className="ml-auto px-3 text-[11px] text-muted-foreground hover:text-foreground" title={wide ? "Narrow" : "Widen"}>
            {wide ? "⇥ narrow" : "⇤ widen"}
          </button>
        )}
      </div>
      {tab === "board" && <BoardTab state={state} />}
      {tab === "disputes" && <DisputesTab state={state} />}
      {tab === "report" && <ReportView state={state} />}
    </aside>
  );
}
