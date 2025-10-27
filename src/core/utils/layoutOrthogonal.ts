// src/utils/layoutOrthogonal.ts
import { Node, Edge, Position } from "reactflow";
import dagre from "dagre";
import { TreeModel } from "./treeModel";

export function applyOrthogonalLayout(
  model: TreeModel,
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  // Clone to avoid mutating caller data
  const nodes = model.nodes.map((n) => ({ ...n }));
  const edges: Edge[] = model.childEdges.map((e) => ({ ...e }));

  // Dagre nodes: 0x0 for marriage nodes to post-position manually
  for (const n of nodes) {
    const size = n.type === "marriage" ? { width: 0, height: 0 } : { width: 180, height: 42 };
    g.setNode(n.id, size);
  }
  for (const e of edges) g.setEdge(e.source, e.target);

  // Add constraints so spouses sit side-by-side via invisible edges to marriage node
  for (const m of model.marriageNodes) {
    g.setNode(m.id, { width: 0, height: 0 });
    g.setEdge(m.a, m.id, { weight: 5, minlen: 1 });
    g.setEdge(m.b, m.id, { weight: 5, minlen: 1 });
  }

  dagre.layout(g);

  // Position FAMILY nodes
  for (const n of nodes) {
    if (n.type === "marriage") continue;
    const gp = g.node(n.id);
    if (gp) n.position = { x: gp.x - 90, y: gp.y - 21 };
    n.sourcePosition = direction === "LR" ? Position.Right : Position.Bottom;
    n.targetPosition = direction === "LR" ? Position.Left : Position.Top;
  }

  // Position MARRIAGE nodes after spouses are placed
  for (const m of model.marriageNodes) {
    const spouseA = nodes.find((n) => n.id === m.a);
    const spouseB = nodes.find((n) => n.id === m.b);
    const mNode = nodes.find((n) => n.id === m.id);
    if (!spouseA || !spouseB || !mNode) continue;

    const centerA = { x: spouseA.position.x + 90, y: spouseA.position.y + 21 };
    const centerB = { x: spouseB.position.x + 90, y: spouseB.position.y + 21 };
    const mid = { x: (centerA.x + centerB.x) / 2, y: (centerA.y + centerB.y) / 2 };
    mNode.position = { x: mid.x - 8, y: mid.y - 8 };
  }

  // Add visible spouse→marriage edges with left/right handles
  for (const m of model.marriageNodes) {
    edges.push(
      {
        id: `s-${m.a}-${m.id}`,
        source: m.a,
        target: m.id,
        sourceHandle: "right",
        targetHandle: "left",
        style: { stroke: "#9c27b0" },
      },
      {
        id: `s-${m.b}-${m.id}`,
        source: m.b,
        target: m.id,
        sourceHandle: "left",
        targetHandle: "right",
        style: { stroke: "#9c27b0" },
      }
    );
  }

  return { nodes, edges };
}