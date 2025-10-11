// src/utils/treeLayout.ts
import { Node, Edge } from "reactflow";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { buildTreeModel } from "./treeModel";
import { applyOrthogonalLayout } from "./layoutOrthogonal";
import { applyRadialLayout } from "./layoutRadial";

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

/** Optional helper you can call later for circular charts */
export function buildGraphCircular(
  individuals: Individual[],
  relationships: Relationship[],
  opts: {
    rootId: string;
    mode?: "ancestors" | "descendants";
    maxGenerations?: number;
  }
): { nodes: Node[]; edges: Edge[] } {
  const model = buildTreeModel(individuals, relationships, {
    rootId: opts.rootId,
    mode: opts.mode,
    maxGenerations: opts.maxGenerations,
  });
  return applyRadialLayout(model);
}

export { buildTreeModel, applyOrthogonalLayout, applyRadialLayout };