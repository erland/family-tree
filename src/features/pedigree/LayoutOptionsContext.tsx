import React, { createContext, useContext, useMemo } from "react";

export type LayoutOptionsContextValue = {
  treeTypeId: string;                 // e.g. "circular" | "orthogonal"
  values: Record<string, any>;        // per-tree option values (schema-driven)
};

const LayoutOptionsContext = createContext<LayoutOptionsContextValue>({
  treeTypeId: "orthogonal",
  values: {},
});

/**
 * Provide the active tree type and its option values to the pedigree canvas.
 * Builders/components can read via `useLayoutOptions()` with zero coupling.
 */
export function LayoutOptionsProvider({
  treeTypeId,
  values,
  children,
}: {
  treeTypeId: string;
  values: Record<string, any>;
  children: React.ReactNode;
}) {
  const v = useMemo(() => ({ treeTypeId, values }), [treeTypeId, values]);
  return (
    <LayoutOptionsContext.Provider value={v}>
      {children}
    </LayoutOptionsContext.Provider>
  );
}

/** Read the current tree type and its (schema) option values inside the canvas. */
export function useLayoutOptions(): LayoutOptionsContextValue {
  return useContext(LayoutOptionsContext);
}