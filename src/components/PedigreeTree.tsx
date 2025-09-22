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

import { toSvg, toPng } from "html-to-image";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
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
      <Controls showInteractive />
    </ReactFlow>
  );
}

export default function PedigreeTree() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items); 
  const [root, setRoot] = useState<Individual | null>(null);
  const [mode, setMode] = useState<"descendants" | "ancestors">("descendants");
  const [selected, setSelected] = useState<Individual | null>(null);
  const [maxGenerations, setMaxGenerations] = useState(4);

  const [editing, setEditing] = useState<Individual | null>(null);
  
  async function exportFullTreeSVG() {
    if (!root) return;
  
    const { nodes, edges } = buildGraph(individuals, relationships, {
      rootId: root.id,
      mode,
      maxGenerations,
    });
  
    // Compute bounding box of nodes
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const ws = nodes.map((n) => (n.style?.width as number) || 180);
    const hs = nodes.map((n) => (n.style?.height as number) || 42);
  
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
    const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
  
    const width = maxX - minX + 100;  // add padding
    const height = maxY - minY + 100;
  
    // Offscreen container
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    document.body.appendChild(container);
  
    const rootEl = createRoot(container);
    rootEl.render(
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.05, includeHiddenNodes: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    );
  
    // Wait until ReactFlow actually paints
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  
    // Export as SVG string (data URL)
    const renderer = container.querySelector(".react-flow__viewport") as HTMLElement;
    if (!renderer) {
      console.error("No renderer found");
      return;
    }
  
    const svgDataUrl = await toSvg(renderer, { cacheBust: true });
  
    rootEl.unmount();
    document.body.removeChild(container);
  
    // Download
    const a = document.createElement("a");
    a.href = svgDataUrl;
    a.download = "tree.svg";
    a.click();
  }

  /** PDF export: rasterize the offscreen tree to PNG and place it in a landscape A4 */
  async function exportFullTreePDF() {
    if (!root) return;

    // Build the graph using the SAME options as your on-screen tree
    const { nodes, edges } = buildGraph(individuals, relationships, {
      rootId: root.id,
      mode,
      maxGenerations,
    });

    // ---- compute tight bounding box (same approach you used for SVG) ----
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const ws = nodes.map((n) => (n.style?.width as number) || 180);
    const hs = nodes.map((n) => (n.style?.height as number) || 42);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
    const maxY = Math.max(...ys.map((y, i) => y + hs[i]));

    const width = Math.max(1, maxX - minX + 100);   // padding
    const height = Math.max(1, maxY - minY + 100);

    // ---- offscreen container sized to the content bbox ----
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    document.body.appendChild(container);

    // Render the flow (fitView ensures everything is in-frame)
    const offscreenRoot = createRoot(container);
    offscreenRoot.render(
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.05, includeHiddenNodes: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    );

    // Wait for paint (double rAF)
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    // Grab the viewport DOM (contains nodes+edges)
    const viewport = container.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) {
      console.error("No React Flow viewport found for PDF export.");
      offscreenRoot.unmount();
      document.body.removeChild(container);
      return;
    }

    // ---- rasterize to PNG ----
    const pngDataUrl = await toPng(viewport, { cacheBust: true });

    // Cleanup offscreen render
    offscreenRoot.unmount();
    document.body.removeChild(container);

    // ---- create PDF and place the PNG to fit landscape A4 ----
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // load image to know intrinsic size
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = rej;
      img.src = pngDataUrl;
    });

    const scale = Math.min(pageWidth / img.width, pageHeight / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = (pageWidth - drawW) / 2;
    const offsetY = (pageHeight - drawH) / 2;

    pdf.addImage(pngDataUrl, "PNG", offsetX, offsetY, drawW, drawH);
    pdf.save("tree.pdf");
  }

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
          <Button
            variant="outlined"
            size="small"
            onClick={exportFullTreeSVG}
          >
            SVG
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={exportFullTreePDF}
          >
            PDF
          </Button>
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
      <IndividualFormDialog
        open={!!editing}
        individual={editing}
        onClose={() => setEditing(null)}
      />
    </Box>
  );
}