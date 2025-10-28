// src/core/viewModelBuilders/pedigreeTree.ts

import type { Individual } from "@core/domain";

export type PedigreeMode = "descendants" | "ancestors";
export type PedigreeLayoutKind = "orthogonal" | "circular";

/**
 * When the user picks a root (via search / click),
 * we need to resolve that ID to a real Individual
 * and update both `root` and `selected`.
 *
 * This is pure and testable.
 */
export function pickRootById(
  individuals: Individual[],
  id: string
): {
  root: Individual | null;
  selected: Individual | null;
} {
  const person = individuals.find((i) => i.id === id) || null;
  return {
    root: person,
    selected: person,
  };
}

/**
 * Derive extra convenient values from the current tree state.
 * Right now it's just `rootId`, but keeping this as a function
 * means we can extend it later (e.g. computed generation depth)
 * and keep tests simple.
 */
export function derivePedigreeTreeState(root: Individual | null): {
  rootId?: string;
} {
  return {
    rootId: root?.id ?? undefined,
  };
}