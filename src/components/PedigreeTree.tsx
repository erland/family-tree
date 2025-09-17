import React, { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  SelectionMode,
  Node,
  Edge,
  FitViewOptions,
  ReactFlowProvider,   // 👈 import this
  useReactFlow,        // still needed inside inner component
} from "reactflow";
import "reactflow/dist/style.css";

import { useAppSelector } from "../store";
import { buildGraph } from "../utils/treeLayout";

type ViewMode = "pedigree" | "descendants";
const fitViewOptions: FitViewOptions = { padding: 0.2, includeHiddenNodes: true };

function PedigreeInner({ direction }: { direction: "TB" | "LR" }) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(individuals, relationships, { direction, includeSpouseEdges: true }),
    [individuals, relationships, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    const t = setTimeout(() => fitView(fitViewOptions), 0);
    return () => clearTimeout(t);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={fitViewOptions}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      zoomOnScroll
      zoomOnPinch
      panOnScroll
      selectionOnDrag
      selectionMode={SelectionMode.Full}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls showInteractive />
    </ReactFlow>
  );
}

export default function PedigreeTree({ direction = "TB" }: { direction?: "TB" | "LR" }) {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      <ReactFlowProvider>
        <PedigreeInner direction={direction} />
      </ReactFlowProvider>
    </div>
  );
}