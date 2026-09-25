"use client";

import { Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { buildGraph, topologyKey } from "@/lib/graph/build-graph";
import { layoutGraph } from "@/lib/graph/layout";
import type { RunState } from "@/lib/run-state/reducer";
import { AgentNode } from "./agent-node";
import type { HiveFlowNode } from "./node-data";
import { StageNode } from "./stage-node";

const nodeTypes = { agent: AgentNode, stage: StageNode };

type Props = { state: RunState; selectedAgentId?: string; onSelectAgent: (id: string) => void; onClearSelection: () => void };

function Graph({ state, selectedAgentId, onSelectAgent, onClearSelection }: Props) {
  const graph = useMemo(() => buildGraph(state), [state]);
  const key = topologyKey(graph.nodes);
  // Re-run dagre only when nodes are added (§6), not on every event.
  const positions = useMemo(() => layoutGraph(graph.nodes, graph.edges), [key]);
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  // Refit once new nodes have been measured.
  useEffect(() => {
    if (initialized) void fitView({ padding: 0.15, duration: 250, maxZoom: 1.1 });
  }, [key, initialized, fitView]);

  const nodes: HiveFlowNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.kind === "agent" ? "agent" : "stage",
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: { node: n, selected: n.id === selectedAgentId },
    draggable: false,
    connectable: false,
  }));

  const edges: Edge[] = graph.edges.map((e) =>
    e.kind === "dispute"
      ? {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "dispute-out",
          targetHandle: "dispute-in",
          type: "default",
          style: { stroke: "#ef4444", strokeDasharray: "5 4", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
          zIndex: 1,
        }
      : {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          style: { stroke: "rgba(255,255,255,0.25)", strokeWidth: 1.25 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.35)" },
        },
  );

  const onNodeClick: NodeMouseHandler<HiveFlowNode> = (_e, node) => {
    if (node.data.node.kind === "agent") onSelectAgent(node.id);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onClearSelection}
      colorMode="dark"
      fitView
      minZoom={0.2}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="rgba(255,255,255,0.06)" />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}

export function AgentGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
