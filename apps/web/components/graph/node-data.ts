import type { Node } from "@xyflow/react";
import type { GraphNode } from "@/lib/graph/build-graph";

export type HiveNodeData = { node: GraphNode; selected: boolean };
export type HiveFlowNode = Node<HiveNodeData>;

export const STATUS_STYLES: Record<GraphNode["status"], string> = {
  idle: "border-border",
  active: "border-sky-400/70 shadow-[0_0_0_3px_rgba(56,189,248,0.15)]",
  spawning: "border-dashed border-sky-400/60",
  researching: "border-sky-400/80 hive-pulse",
  done: "border-emerald-500/50",
  failed: "border-red-500/70 bg-red-500/5",
};
