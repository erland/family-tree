// src/utils/exportTreeSvg.ts
import { buildGraph } from "./treeLayout";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { computeViewportBBox, renderOffscreenGraph, captureAsSvg } from "./exportTreeBase";

const nodeTypes = { family: FamilyNode, marriage: MarriageNode };

export async function exportFullTreeSVG(
  individuals: Individual[],
  relationships: Relationship[],
  rootId: string,
  mode: "descendants" | "ancestors",
  maxGenerations: number
): Promise<void> {
  const { nodes, edges } = buildGraph(individuals, relationships, { rootId, mode, maxGenerations });
  const { width, height } = computeViewportBBox(nodes);
  const { container, cleanup } = renderOffscreenGraph({ nodes, edges, nodeTypes }, { width, height });
  try {
    const svg = await captureAsSvg(container);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "slakttrad.svg";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    cleanup();
  }
}