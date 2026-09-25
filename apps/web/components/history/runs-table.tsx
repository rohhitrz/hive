"use client";

import { useRouter } from "next/navigation";
import { RunStatusBadge } from "@/components/run-status-badge";
import type { RunStatus } from "@/lib/db/schema";
import { formatDate, formatDuration, formatUsd } from "@/lib/format";

export type RunRow = {
  id: string;
  goal: string;
  status: RunStatus;
  agentCount: number;
  maxAgents: number;
  spentUsd: number;
  createdAt: string;
  finishedAt: string | null;
};

export function RunsTable({ runs }: { runs: RunRow[] }) {
  const router = useRouter();
  if (runs.length === 0) return <p className="rounded-md border border-dashed border-border p-6 text-muted-foreground">No runs yet.</p>;

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <th className="w-full py-2 pr-4 font-normal">Goal</th>
          <th className="px-3 py-2 font-normal">Status</th>
          <th className="px-3 py-2 text-right font-normal">Agents</th>
          <th className="px-3 py-2 text-right font-normal">Cost</th>
          <th className="px-3 py-2 text-right font-normal">Duration</th>
          <th className="py-2 pl-3 text-right font-normal">Created</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => {
          const href = `/runs/${r.id}`;
          const duration = r.finishedAt ? formatDuration(Date.parse(r.finishedAt) - Date.parse(r.createdAt)) : r.status === "running" ? "live" : "–";
          return (
            <tr
              key={r.id}
              onClick={() => router.push(href)}
              className="cursor-pointer border-b border-border/60 hover:bg-muted/50"
              title={r.status === "running" ? "Open live run" : "Open replay"}
            >
              <td className="max-w-0 py-2 pr-4">
                {/* Real link for keyboard, middle-click and screen readers. */}
                <a href={href} onClick={(e) => e.stopPropagation()} className="block truncate hover:text-primary" title={r.goal}>
                  {r.goal}
                </a>
              </td>
              <td className="px-3 py-2">
                <RunStatusBadge status={r.status} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.agentCount}
                <span className="text-muted-foreground">/{r.maxAgents}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatUsd(r.spentUsd)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{duration}</td>
              <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-muted-foreground">{formatDate(r.createdAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
