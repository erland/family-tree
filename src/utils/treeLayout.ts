import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { Node, Edge, Position } from "reactflow";
import dagre from "dagre";

/* ------------------------------------------------------------------
   Graph utilities (cycle checks etc. retained)
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

/* ------------------------------------------------------------------
   NEW: limited reachability (used by buildGraph)
------------------------------------------------------------------ */

function collectReachable(
  relationships: Relationship[],
  rootId: string,
  mode: "ancestors" | "descendants",
  maxGenerations: number
): Set<string> {
  const visited = new Set<string>();
  function dfs(id: string, depth: number) {
    if (visited.has(id)) return;
    visited.add(id);
    if (depth >= maxGenerations) return;

    for (const rel of relationships) {
      if (rel.type === "parent-child") {
        if (mode === "ancestors" && rel.childId === id) {
          for (const pid of rel.parentIds) dfs(pid, depth + 1);
        } else if (mode === "descendants" && rel.parentIds.includes(id)) {
          dfs(rel.childId, depth + 1);
        }
      }
    }
  }
  dfs(rootId, 0);
  return visited;
}

/* ------------------------------------------------------------------
   Build React Flow Graph (with Dagre layout)
------------------------------------------------------------------ */

type Direction = "TB" | "LR";

/**
 * Build graph for React Flow with Dagre layout.
 * Spouse edges connect side-to-side.
 * Supports limiting depth via { rootId, mode, maxGenerations }.
 */
export function buildGraph(
  individuals: Individual[],
  relationships: Relationship[],
  opts?: {
    direction?: "TB" | "LR";
    rootId?: string;
    mode?: "ancestors" | "descendants";
    maxGenerations?: number;
  }
): { nodes: Node[]; edges: Edge[] } {
  const direction: Direction = opts?.direction ?? "TB";
  const rootId = opts?.rootId;
  const mode = opts?.mode ?? "descendants";
  const maxGenerations = opts?.maxGenerations ?? Infinity;

  const allowed = rootId
    ? collectReachable(relationships, rootId, mode, maxGenerations)
    : new Set(individuals.map((i) => i.id));

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const byId = new Map(individuals.map((i) => [i.id, i]));

  // Build person nodes (filtered)
  const nodes: Node[] = individuals
    .filter((i) => allowed.has(i.id))
    .map((i) => ({
      id: i.id,
      type: "family",
      data: { individual: i, isRoot: i.id === rootId },
      position: { x: 0, y: 0 },
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      style: { width: 180, height: 42 },
    }));

  const edges: Edge[] = [];
  const marriageNodes: { id: string; a: string; b: string }[] = [];

  // Spouse relations
  for (const rel of relationships) {
    if (rel.type === "spouse") {
      const a = (rel as any).person1Id;
      const b = (rel as any).person2Id;
      if (!allowed.has(a) || !allowed.has(b)) continue;
      if (!byId.has(a) || !byId.has(b)) continue;

      const marriageId = `m-${a}-${b}`;

      // Visible marriage node (small dot)
      nodes.push({
        id: marriageId,
        type: "marriage",
        data: { spouses: [a, b] },
        position: { x: 0, y: 0 }, // will be positioned after layout
        style: {
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#ff9800",
          border: "2px solid #e65100",
        },
      });

      // Constraint nodes for dagre
      g.setNode(a, { width: 180, height: 42 });
      g.setNode(b, { width: 180, height: 42 });
      g.setNode(marriageId, { width: 0, height: 0 });

      g.setEdge(a, marriageId, { weight: 5, minlen: 1 });
      g.setEdge(b, marriageId, { weight: 5, minlen: 1 });

      // Create edges; we will re-align handles after layout
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

  // Parent-child relations (filtered)
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      const childId = rel.childId;
      if (!allowed.has(childId)) continue;
      const parents = rel.parentIds.filter((pid) => allowed.has(pid));
      if (parents.length === 0) continue;

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

      // Fallback: single-parent
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
    // Use 0x0 for marriage to let us control position post-layout
    const size =
      n.type === "marriage" ? { width: 0, height: 0 } : { width: 180, height: 42 };
    g.setNode(n.id, size);
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  // Layout
  dagre.layout(g);

  // 1) Apply dagre positions to FAMILY nodes only (do NOT override marriage)
  for (const n of nodes) {
    if (n.type === "marriage") continue;
    const gp = g.node(n.id);
    if (gp) {
      n.position = { x: gp.x - gp.width / 2, y: gp.y - gp.height / 2 };
    }
  }

  // 2) AFTER family nodes are positioned, center marriage nodes between spouses
  for (const m of marriageNodes) {
    const spouseA = nodes.find((n) => n.id === m.a);
    const spouseB = nodes.find((n) => n.id === m.b);
    const mNode = nodes.find((n) => n.id === m.id);
    if (spouseA && spouseB && mNode) {
      const centerA = {
        x: spouseA.position.x + ((spouseA.style?.width as number) || 180) / 2,
        y: spouseA.position.y + ((spouseA.style?.height as number) || 42) / 2,
      };
      const centerB = {
        x: spouseB.position.x + ((spouseB.style?.width as number) || 180) / 2,
        y: spouseB.position.y + ((spouseB.style?.height as number) || 42) / 2,
      };

      const mW = (mNode.style?.width as number) || 16;
      const mH = (mNode.style?.height as number) || 16;

      // Place exactly at the mid-point between spouses
      mNode.position = {
        x: (centerA.x + centerB.x) / 2 - mW / 2,
        y: (centerA.y + centerB.y) / 2 - mH / 2,
      };

      // Update spouse edge handles so lines connect from left/right correctly
      const leftSpouse = centerA.x < centerB.x ? m.a : m.b;
      const rightSpouse = centerA.x < centerB.x ? m.b : m.a;

      // Remove existing spouse edges to this marriage node
      for (let i = edges.length - 1; i >= 0; i--) {
        const e = edges[i];
        if (e.target === m.id && (e.source === m.a || e.source === m.b)) {
          edges.splice(i, 1);
        }
      }

      // Re-add with correct handles
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

  return { nodes, edges };
}