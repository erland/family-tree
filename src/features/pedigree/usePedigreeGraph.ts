// src/hooks/usePedigreeGraph.ts
import { useEffect, useMemo } from "react";
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  FitViewOptions,
} from "reactflow";
import { useAppSelector } from "../../store";
import { buildGraph } from "@core/graph";

const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.2,
  includeHiddenNodes: true,
};

type UsePedigreeGraphArgs = {
  rootId?: string;
  mode: "descendants" | "ancestors";
  maxGenerations: number;
};

export function usePedigreeGraph({
  rootId,
  mode,
  maxGenerations,
}: UsePedigreeGraphArgs) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const { fitView } = useReactFlow();

  // Build initial nodes/edges from domain data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildGraph(individuals, relationships, {
      rootId,
      mode,
      maxGenerations,
    });
  }, [individuals, relationships, rootId, mode, maxGenerations]);

  // React Flow editable state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // Keep nodes/edges in sync when inputs change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Auto-fit the viewport after layout changes
  useEffect(() => {
    if (!nodes.length) return;

    let cancelled = false;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          try {
            fitView(FIT_VIEW_OPTIONS);
          } catch {
            // ignore fit errors e.g. when flow not yet ready
          }
        }
      });
      (window as any).__rfFitRaf2 = raf2;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if ((window as any).__rfFitRaf2) {
        cancelAnimationFrame((window as any).__rfFitRaf2);
      }
    };
  }, [nodes, edges, rootId, mode, maxGenerations, fitView]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    fitViewOptions: FIT_VIEW_OPTIONS,
  };
}