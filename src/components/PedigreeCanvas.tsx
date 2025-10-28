// src/components/PedigreeCanvas.tsx
import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { Select, MenuItem } from "@mui/material";

import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";
import { usePedigreeGraph } from "../hooks/usePedigreeGraph";
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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        if (node.type === "family" && node.data?.individual) {
          onSelectIndividual?.(node.data.individual);
        }
      }}
      fitView
      fitViewOptions={fitViewOptions}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      zoomOnScroll
      zoomOnPinch
      panOnScroll
      selectionOnDrag
      selectionMode={SelectionMode.Full}
      nodeTypes={nodeTypes}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls showInteractive>
        {/* Same dropdown you currently render inside Controls */}
        <Select
          size="small"
          value={maxGenerations}
          onChange={(e) => setMaxGenerations(Number(e.target.value))}
          sx={{
            ml: 1,
            background: "white",
            ".MuiSelect-select": { py: 0.5, px: 1, fontSize: "0.75rem" },
          }}
        >
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
            <MenuItem key={g} value={g}>
              {g}
            </MenuItem>
          ))}
        </Select>
      </Controls>
    </ReactFlow>
  );
}