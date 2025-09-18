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
  Autocomplete,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";

import { useAppSelector } from "../store";
import { buildGraph, getDescendants, getAncestors } from "../utils/relationshipUtils";
import { Individual } from "../types/individual";
import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";

const fitViewOptions: FitViewOptions = { padding: 0.2, includeHiddenNodes: true };

function PedigreeInner({
  rootId,
  mode,
}: {
  rootId?: string;
  mode: "descendants" | "ancestors";
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
      nodeTypes={{
        family: FamilyNode,
        marriage: MarriageNode,
      }}
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

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: 1,
          background: "#f5f5f5",
          display: "flex",
          gap: 2,
          alignItems: "center",
        }}
      >
        <Autocomplete
          options={individuals}
          getOptionLabel={(o) => o.name}
          value={root}
          onChange={(_e, val) => setRoot(val)}
          renderInput={(params) => (
            <TextField {...params} label="Välj rotperson" size="small" />
          )}
          sx={{ width: 300 }}
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

      {/* Graph */}
      <Box sx={{ flexGrow: 1 }}>
        <ReactFlowProvider>
          <PedigreeInner rootId={root?.id ?? undefined} mode={mode} />
        </ReactFlowProvider>
      </Box>
    </Box>
  );
}