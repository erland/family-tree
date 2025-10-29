// src/core/viewModelBuilders/personHistory/kinship.ts
import { Individual } from "../../domain";
import { Relationship } from "../../domain";
import { ParentChildRel } from "./types";
import { isParentChildRel } from "./relationshipHelpers";

// maps ancestor path like "ffm" -> "gammelfarmor"
export function relationName(path: string): string {
  if (path.length === 1) {
    return path === "f" ? "far" : "mor";
  }
  if (path.length === 2) {
    if (path === "ff") return "farfar";
    if (path === "fm") return "farmor";
    if (path === "mf") return "morfar";
    if (path === "mm") return "mormor";
  }
  if (path.length === 3) {
    if (path === "fff") return "gammelfarfar";
    if (path === "ffm") return "gammelfarmor";
    if (path === "mff") return "gammelmorfar";
    if (path === "mfm") return "gammelmormor";
    if (path === "mmf") return "gammelmorfar";
    if (path === "mmm") return "gammelmormor";
    if (path === "fmf") return "gammelfarfar";
    if (path === "fmm") return "gammelfarmor";
  }
  return "förfader";
}

// climb N generations up and remember each ancestor + kinship path
export function findAncestorsWithPath(
  ind: Individual,
  relationships: Relationship[],
  allIndividuals: Individual[],
  generations: number
): { id: string; path: string }[] {
  const result: { id: string; path: string }[] = [];
  let currentGen: { id: string; path: string }[] = [{ id: ind.id, path: "" }];

  for (let gen = 0; gen < generations; gen++) {
    const nextGen: { id: string; path: string }[] = [];
    for (const { id, path } of currentGen) {
      const parentRels = relationships.filter(
        (r): r is ParentChildRel => isParentChildRel(r) && r.childId === id
      );
      for (const rel of parentRels) {
        rel.parentIds.forEach((pid) => {
          const parent = allIndividuals.find((i) => i.id === pid);
          const step = parent?.gender === "male" ? "f" : "m";
          const newPath = path + step;
          result.push({ id: pid, path: newPath });
          nextGen.push({ id: pid, path: newPath });
        });
      }
    }
    currentGen = nextGen;
  }
  return result;
}