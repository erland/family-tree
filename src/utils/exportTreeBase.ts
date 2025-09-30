// src/utils/exportTreeBase.ts
import React from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, { Background, ReactFlowProvider } from "reactflow";
import { toPng, toSvg } from "html-to-image";

export type RFGraph = {
  nodes: any[];
  edges: any[];
  nodeTypes: Record<string, any>;
};

export function computeViewportBBox(nodes: any[]) {
  if (nodes.length === 0) return { width: 1, height: 1, minX: 0, minY: 0 };
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const ws = nodes.map((n) => (n.style?.width as number) || 180);
  const hs = nodes.map((n) => (n.style?.height as number) || 42);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
  const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
  return { minX, minY, width: Math.max(1, maxX - minX + 100), height: Math.max(1, maxY - minY + 100) };
}

export function renderOffscreenGraph({ nodes, edges, nodeTypes }: RFGraph, dims: { width: number; height: number }) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${dims.width}px`;
  container.style.height = `${dims.height}px`;
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

  const cleanup = () => {
    try {
      root.unmount();
    } catch {}
    container.remove();
  };

  return { container, cleanup };
}

export async function captureAsPng(element: HTMLElement): Promise<string> {
  // tiny paint delay
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return toPng(element);
}

export async function captureAsSvg(element: HTMLElement): Promise<string> {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return toSvg(element);
}