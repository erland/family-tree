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
  Typography,
  Divider,
} from "@mui/material";

import { useAppSelector } from "../store";
import { buildGraph, getDescendants, getAncestors } from "../utils/relationshipUtils";
import { Individual } from "../types/individual";
import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";
import SearchBar from "../components/SearchBar";
import IndividualDetails from "../components/IndividualDetails";

const fitViewOptions: FitViewOptions = { padding: 0.2, includeHiddenNodes: true };
const nodeTypes = {
  family: FamilyNode,
  marriage: MarriageNode,
};

function PedigreeInner({
  rootId,
  mode,
  onSelectIndividual,
}: {
  rootId?: string;
  mode: "descendants" | "ancestors";
  onSelectIndividual?: (ind: Individual) => void;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    let ids: string[] | null = null;
    if (rootId) {
      const related =
        mode === "descendants"
          ? getDescendants(relationships, rootId)
          : getAncestors(relationships, rootId);
      ids = [rootId, ...related];
    }

    const filteredIndividuals = ids
      ? individuals.filter((i) => ids.includes(i.id))
      : individuals;

    const filteredRelationships = ids
      ? relationships.filter((r) => {
          if (r.type === "parent-child") {
            return (
              r.parentIds.some((p) => ids!.includes(p)) && ids!.includes(r.childId)
            );
          }
          if (r.type === "spouse") {
            return (
              ids!.includes((r as any).person1Id) &&
              ids!.includes((r as any).person2Id)
            );
          }
          return false;
        })
      : relationships;

    return buildGraph(filteredIndividuals, filteredRelationships, {
      rootId,
    });
  }, [individuals, relationships, rootId, mode]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    const t = setTimeout(() => fitView(fitViewOptions), 0);
    return () => clearTimeout(t);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        if (node.type === "family") {
          const ind = individuals.find((i) => i.id === node.id);
          if (ind) onSelectIndividual?.(ind);
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
              onSelectIndividual={setSelected}
            />
          </ReactFlowProvider>
        </Box>
      </Box>

      {/* Right side: details panel */}
      {selected && (
          <IndividualDetails individual={selected} onClose={() => setSelected(null)} />
      )}
    </Box>
  );
}