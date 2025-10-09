// src/utils/peopleSelectors.ts
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

/** Narrowing helpers for the Relationship discriminated union */
type SpouseRel = Extract<Relationship, { type: "spouse" }>;
type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;

function isParentChildRel(r: Relationship): r is ParentChildRel {
  return r.type === "parent-child";
}

function isSpouseRel(r: Relationship): r is SpouseRel {
  return r.type === "spouse";
}

/**
 * Parents of given child (as Individuals).
 */
export function getParentsOf(
  childId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Individual[] {
  const parentIds = relationships
    .filter(isParentChildRel)
    .filter((r) => r.childId === childId)
    .flatMap((r) => r.parentIds);

  const set = new Set(parentIds);
  return individuals.filter((i) => set.has(i.id));
}

/**
 * Children of a given parent (as Individuals).
 */
export function getChildrenOf(
  parentId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Individual[] {
  const childIds = relationships
    .filter(isParentChildRel)
    .filter((r) => r.parentIds.includes(parentId))
    .map((r) => r.childId);

  const set = new Set(childIds);
  return individuals.filter((i) => set.has(i.id));
}

/**
 * Spouses/partners of a given person.
 * Returns an array of objects with partner (Individual | undefined),
 * weddingDate (string | undefined) and relationship (Relationship).
 */
export function getSpousesOf(
  personId: string,
  relationships: Relationship[],
  individuals: Individual[]
): { partner: Individual; weddingDate?: string; relationship: Relationship }[] {
  const results: { partner: Individual; weddingDate?: string; relationship: Relationship }[] = [];

  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    if (rel.person1Id !== personId && rel.person2Id !== personId) continue;

    const partnerId = rel.person1Id === personId ? rel.person2Id : rel.person1Id;
    const partner = individuals.find((i) => i.id === partnerId);
    if (!partner) continue; // skip unknown individuals

    results.push({
      partner,
      weddingDate: rel.weddingDate,
      relationship: rel,
    });
  }

  return results;
}

/**
 * Group a person's children by the *other* known parent.
 * - Key = other parent's id, or "single" when no other parent is recorded.
 * - Value = list of child Individuals shared with that other parent (or single parent).
 */
export function groupChildrenByOtherParent(
  personId: string,
  relationships: Relationship[],
  individuals: Individual[]
): { partner: Individual | null; children: Individual[] }[] {
  const byId: Record<string, Individual> = Object.fromEntries(
    individuals.map((i) => [i.id, i])
  );

  const groups: { partner: Individual | null; children: Individual[] }[] = [];

  const pc = relationships
    .filter(isParentChildRel)
    .filter((r) => r.parentIds.includes(personId));

  for (const rel of pc) {
    const child = byId[rel.childId];
    if (!child) continue;

    const otherParentIds = rel.parentIds.filter((pid) => pid !== personId);

    if (otherParentIds.length === 0) {
      // no other parent
      let group = groups.find((g) => g.partner === null);
      if (!group) {
        group = { partner: null, children: [] };
        groups.push(group);
      }
      group.children.push(child);
    } else {
      for (const otherId of otherParentIds) {
        const partner = byId[otherId] ?? null;
        let group = groups.find((g) => g.partner?.id === partner?.id);
        if (!group) {
          group = { partner, children: [] };
          groups.push(group);
        }
        group.children.push(child);
      }
    }
  }

  return groups;
}