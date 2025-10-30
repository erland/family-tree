// src/components/PedigreeCanvas.tsx
import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";

import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";
import { usePedigreeGraph } from "./usePedigreeGraph";
import { Individual } from "@core/domain";

const nodeTypes = {
  family: FamilyNode,
  marriage: MarriageNode,
};

export type PedigreeCanvasProps = {
  rootId?: string;
  mode: "descendants" | "ancestors";
  maxGenerations: number;
  setMaxGenerations: (g: number) => void;
  onSelectIndividual?: (ind: Individual) => void;
};

export function PedigreeCanvas({
  rootId,
  mode,
  maxGenerations,
  setMaxGenerations,
  onSelectIndividual,
}: PedigreeCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    fitViewOptions,
  } = usePedigreeGraph({ rootId, mode, maxGenerations });

  // Force smooth edges globally
  const smoothEdges = edges.map((e) => ({ ...e, type: "smoothstep" as const }));

  return (
    <ReactFlow
      style={{ width: "100%", height: "100%" }}
      nodes={nodes}
      edges={smoothEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        if (node.type === "family" && node.data?.individual) {
          onSelectIndividual?.(node.data.individual);
        }
      }}
      fitView
      fitViewOptions={fitViewOptions}
      onInit={(inst) => requestAnimationFrame(() => inst.fitView(fitViewOptions))}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      zoomOnScroll
      zoomOnPinch
      panOnScroll
      selectionOnDrag
      selectionMode={SelectionMode.Full}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={{ type: "smoothstep" }}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls showInteractive />
    </ReactFlow>
  );
}