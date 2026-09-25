"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { citationMap, linkCitations } from "@/lib/report/citations";
import type { RunState } from "@/lib/run-state/reducer";
import { CopyMarkdownButton } from "./copy-markdown-button";
import { DisputedClaims } from "./disputed-claims";
import { markdownComponents } from "./markdown-components";

export function ReportView({ state }: { state: RunState }) {
  const report = state.report;
  const components = useMemo(() => markdownComponents(citationMap(report?.citations ?? [])), [report?.citations]);
  const linked = useMemo(() => (report ? linkCitations(report.markdown) : ""), [report]);

  if (!report) return <p className="p-4 text-muted-foreground">The report appears when the run finishes.</p>;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
        <span className="text-[11px] text-muted-foreground">
          {report.citations.length} citations · {Object.keys(state.disputes).length} disputed excluded
        </span>
        <CopyMarkdownButton markdown={report.markdown} />
      </div>
      <article className="px-4 py-3 text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {linked}
        </ReactMarkdown>
        <DisputedClaims state={state} />
      </article>
    </div>
  );
}
