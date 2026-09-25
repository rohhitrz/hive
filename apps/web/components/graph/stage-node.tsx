"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, type HiveFlowNode } from "./node-data";

const ICON = { lead: "⬡", critic: "⚖", synth: "✎", agent: "" } as const;

/** Lead, critic and synthesizer nodes. */
function StageNodeImpl({ data }: NodeProps<HiveFlowNode>) {
  const n = data.node;
  return (
    <div className={cn("flex h-16 w-[220px] items-center gap-2.5 rounded-md border bg-muted/60 px-3 text-[11px]", STATUS_STYLES[n.status], n.status === "active" && "hive-pulse")}>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <span className={cn("text-lg", n.kind === "critic" ? "text-violet-300" : "text-primary")}>{ICON[n.kind]}</span>
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{n.label}</div>
        <div className="text-muted-foreground">
          {n.status === "active" ? "working…" : n.status === "failed" ? "failed" : n.status === "stopped" ? "stopped" : n.kind === "critic" ? `${n.disputes} disputes` : "done"}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {n.kind === "critic" && <Handle type="source" id="dispute-out" position={Position.Top} className="!opacity-0" />}
    </div>
  );
}

export const StageNode = memo(StageNodeImpl);
