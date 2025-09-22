// src/utils/exportTreeSvg.ts
import React from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, { Background, ReactFlowProvider } from "reactflow";
import { toSvg } from "html-to-image";

import { buildGraph } from "./treeLayout";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

const nodeTypes = {
  family: FamilyNode,
  marriage: MarriageNode,
};

export async function exportFullTreeSVG(
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

  // 🔎 Compute bounding box for all nodes
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const ws = nodes.map((n) => (n.style?.width as number) || 180);
  const hs = nodes.map((n) => (n.style?.height as number) || 42);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
  const maxY = Math.max(...ys.map((y, i) => y + hs[i]));

  const width = Math.max(1, maxX - minX + 100);  // add padding
  const height = Math.max(1, maxY - minY + 100);

  // 📦 Offscreen container sized to bbox
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

  // Wait for layout to stabilize
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const renderer = container.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!renderer) {
    console.error("No renderer found");
    root.unmount();
    document.body.removeChild(container);
    return;
  }

  const svgDataUrl = await toSvg(renderer, { cacheBust: true });

  root.unmount();
  document.body.removeChild(container);

  // Trigger download
  const a = document.createElement("a");
  a.href = svgDataUrl;
  a.download = "tree.svg";
  a.click();
}