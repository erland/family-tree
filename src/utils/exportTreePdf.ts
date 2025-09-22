// src/utils/exportTreePdf.ts
import React from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, { Background, ReactFlowProvider } from "reactflow";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { buildGraph } from "./treeLayout";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

const nodeTypes = {
  family: FamilyNode,
  marriage: MarriageNode,
};

/**
 * Export the current tree view to a PDF (rasterized).
 * Renders an off-screen React Flow using the same layout as the main view,
 * captures it as PNG, then places it into a landscape A4 PDF.
 */
export async function exportFullTreePDF(
  individuals: Individual[],
  relationships: Relationship[],
  rootId: string,
  mode: "descendants" | "ancestors",
  maxGenerations: number
): Promise<void> {
  const { nodes, edges } = buildGraph(individuals, relationships, {
    rootId,
    mode,
    maxGenerations,
  });

  // Compute a tight bounding box to avoid huge empty margins
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const ws = nodes.map((n) => (n.style?.width as number) || 180);
  const hs = nodes.map((n) => (n.style?.height as number) || 42);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
  const maxY = Math.max(...ys.map((y, i) => y + hs[i]));

  const width = Math.max(1, maxX - minX + 100);  // padding
  const height = Math.max(1, maxY - minY + 100);

  // Offscreen container sized to content bbox
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    React.createElement(
      ReactFlowProvider,
      null,
      React.createElement(
        ReactFlow,
        {
          nodes,
          edges,
          nodeTypes,
          fitView: true,
          fitViewOptions: { padding: 0.05, includeHiddenNodes: true },
          style: { width: "100%", height: "100%" },
        },
        React.createElement(Background, null)
      )
    )
  );

  // Wait for React Flow to paint (double rAF)
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  // Capture only the viewport (nodes + edges), not toolbars
  const viewport = container.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewport) {
    console.error("No React Flow viewport found for PDF export.");
    root.unmount();
    document.body.removeChild(container);
    return;
  }

  // Render the viewport → PNG
  const pngDataUrl = await toPng(viewport, { cacheBust: true });

  // Cleanup offscreen render
  root.unmount();
  document.body.removeChild(container);

  // Create landscape A4 PDF and place the PNG centered & scaled
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
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