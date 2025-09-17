import dagre from "dagre";
import { Relationship } from "../types/relationship";
import { Individual } from "../types/individual";
import { Edge, Node, Position } from "reactflow";

type Direction = "TB" | "LR"; // Top-to-Bottom (pedigree) or Left-to-Right

export function buildGraph(
  individuals: Individual[],
  relationships: Relationship[],
  opts?: { direction?: Direction; includeSpouseEdges?: boolean }
): { nodes: Node[]; edges: Edge[] } {
  const direction: Direction = opts?.direction ?? "TB";
  const includeSpouseEdges = opts?.includeSpouseEdges ?? true;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  // Index people
  const byId = new Map(individuals.map((i) => [i.id, i]));

  // Create one node per individual
  const nodes: Node[] = individuals.map((i) => ({
    id: i.id,
    type: "default",
    data: { label: i.name },
    position: { x: 0, y: 0 },
    sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
    targetPosition: direction === "LR" ? Position.Left : Position.Top,
    style: {
      padding: 8,
      borderRadius: 8,
      border: "1px solid #90caf9",
      background: "#e3f2fd",
      fontSize: 12,
      width: 180,
    },
  }));

  // Edges: parent -> child
  const edges: Edge[] = [];
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      for (const pid of rel.parentIds) {
        if (byId.has(pid) && byId.has(rel.childId)) {
          edges.push({
            id: `pc-${pid}-${rel.childId}`,
            source: pid,
            target: rel.childId,
            animated: false,
          });
        }
      }
    } else if (rel.type === "spouse" && includeSpouseEdges) {
      const a = (rel as any).person1Id;
      const b = (rel as any).person2Id;
      if (byId.has(a) && byId.has(b)) {
        edges.push({
          id: `sp-${a}-${b}`,
          source: a,
          target: b,
          style: { strokeDasharray: "6 4", stroke: "#9e9e9e" },
        });
      }
    }
  }

  // Register with dagre and compute layout
  for (const n of nodes) {
    // Rough width/height for layout box
    g.setNode(n.id, { width: 180, height: 42 });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  // Apply positions back to nodes
  for (const n of nodes) {
    const gp = g.node(n.id);
    if (gp) {
      n.position = { x: gp.x - gp.width / 2, y: gp.y - gp.height / 2 };
    }
  }

  return { nodes, edges };
}