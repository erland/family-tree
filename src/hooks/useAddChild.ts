import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { addIndividual } from "../features/individualsSlice";
import { addRelationship, updateRelationship } from "../features/relationshipsSlice";
import type { Individual } from "@core/domain";
import type { Relationship } from "@core/domain";

/** Narrow the union to the parent-child variant */
type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;
const isParentChild = (r: Relationship): r is ParentChildRel => r.type === "parent-child";

/**
 * Adds/links a child to a parent. Merge into an existing "parent-child" relation
 * for the child if present; otherwise create a new relation.
 */
export function useAddChild() {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  // Keep freshest values available inside callbacks (typed refs to help TS narrowing)
  const relationshipsRef = useRef<Relationship[]>(relationships as Relationship[]);
  const individualsRef = useRef<Individual[]>(individuals as Individual[]);
  useEffect(() => { relationshipsRef.current = relationships as Relationship[]; }, [relationships]);
  useEffect(() => { individualsRef.current = individuals as Individual[]; }, [individuals]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => {
    const map = new Map<string, Individual>();
    for (const i of individuals) map.set(i.id, i);
    return map;
  }, [individuals]); // <- if your linter complains, keep as [individuals]

  const canLink = useCallback((parentId: string, childId: string) => {
    if (!parentId || !childId) return false;
    if (parentId === childId) return false;

    const parent = individualsRef.current.find((i) => i.id === parentId);
    const child = individualsRef.current.find((i) => i.id === childId);
    if (!parent || !child) return false;

    const rels = relationshipsRef.current;
    // already linked?
    const already = rels.some(
      (r): r is ParentChildRel =>
        isParentChild(r) &&
        r.childId === childId &&
        Array.isArray(r.parentIds) &&
        r.parentIds.includes(parentId)
    );
    return !already;
  }, []);

  const addExistingChild = useCallback(
    async (parentId: string, childId: string) => {
      setError(null);
      if (!canLink(parentId, childId)) {
        const msg = "Ogiltig länk eller relationen finns redan.";
        setError(msg);
        throw new Error(msg);
      }

      setLoading(true);
      try {
        const rels = relationshipsRef.current;

        // Re-narrow right here so TS is 100% sure about parentIds
        const existingRel = rels.find(
          (r): r is ParentChildRel => isParentChild(r) && r.childId === childId
        );

        if (existingRel) {
          const merged = Array.from(new Set([...(existingRel.parentIds ?? []), parentId]));
          await dispatch(
            updateRelationship({ ...existingRel, parentIds: merged } as Relationship)
          ).unwrap();
        } else {
          await dispatch(
            addRelationship({
              type: "parent-child",
              parentIds: [parentId],
              childId,
            } as Relationship)
          ).unwrap();
        }
      } catch (e: any) {
        setError(e?.message ?? "Misslyckades att länka barn.");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, canLink]
  );

  const addNewChild = useCallback(
    async (parentId: string, data: Partial<Individual>) => {
      setError(null);
      setLoading(true);
      try {
        // create the child first
        const created = await dispatch(
          addIndividual({
            // let the slice/thunk assign id if missing
            givenName: data.givenName ?? "",
            familyName: data.familyName ?? "",
            birthFamilyName: data.birthFamilyName ?? "",
            dateOfBirth: data.dateOfBirth ?? "",
            birthRegion: data.birthRegion ?? "",
            birthCongregation: data.birthCongregation ?? "",
            birthCity: data.birthCity ?? "",
            dateOfDeath: data.dateOfDeath ?? "",
            deathRegion: data.deathRegion ?? "",
            deathCongregation: data.deathCongregation ?? "",
            deathCity: data.deathCity ?? "",
            gender: (data.gender as any) ?? "unknown",
            story: data.story ?? "",
          } as Individual)
        ).unwrap();

        const childId = (created as Individual).id;
        // link the new child to the parent (this will create or merge)
        await addExistingChild(parentId, childId);
        return childId;
      } catch (e: any) {
        setError(e?.message ?? "Misslyckades att skapa barn.");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, addExistingChild]
  );

  return {
    loading,
    error,
    canLink,            // (parentId, childId) -> boolean
    addExistingChild,   // (parentId, childId) -> Promise<void>
    addNewChild,        // (parentId, data) -> Promise<childId>
    byId,
  };
}