// src/utils/treeLayout.ts
import { Node, Edge } from "reactflow";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { buildTreeModel } from "./treeModel";
import { applyOrthogonalLayout } from "./layoutOrthogonal";

export type Direction = "TB" | "LR";

export function buildGraph(
  individuals: Individual[],
  relationships: Relationship[],
  opts?: {
    direction?: Direction;
    rootId?: string;
    mode?: "ancestors" | "descendants";
    maxGenerations?: number;
  }
): { nodes: Node[]; edges: Edge[] } {
  const model = buildTreeModel(individuals, relationships, {
    rootId: opts?.rootId,
    mode: opts?.mode,
    maxGenerations: opts?.maxGenerations,
  });
  // Keep existing behavior: orthogonal Dagre by default
  return applyOrthogonalLayout(model, opts?.direction ?? "TB");
}


export { buildTreeModel, applyOrthogonalLayout };