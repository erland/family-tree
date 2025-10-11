// src/utils/layoutRadial.ts
import { Node, Edge } from "reactflow";
import { TreeModel } from "./treeModel";

const NODE_W = 180;
const NODE_H = 42;
const RING_GAP = 160;

export function applyRadialLayout(
  model: TreeModel
): { nodes: Node[]; edges: Edge[] } {
  const nodes = model.nodes.map((n) => ({ ...n }));
  const edges: Edge[] = [
    ...model.childEdges.map((e) => ({ ...e })), // keep child edges
  ];

  // Center = (0,0) – React Flow can fitView later
  const center = { x: 0, y: 0 };

  // Group FAMILY nodes by level (root at 0)
  const levelGroups: Record<number, Node[]> = {};
  for (const n of nodes) {
    if (n.type !== "family") continue;
    const lvl =
      model.opts.rootId && model.levelById[n.id] != null ? model.levelById[n.id] : 0;
    (levelGroups[lvl] ||= []).push(n);
  }

  // Sort each ring for stability
  for (const lvl of Object.keys(levelGroups).map(Number).sort((a, b) => a - b)) {
    const ring = levelGroups[lvl];
    const count = ring.length;
    const radius = lvl * RING_GAP;
    const step = (Math.PI * 2) / Math.max(1, count);
    const start = -Math.PI / 2; // start at top

    ring.forEach((n, idx) => {
      const angle = start + idx * step;
      const cx = center.x + radius * Math.cos(angle);
      const cy = center.y + radius * Math.sin(angle);
      n.position = { x: cx - NODE_W / 2, y: cy - NODE_H / 2 };
      // Let React Flow auto-choose handles; child edges already use top/bottom
    });
  }

  // Position marriage nodes between spouses
  for (const m of model.marriageNodes) {
    const a = nodes.find((n) => n.id === m.a);
    const b = nodes.find((n) => n.id === m.b);
    const mm = nodes.find((n) => n.id === m.id);
    if (!a || !b || !mm) continue;
    const ac = { x: a.position.x + NODE_W / 2, y: a.position.y + NODE_H / 2 };
    const bc = { x: b.position.x + NODE_W / 2, y: b.position.y + NODE_H / 2 };
    const mid = { x: (ac.x + bc.x) / 2, y: (ac.y + bc.y) / 2 };
    mm.position = { x: mid.x - 8, y: mid.y - 8 };
  }

  // Visible spouse edges (purple), keep the same handles you already use
  for (const m of model.marriageNodes) {
    edges.push(
      { id: `s-${m.a}-${m.id}`, source: m.a, target: m.id, sourceHandle: "right", targetHandle: "left",  style: { stroke: "#9c27b0" } },
      { id: `s-${m.b}-${m.id}`, source: m.b, target: m.id, sourceHandle: "left",  targetHandle: "right", style: { stroke: "#9c27b0" } },
    );
  }

  return { nodes, edges };
}