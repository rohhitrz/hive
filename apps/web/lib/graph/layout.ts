import dagre from "@dagrejs/dagre";
import type { GraphEdge, GraphNode } from "./build-graph";

export const NODE_SIZE = { width: 220, height: 64 } as const;

export type Positions = Record<string, { x: number; y: number }>;

/** Top-to-bottom dagre layout. Dispute edges don't affect ranks (they point back up). */
export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): Positions {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 24, ranksep: 56, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { ...NODE_SIZE });
  for (const e of edges) if (e.kind === "flow") g.setEdge(e.source, e.target);
  dagre.layout(g);

  const positions: Positions = {};
  for (const n of nodes) {
    const p = g.node(n.id);
    // dagre gives centers; React Flow wants top-left corners.
    positions[n.id] = { x: (p?.x ?? 0) - NODE_SIZE.width / 2, y: (p?.y ?? 0) - NODE_SIZE.height / 2 };
  }
  return positions;
}
