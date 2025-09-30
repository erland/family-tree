// src/utils/peopleSelectors.ts
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

export function getParentsOf(
  childId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Individual[] {
  const parentIds = relationships
    .filter((r) => r.type === "parent-child" && r.childId === childId)
    .flatMap((r) => r.parentIds);
  const set = new Set(parentIds);
  return individuals.filter((i) => set.has(i.id));
}

export function getSpousesOf(
  personId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Array<{ partner: Individual | undefined; relationship: Relationship; weddingDate?: string }> {
  return relationships
    .filter(
      (r) =>
        r.type === "spouse" && ((r as any).person1Id === personId || (r as any).person2Id === personId)
    )
    .map((r) => {
      const otherId =
        (r as any).person1Id === personId ? (r as any).person2Id : (r as any).person1Id;
      return { partner: individuals.find((i) => i.id === otherId), relationship: r, weddingDate: (r as any).weddingDate };
    });
}

export function getChildrenOf(
  parentId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Individual[] {
  const childIds = relationships
    .filter((r) => r.type === "parent-child" && r.parentIds.includes(parentId))
    .map((r) => r.childId);
  const set = new Set(childIds);
  return individuals.filter((i) => set.has(i.id));
}

/** Group a person's children by the *other* parent (if known). */
export function groupChildrenByOtherParent(
  personId: string,
  relationships: Relationship[],
  individuals: Individual[]
): Array<{ partner: Individual | null; children: Individual[] }> {
  const byKey = new Map<string, Individual[]>();

  const parentChild = relationships.filter(
    (r) => r.type === "parent-child" && r.parentIds.includes(personId)
  );

  parentChild.forEach((rel) => {
    const child = individuals.find((i) => i.id === rel.childId);
    if (!child) return;

    // Determine other parent(s). Some data may store separate parent-child rows per parent.
    let otherParentIds = rel.parentIds.filter((pid) => pid !== personId);
    if (otherParentIds.length === 0) {
      const allParentIdsForChild = relationships
        .filter((r) => r.type === "parent-child" && r.childId === rel.childId)
        .flatMap((r) => r.parentIds as string[]);
      otherParentIds = Array.from(new Set(allParentIdsForChild.filter((pid) => pid !== personId)));
    }

    const keys = otherParentIds.length > 0 ? otherParentIds : ["__solo__"];
    keys.forEach((k) => {
      const arr = byKey.get(k) ?? [];
      arr.push(child);
      byKey.set(k, arr);
    });
  });

  return Array.from(byKey.entries()).map(([k, children]) => ({
    partner: k === "__solo__" ? null : individuals.find((i) => i.id === k) ?? null,
    children,
  }));
}