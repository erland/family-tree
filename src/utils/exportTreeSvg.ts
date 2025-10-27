// src/utils/exportTreeSvg.ts
import { buildGraph } from "@core";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "@core";
import { Relationship } from "@core";
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

    const a = document.createElement("a");
    a.href = svg;
    a.download = "slakttrad.svg";
    a.click();
  } finally {
    cleanup();
  }
}
