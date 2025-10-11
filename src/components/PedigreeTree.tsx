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

import { exportFullTreeSVG } from "../utils/exportTreeSvg";
import { exportFullTreePDF } from "../utils/exportTreePdf";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { buildGraph } from "../utils/treeLayout";
import FamilyNode from "./FamilyNode";
import MarriageNode from "./MarriageNode";
import SearchBar from "../components/SearchBar";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog";
import CircularPedigree from "./CircularPedigree"; // 👈 NEW

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
  setMaxGenerations, // pass setter down
}: {
  rootId?: string;
  mode: "descendants" | "ancestors";
  maxGenerations: number;
  onSelectIndividual?: (ind: Individual) => void;
  setMaxGenerations: (g: number) => void;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildGraph(individuals, relationships, {
      rootId,
      mode,
      maxGenerations,
    });
  }, [individuals, relationships, rootId, mode, maxGenerations]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (!nodes.length) return;
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          try {
            fitView(fitViewOptions);
          } catch {
            /* ignore */
          }
        }
      });
      (window as any).__rfFitRaf2 = raf2;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if ((window as any).__rfFitRaf2) {
        cancelAnimationFrame((window as any).__rfFitRaf2);
      }
    };
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
      <Controls showInteractive>
        {/* 👇 Max depth select stays with the ReactFlow controls */}
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

export default function PedigreeTree() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const [root, setRoot] = useState<Individual | null>(null);
  const [mode, setMode] = useState<"descendants" | "ancestors">("descendants");
  const [selected, setSelected] = useState<Individual | null>(null);
  const [maxGenerations, setMaxGenerations] = useState(3);
  const [layoutKind, setLayoutKind] = useState<"orthogonal" | "circular">("orthogonal");

  const [editing, setEditing] = useState<Individual | null>(null);

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex" }}>
      {/* Left side: toolbar + tree */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar - row 1 */}
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

          {/* Layout toggle */}
          <ToggleButtonGroup
            value={layoutKind}
            exclusive
            onChange={(_e, val) => val && setLayoutKind(val)}
            size="small"
          >
            <ToggleButton value="orthogonal">Ortogonal</ToggleButton>
            <ToggleButton value="circular" disabled={!root}>
              Cirkulär
            </ToggleButton>
          </ToggleButtonGroup>

          {/* When in circular mode, expose generations here (since RF Controls are hidden) */}
          {layoutKind === "circular" && (
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
          )}
        </Box>

        {/* Toolbar - row 2 (only visible if root selected) */}
        {root && (
          <Box
            sx={{
              p: 1,
              background: "#f5f5f5",
              display: "flex",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Button variant="outlined" size="small" onClick={() => setRoot(null)}>
              Rensa
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                root &&
                exportFullTreeSVG(
                  individuals,
                  relationships,
                  root.id,
                  mode,
                  maxGenerations
                )
              }
            >
              SVG
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                root &&
                exportFullTreePDF(
                  individuals,
                  relationships,
                  root.id,
                  mode,
                  maxGenerations
                )
              }
            >
              PDF
            </Button>
          </Box>
        )}

        {/* Tree area */}
        <Box sx={{ flexGrow: 1 }}>
          {layoutKind === "circular" && root ? (
            <CircularPedigree rootId={root.id} generations={maxGenerations} />
          ) : (
            <ReactFlowProvider>
              <PedigreeInner
                rootId={root?.id ?? undefined}
                mode={mode}
                maxGenerations={maxGenerations}
                onSelectIndividual={setSelected}
                setMaxGenerations={setMaxGenerations}
              />
            </ReactFlowProvider>
          )}
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
      <IndividualFormDialog
        open={!!editing}
        individual={editing}
        onClose={() => setEditing(null)}
      />
    </Box>
  );
}