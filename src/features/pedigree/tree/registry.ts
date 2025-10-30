import type { TreeType } from "./types";

// Simple in-memory registry. No side effects unless a type-impl file is imported.
const REGISTRY = new Map<string, TreeType>();

export function registerTreeType(tt: TreeType) {
  // Silently ignore duplicate registrations to stay side-effect free.
  if (!REGISTRY.has(tt.id)) REGISTRY.set(tt.id, tt);
}

export function getTreeType(id: string): TreeType | undefined {
  return REGISTRY.get(id);
}

export function listTreeTypes(): TreeType[] {
  return Array.from(REGISTRY.values());
}