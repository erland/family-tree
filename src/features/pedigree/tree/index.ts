// src/features/pedigree/tree/index.ts
export { listTreeTypes, getTreeType } from "./registry";
export type { TreeType, TreeKind } from "./types";

// Side-effect imports: register built-in types when this module is imported.
import "./types-impl/circular";
import "./types-impl/orthogonal";