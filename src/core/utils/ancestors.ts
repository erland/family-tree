// src/utils/ancestors.ts
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

export type AncestorMatrix = (string | null)[][]; // [generation][slot] = individualId or null

// --- helper type guard for parent-child relations ---
function isParentChildRelation(
  r: Relationship
): r is Relationship & { parentIds: string[]; childId: string } {
  return r.type === "parent-child";
}

// --- getOrderedParents --------------------------------------------------------
export function getOrderedParents(
  childId: string,
  relationships: Relationship[],
  byId: Map<string, Individual>
): [string | null, string | null] {
  const rels = relationships.filter(
    (r): r is Relationship & { parentIds: string[]; childId: string } =>
      isParentChildRelation(r) && r.childId === childId
  );

  const allParents = new Set<string>();
  for (const r of rels) {
    for (const p of r.parentIds) allParents.add(p);
  }
  const parents = [...allParents];

  if (parents.length === 0) return [null, null];
  if (parents.length === 1) {
    const id = parents[0];
    const gender = byId.get(id)?.gender;
    if (gender === "M") return [id, null];
    // if female or unknown → treat as mother
    return [null, id];
  }

  // Try to order Father (male) first, then Mother (female)
  const males = parents.filter((id) => byId.get(id)?.gender === "M");
  const females = parents.filter((id) => byId.get(id)?.gender === "F");

  if (males.length === 1 && females.length === 1) return [males[0], females[0]];

  // Otherwise make it stable but deterministic
  parents.sort();
  return [parents[0], parents[1] ?? null];
}

// --- buildAncestorMatrix -----------------------------------------------------
/**
 * Build a 0..G ancestor matrix where:
 *  - generation 0 has 1 slot: [rootId]
 *  - generation 1 has 2 slots: [father, mother]
 *  - generation g has 2^g slots
 * Slots are filled using even=father branch, odd=mother branch.
 */
export function buildAncestorMatrix(
  rootId: string,
  individuals: Individual[],
  relationships: Relationship[],
  generations: number
): AncestorMatrix {
  const byId = new Map(individuals.map((i) => [i.id, i]));
  const M: AncestorMatrix = [];
  M[0] = [rootId];

  for (let g = 1; g <= generations; g++) {
    const slots = 1 << g; // 2^g
    const row: (string | null)[] = new Array(slots).fill(null);
    for (let i = 0; i < slots; i++) {
      const parentType = i % 2 === 0 ? "father" : "mother";
      const childIndex = Math.floor(i / 2);
      const childId = M[g - 1][childIndex];
      if (!childId) {
        row[i] = null;
        continue;
      }
      const [father, mother] = getOrderedParents(childId, relationships, byId);
      row[i] = parentType === "father" ? father : mother;
    }
    M[g] = row;
  }

  return M;
}

// --- fullName ----------------------------------------------------------------
/*
export function fullName(i?: Individual | null): string {
  if (!i) return "";

  const parts = [i.givenName, i.familyName].filter(Boolean);

  // Support both old and new field names
  const birth = i.dateOfBirth ?? (i as any).birthDate;
  const death = i.dateOfDeath ?? (i as any).deathDate;

  const years =
    birth || death ? ` (${birth?.slice(0, 4) ?? "?"}–${death?.slice(0, 4) ?? ""})` : "";

  return `${parts.join(" ")}${years}`;
}
  */