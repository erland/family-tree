// src/utils/treeModel.ts
import { Node, Edge } from "reactflow";
import { Individual } from "../domain/types/individual";
import { Relationship } from "../domain/types/relationship";

/** Internal shape to help radial/orthogonal layouts */
export type TreeModel = {
  nodes: Node[];                 // family + marriage (no positions yet)
  childEdges: Edge[];            // marriage→child or parent→child (no spouse edges here)
  marriageNodes: Array<{ id: string; a: string; b: string }>;
  levelById: Record<string, number>;      // generation index from root
  opts: {
    rootId?: string;
    mode: "ancestors" | "descendants";
    maxGenerations: number;
  };
};

function computeLevels(
  relationships: Relationship[],
  rootId: string,
  mode: "ancestors" | "descendants",
  maxGenerations: number
): Record<string, number> {
  const level: Record<string, number> = { [rootId]: 0 };
  const q: Array<string> = [rootId];
  while (q.length) {
    const id = q.shift()!;
    const cur = level[id] ?? 0;
    if (cur >= maxGenerations) continue;

    for (const rel of relationships) {
      if (rel.type !== "parent-child") continue;
      if (mode === "ancestors" && rel.childId === id) {
        for (const p of rel.parentIds) {
          if (level[p] == null) {
            level[p] = cur + 1;
            q.push(p);
          }
        }
      } else if (mode === "descendants" && rel.parentIds.includes(id)) {
        const c = rel.childId;
        if (level[c] == null) {
          level[c] = cur + 1;
          q.push(c);
        }
      }
    }
  }
  return level;
}

export function buildTreeModel(
  individuals: Individual[],
  relationships: Relationship[],
  opts?: {
    rootId?: string;
    mode?: "ancestors" | "descendants";
    maxGenerations?: number;
  }
): TreeModel {
  const mode = opts?.mode ?? "descendants";
  const maxGenerations = opts?.maxGenerations ?? Infinity;
  const byId = new Map(individuals.map((i) => [i.id, i]));

  const levelById: Record<string, number> =
    opts?.rootId ? computeLevels(relationships, opts.rootId, mode, maxGenerations) : {};

  const allowed = opts?.rootId
    ? new Set(Object.keys(levelById))
    : new Set(individuals.map((i) => i.id));

  // Family nodes
  const nodes: Node[] = individuals
    .filter((i) => allowed.has(i.id))
    .map((i) => ({
      id: i.id,
      type: "family",
      data: { individual: i, isRoot: i.id === opts?.rootId },
      position: { x: 0, y: 0 },
      style: { width: 180, height: 42 },
    }));

  // Marriage nodes + remember pairs
  const marriageNodes: Array<{ id: string; a: string; b: string }> = [];
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    const a = (rel as any).person1Id;
    const b = (rel as any).person2Id;
    if (!allowed.has(a) || !allowed.has(b)) continue;
    if (!byId.has(a) || !byId.has(b)) continue;

    const marriageId = `m-${a}-${b}`;
    nodes.push({
      id: marriageId,
      type: "marriage",
      data: { spouses: [a, b] },
      position: { x: 0, y: 0 }, // layout decides later
      style: { width: 16, height: 16, borderRadius: "50%" },
    });
    marriageNodes.push({ id: marriageId, a, b });
  }

  // Marriage→child or single-parent→child edges (no spouse edges here)
  const childEdges: Edge[] = [];
  for (const rel of relationships) {
    if (rel.type !== "parent-child") continue;

    const childId = rel.childId;
    if (!allowed.has(childId)) continue;
    const parents = rel.parentIds.filter((pid) => allowed.has(pid));
    if (!parents.length) continue;

    if (parents.length === 2) {
      const [a, b] = parents;
      const marriageId = `m-${a}-${b}`;
      if (nodes.some((n) => n.id === marriageId)) {
        childEdges.push({
          id: `mc-${marriageId}-${childId}`,
          source: marriageId,
          target: childId,
          sourceHandle: "bottom",
          targetHandle: "top",
          style: { stroke: "#1976d2" },
        });
        continue;
      }
    }
    for (const pid of parents) {
      childEdges.push({
        id: `pc-${pid}-${childId}`,
        source: pid,
        target: childId,
        sourceHandle: "bottom",
        targetHandle: "top",
        style: { stroke: "#1976d2" },
      });
    }
  }

  return {
    nodes,
    childEdges,
    marriageNodes,
    levelById,
    opts: { rootId: opts?.rootId, mode, maxGenerations },
  };
}