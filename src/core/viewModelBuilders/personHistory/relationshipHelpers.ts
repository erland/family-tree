// src/core/viewModelBuilders/personHistory/relationshipHelpers.ts
import { Relationship } from "../../domain";
import { ParentChildRel, SpouseRel } from "./types";

export function isParentChildRel(r: Relationship): r is ParentChildRel {
  return r.type === "parent-child";
}

export function isSpouseRel(r: Relationship): r is SpouseRel {
  return r.type === "spouse";
}