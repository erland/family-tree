import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  SelectionMode,
  Node,
  Edge,
  FitViewOptions,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Select,
  MenuItem,
} from "@mui/material";

import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { buildGraph } from "../utils/treeLayout";
import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";
import SearchBar from "../components/SearchBar";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog";

const fitViewOptions: FitViewOptions = { padding: 0.2, includeHiddenNodes: true };
const nodeTypes = {
  family: FamilyNode,
  marriage: MarriageNode,
};

function PedigreeInner({
  rootId,
  mode,
  maxGenerations,
  onSelectIndividual,
}: {
  rootId?: string;
  mode: "descendants" | "ancestors";
  maxGenerations: number;
  onSelectIndividual?: (ind: Individual) => void;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const { fitView } = useReactFlow();

  // 🔎 Build graph directly via buildGraph (no manual filtering)
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildGraph(individuals, relationships, {
      rootId,
      mode,
      maxGenerations,
    });
  }, [individuals, relationships, rootId, mode, maxGenerations]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // 1) Apply latest graph to state whenever it changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // We do NOT call fit here; we wait until nodes/edges are committed (next effect)
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // 2) After nodes/edges state have updated, auto-fit.
  // Using a double rAF makes sure React Flow has measured node bounds.
  useEffect(() => {
    if (!nodes.length) return;
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          try {
            fitView(fitViewOptions);
          } catch {
            // no-op: fitView can throw if the instance isn't ready, but with double rAF it shouldn't.
          }
        }
      });
      // store second id on window for cleanup if needed
      (window as any).__rfFitRaf2 = raf2;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if ((window as any).__rfFitRaf2) {
        cancelAnimationFrame((window as any).__rfFitRaf2);
      }
    };
    // We re-fit on any structural change: nodes/edges arrays, rootId, mode, depth.
  }, [nodes, edges, rootId, mode, maxGenerations, fitView]);

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
      <Controls showInteractive />
    </ReactFlow>
  );
}

export default function PedigreeTree() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const [root, setRoot] = useState<Individual | null>(null);
  const [mode, setMode] = useState<"descendants" | "ancestors">("descendants");
  const [selected, setSelected] = useState<Individual | null>(null);
  const [maxGenerations, setMaxGenerations] = useState(4);

  // State for edit dialog
  const [editing, setEditing] = useState<Individual | null>(null);

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex" }}>
      {/* Left side: toolbar + tree */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            p: 1,
            background: "#f5f5f5",
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          <SearchBar
            onSelect={(id) => {
              const ind = individuals.find((i) => i.id === id) || null;
              setRoot(ind);
              setSelected(ind);
            }}
          />
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_e, val) => val && setMode(val)}
            size="small"
          >
            <ToggleButton value="descendants">Efterkommande</ToggleButton>
            <ToggleButton value="ancestors">Förfäder</ToggleButton>
          </ToggleButtonGroup>
          <Select
            size="small"
            value={maxGenerations}
            onChange={(e) => setMaxGenerations(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
              <MenuItem key={g} value={g}>
                {g} gen
              </MenuItem>
            ))}
          </Select>
          {root && (
            <Button variant="outlined" size="small" onClick={() => setRoot(null)}>
              Rensa
            </Button>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <ReactFlowProvider>
            <PedigreeInner
              rootId={root?.id ?? undefined}
              mode={mode}
              maxGenerations={maxGenerations}
              onSelectIndividual={setSelected}
            />
          </ReactFlowProvider>
        </Box>
      </Box>

      {/* Right side: details panel */}
      {selected && (
        <Box
          sx={{
            width: 300,
            borderLeft: "1px solid #ddd",
            p: 2,
            bgcolor: "#fafafa",
            overflowY: "auto",
          }}
        >
          <IndividualDetails
            individualId={selected.id}
            onClose={() => setSelected(null)}
            onEdit={(ind) => setEditing(ind)}
          />
        </Box>
      )}
      {/* Edit dialog */}
      <IndividualFormDialog
        open={!!editing}
        individual={editing}
        onClose={() => setEditing(null)}
      />
    </Box>
  );
}