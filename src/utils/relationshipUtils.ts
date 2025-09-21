import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { Node, Edge, Position } from "reactflow";
import dagre from "dagre";
import { fullName } from "../utils/nameUtils"; // at top

/* ------------------------------------------------------------------
   Graph utilities
------------------------------------------------------------------ */

/** Build parent→child adjacency list */
function buildAdjacency(relationships: Relationship[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      for (const pid of rel.parentIds) {
        if (!graph[pid]) graph[pid] = [];
        graph[pid].push(rel.childId);
      }
    }
  }
  return graph;
}

/** DFS reachability check */
function dfs(
  graph: Record<string, string[]>,
  startId: string,
  targetId: string,
  visited = new Set<string>()
): boolean {
  if (startId === targetId) return true;
  if (visited.has(startId)) return false;
  visited.add(startId);

  const children = graph[startId] || [];
  for (const child of children) {
    if (dfs(graph, child, targetId, visited)) return true;
  }
  return false;
}

/** Check if adding a parent→child edge would create a cycle */
export function wouldCreateCycle(
  relationships: Relationship[],
  parentId: string,
  childId: string
): boolean {
  const graph = buildAdjacency(relationships);
  if (!graph[parentId]) graph[parentId] = [];
  graph[parentId].push(childId);
  return dfs(graph, childId, parentId);
}

/** Collect ancestors of a person, with optional generation limit */
export function getAncestors(
  relationships: Relationship[],
  personId: string,
  maxGenerations: number = Infinity
): string[] {
  const result = new Set<string>();
  function dfsUp(id: string, depth: number) {
    if (depth >= maxGenerations) return;
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.childId === id) {
        for (const pid of rel.parentIds) {
          if (!result.has(pid)) {
            result.add(pid);
            dfsUp(pid, depth + 1);
          }
        }
      }
    }
  }
  dfsUp(personId, 0);
  return Array.from(result);
}

/** Collect descendants of a person, with optional generation limit */
export function getDescendants(
  relationships: Relationship[],
  personId: string,
  maxGenerations: number = Infinity
): string[] {
  const result = new Set<string>();
  function dfsDown(id: string, depth: number) {
    if (depth >= maxGenerations) return;
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.parentIds.includes(id)) {
        if (!result.has(rel.childId)) {
          result.add(rel.childId);
          dfsDown(rel.childId, depth + 1);
        }
      }
    }
  }
  dfsDown(personId, 0);
  return Array.from(result);
}

/** Validate parent-child addition */
export function canAddParentChild(
  relationships: Relationship[],
  parentId: string,
  childId: string
): { ok: boolean; reason?: string } {
  if (parentId === childId) {
    return { ok: false, reason: "En individ kan inte vara sin egen förälder." };
  }
  if (wouldCreateCycle(relationships, parentId, childId)) {
    return { ok: false, reason: "Det här skulle skapa en cykel i släktträdet." };
  }
  return { ok: true };
}

