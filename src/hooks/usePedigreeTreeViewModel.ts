// src/hooks/usePedigreeTreeViewModel.ts
import { useCallback, useState } from "react";
import { useAppSelector } from "../store";
import { Individual } from "@core/domain";
import { exportFullTreeSVG } from "../utils/exportTreeSvg";
import { exportFullTreePDF } from "../utils/exportTreePdf";

export function usePedigreeTreeViewModel() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  // Core UI state for the tree page
  const [root, setRoot] = useState<Individual | null>(null);
  const [mode, setMode] = useState<"descendants" | "ancestors">("descendants");
  const [layoutKind, setLayoutKind] = useState<"orthogonal" | "circular">(
    "orthogonal"
  );
  const [maxGenerations, setMaxGenerations] = useState(3);

  const [selected, setSelected] = useState<Individual | null>(null);
  const [editing, setEditing] = useState<Individual | null>(null);

  // Derived for convenience
  const rootId = root?.id ?? undefined;

  // Called when user picks a person in SearchBar
  const handlePickRoot = useCallback(
    (id: string) => {
      const person = individuals.find((i) => i.id === id) || null;
      setRoot(person);
      setSelected(person);
    },
    [individuals]
  );

  const handleExportSvg = useCallback(() => {
    if (!root) return;
    exportFullTreeSVG(
      individuals,
      relationships,
      root.id,
      mode,
      maxGenerations
    );
  }, [root, individuals, relationships, mode, maxGenerations]);

  const handleExportPdf = useCallback(() => {
    if (!root) return;
    exportFullTreePDF(
      individuals,
      relationships,
      root.id,
      mode,
      maxGenerations
    );
  }, [root, individuals, relationships, mode, maxGenerations]);

  return {
    // state
    root,
    mode,
    layoutKind,
    maxGenerations,
    selected,
    editing,

    // derived
    rootId,

    // state setters
    setRoot,
    setMode,
    setLayoutKind,
    setMaxGenerations,
    setSelected,
    setEditing,

    // actions
    handlePickRoot,
    handleExportSvg,
    handleExportPdf,
  };
}