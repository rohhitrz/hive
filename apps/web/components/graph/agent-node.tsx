"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, type HiveFlowNode } from "./node-data";

const STATUS_TEXT = { spawning: "spawning", researching: "researching", done: "done", failed: "failed", stopped: "stopped", idle: "", active: "" } as const;

function AgentNodeImpl({ data }: NodeProps<HiveFlowNode>) {
  const n = data.node;
  if (n.kind !== "agent") return null;
  return (
    <div
      className={cn(
        "flex h-16 w-[220px] cursor-pointer flex-col justify-between rounded-md border bg-card px-2.5 py-1.5 text-[11px] transition-colors hover:bg-muted",
        STATUS_STYLES[n.status],
        data.selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground" title={n.label}>
          {n.label}
        </span>
        <span className={cn("shrink-0 text-[9px] uppercase tracking-wider", n.status === "failed" ? "text-red-400" : n.status === "stopped" ? "text-amber-300" : n.status === "done" ? "text-emerald-400" : "text-sky-300")}>
          {STATUS_TEXT[n.status]}
        </span>
      </div>
      <div className="flex gap-3 tabular-nums text-muted-foreground">
        <span>R{n.round}</span>
        <span>{n.findings} findings</span>
        <span className="ml-auto">{formatUsd(n.costUsd)}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" id="dispute-in" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeImpl);