/** Validate spouse addition */
export function canAddSpouse(
  relationships: Relationship[],
  a: string,
  b: string
): { ok: boolean; reason?: string } {
  if (a === b) {
    return { ok: false, reason: "En individ kan inte vara gift med sig själv." };
  }
  const duplicate = relationships.some(
    (rel) =>
      rel.type === "spouse" &&
      (((rel as any).person1Id === a && (rel as any).person2Id === b) ||
        ((rel as any).person1Id === b && (rel as any).person2Id === a))
  );
  if (duplicate) {
    return { ok: false, reason: "Den här äktenskapsrelationen finns redan." };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------
   Build React Flow Graph (with Dagre layout)
------------------------------------------------------------------ */

type Direction = "TB" | "LR";

/**
 * Build graph for React Flow with Dagre layout.
 * Spouse edges connect side-to-side.
 */
export function buildGraph(
  individuals: Individual[],
  relationships: Relationship[],
  opts?: { direction?: "TB" | "LR"; rootId?: string }
): { nodes: Node[]; edges: Edge[] } {
  const direction: "TB" = "TB";
  const rootId = opts?.rootId;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const byId = new Map(individuals.map((i) => [i.id, i]));

  const nodes: Node[] = individuals.map((i) => ({
    id: i.id,
    type: "family",
    data: { individual: i, isRoot: i.id === rootId },
    position: { x: 0, y: 0 },
    sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
    targetPosition: direction === "LR" ? Position.Left : Position.Top,
    // 👇 keep only the size, remove visual styles
    style: { width: 180, height: 42 },
  }));

  const edges: Edge[] = [];
  const marriageNodes: { id: string; a: string; b: string }[] = [];

  // Spouse relations
  for (const rel of relationships) {
    if (rel.type === "spouse") {
      const a = (rel as any).person1Id;
      const b = (rel as any).person2Id;
      if (!byId.has(a) || !byId.has(b)) continue;

      const marriageId = `m-${a}-${b}`;

      // Visible marriage node (small dot)
      nodes.push({
        id: marriageId,
        type: "marriage",
        data: { spouses: [a, b] },
        position: { x: 0, y: 0 },
        style: {
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#ff9800",
          border: "2px solid #e65100",
        },
      });

      // Add constraint node to dagre (zero size but keeps spouses aligned)
      g.setNode(a, { width: 180, height: 42 });
      g.setNode(b, { width: 180, height: 42 });
      g.setNode(marriageId, { width: 0, height: 0 });

      g.setEdge(a, marriageId, { weight: 5, minlen: 1 });
      g.setEdge(b, marriageId, { weight: 5, minlen: 1 });

      edges.push({
        id: `${a}->${marriageId}`,
        source: a,
        target: marriageId,
        sourceHandle: "right",
        targetHandle: "left",
        style: { stroke: "#aaa" },
      });
      edges.push({
        id: `${b}->${marriageId}`,
        source: b,
        target: marriageId,
        sourceHandle: "left",
        targetHandle: "right",
        style: { stroke: "#aaa" },
      });

      marriageNodes.push({ id: marriageId, a, b });
    }
  }

  // Parent-child relations
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      const childId = rel.childId;
      const parents = rel.parentIds;

      if (parents.length === 2) {
        const [a, b] = parents;
        const marriageId = `m-${a}-${b}`;
        if (nodes.some((n) => n.id === marriageId)) {
          edges.push({
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

      // Fallback single-parent
      for (const pid of parents) {
        edges.push({
          id: `pc-${pid}-${childId}`,
          source: pid,
          target: childId,
          sourceHandle: "bottom",
          targetHandle: "top",
          style: { stroke: "#1976d2" },
        });
      }
    }
  }

  // Add all nodes/edges to dagre
  for (const n of nodes) {
    g.setNode(n.id, { width: 180, height: 42 });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  // After dagre.layout(g) and before final positions
  for (const m of marriageNodes) {
    const posA = g.node(m.a);
    const posB = g.node(m.b);
    const mNode = nodes.find((n) => n.id === m.id);

    if (posA && posB && mNode) {
      // Determine left and right spouse
      const leftSpouse = posA.x < posB.x ? m.a : m.b;
      const rightSpouse = posA.x < posB.x ? m.b : m.a;

      // Recenter marriage node
      const width = (mNode.style?.width as number) || 0;
      const height = (mNode.style?.height as number) || 0;
      mNode.position = {
        x: (posA.x + posB.x) / 2 - width / 2,
        y: (posA.y + posB.y) / 2 - height / 2,
      };

      // Remove old spouse edges
      const spouseEdges = edges.filter(
        (e) => e.target === m.id && (e.source === m.a || e.source === m.b)
      );
      spouseEdges.forEach((e) => {
        const idx = edges.indexOf(e);
        if (idx !== -1) edges.splice(idx, 1);
      });

      // Add corrected edges
      edges.push({
        id: `${leftSpouse}->${m.id}`,
        source: leftSpouse,
        target: m.id,
        sourceHandle: "right",
        targetHandle: "left",
        style: { stroke: "#aaa" },
      });
      edges.push({
        id: `${rightSpouse}->${m.id}`,
        source: rightSpouse,
        target: m.id,
        sourceHandle: "left",
        targetHandle: "right",
        style: { stroke: "#aaa" },
      });
    }
  }

  // Apply dagre positions
  for (const n of nodes) {
    const gp = g.node(n.id);
    if (gp) {
      n.position = { x: gp.x - gp.width / 2, y: gp.y - gp.height / 2 };
    }
  }

  // Re-center marriage nodes visually
  for (const m of marriageNodes) {
    const posA = g.node(m.a);
    const posB = g.node(m.b);
    const mNode = nodes.find((n) => n.id === m.id);
    if (posA && posB && mNode) {
      const width = (mNode.style?.width as number) || 0;
      const height = (mNode.style?.height as number) || 0;

      mNode.position = {
        x: (posA.x + posB.x) / 2 - width / 2,
        y: (posA.y + posB.y) / 2 - height / 2,
      };
    }
  }
  
  return { nodes, edges };
}