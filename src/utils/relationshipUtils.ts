import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { Node, Edge, Position } from "reactflow";
import dagre from "dagre";

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

/** Collect ancestors of a person */
export function getAncestors(relationships: Relationship[], personId: string): string[] {
  const result = new Set<string>();
  function dfsUp(id: string) {
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.childId === id) {
        for (const pid of rel.parentIds) {
          if (!result.has(pid)) {
            result.add(pid);
            dfsUp(pid);
          }
        }
      }
    }
  }
  dfsUp(personId);
  return Array.from(result);
}

/** Collect descendants of a person */
export function getDescendants(relationships: Relationship[], personId: string): string[] {
  const result = new Set<string>();
  function dfsDown(id: string) {
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.parentIds.includes(id)) {
        if (!result.has(rel.childId)) {
          result.add(rel.childId);
          dfsDown(rel.childId);
        }
      }
    }
  }
  dfsDown(personId);
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
  opts?: { direction?: Direction; includeSpouseEdges?: boolean; rootId?: string }
): { nodes: Node[]; edges: Edge[] } {
  const direction: Direction = opts?.direction ?? "TB";
  const includeSpouseEdges = opts?.includeSpouseEdges ?? true;
  const rootId = opts?.rootId;

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

  // Nodes
  const nodes: Node[] = individuals.map((i) => ({
    id: i.id,
    type: "family", // 👈 use custom FamilyNode
    data: { label: i.name, isRoot: i.id === rootId },
    position: { x: 0, y: 0 },
    sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
    targetPosition: direction === "LR" ? Position.Left : Position.Top,
    style: {
      padding: 8,
      borderRadius: 8,
      border: i.id === rootId ? "2px solid #f44336" : "1px solid #90caf9",
      background: i.id === rootId ? "#ffebee" : "#e3f2fd",
      fontSize: 12,
      width: 180,
      textAlign: "center",
    },
  }));

  // Edges
  const edges: Edge[] = [];

  for (const rel of relationships) {
    // Parent → Child
    if (rel.type === "parent-child") {
      for (const pid of rel.parentIds) {
        if (byId.has(pid) && byId.has(rel.childId)) {
          edges.push({
            id: `pc-${pid}-${rel.childId}`,
            source: pid,
            target: rel.childId,
            // 👇 explicitly connect from bottom of parent → top of child
            sourceHandle: "bottom",
            targetHandle: "top",
            style: { stroke: "#1976d2" },
          });
        }
      }
    }
    // Spouse ↔ Spouse (side handles)
    else if (rel.type === "spouse" && includeSpouseEdges) {
      const a = (rel as any).person1Id;
      const b = (rel as any).person2Id;
    
      const marriageId = `m-${a}-${b}`;
    
      // Create a hidden "marriage" node
      nodes.push({
        id: marriageId,
        type: "marriage",
        data: { spouses: [a, b] },
        position: { x: 0, y: 0 },
        style: { width: 1, height: 1, opacity: 0 },
      });
    
      // Link spouses to marriage node
      edges.push({ id: `${a}->${marriageId}`, source: a, target: marriageId });
      edges.push({ id: `${b}->${marriageId}`, source: b, target: marriageId });
    }
  }

  // Layout with dagre
  for (const n of nodes) {
    g.setNode(n.id, { width: 180, height: 42 });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  for (const n of nodes) {
    const gp = g.node(n.id);
    if (gp) {
      n.position = { x: gp.x - gp.width / 2, y: gp.y - gp.height / 2 };
    }
  }

  return { nodes, edges };
}