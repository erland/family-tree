import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { addIndividual } from "../individualsSlice";
import { addRelationship, updateRelationship } from "../relationshipsSlice";
import type { Individual } from "@core/domain";
import type { Relationship } from "@core/domain";

/** Narrow the union to the parent-child variant */
type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;
const isParentChild = (r: Relationship): r is ParentChildRel => r.type === "parent-child";

/**
 * Adds/links a parent to a child. If a parent-child relation for that child exists,
 * we merge the new parent into parentIds; otherwise we create a new relation.
 */
export function useAddParent() {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const relationshipsRef = useRef(relationships);
  const individualsRef = useRef(individuals);
  useEffect(() => { relationshipsRef.current = relationships; }, [relationships]);
  useEffect(() => { individualsRef.current = individuals; }, [individuals]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => {
    const map = new Map<string, Individual>();
    for (const i of individuals) map.set(i.id, i);
    return map;
  }, [individuals]);

  // signature here is (childId, parentId) to match the parent-centric flow
  const canLink = useCallback((childId: string, parentId: string) => {
    if (!childId || !parentId) return false;
    if (childId === parentId) return false;

    const parent = individualsRef.current.find((i) => i.id === parentId);
    const child = individualsRef.current.find((i) => i.id === childId);
    if (!parent || !child) return false;

    const rels = relationshipsRef.current;
    const already = rels.some(
      (r): r is ParentChildRel =>
        isParentChild(r) &&
        r.childId === childId &&
        Array.isArray(r.parentIds) &&
        r.parentIds.includes(parentId)
    );
    return !already;
  }, []);

  const addExistingParent = useCallback(
    async (childId: string, parentId: string) => {
      setError(null);
      if (!canLink(childId, parentId)) {
        const msg = "Ogiltig länk eller relationen finns redan.";
        setError(msg);
        throw new Error(msg);
      }

      setLoading(true);
      try {
        const rels = relationshipsRef.current;
        const existing = rels.find(
          (r): r is ParentChildRel => isParentChild(r) && r.childId === childId
        );

        if (existing) {
          const merged = Array.from(new Set([...(existing.parentIds ?? []), parentId]));
          await dispatch(
            updateRelationship({ ...existing, parentIds: merged } as Relationship)
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
        setError(e?.message ?? "Misslyckades att länka förälder.");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, canLink]
  );

  const addNewParent = useCallback(
    async (childId: string, data: Partial<Individual>) => {
      setError(null);
      setLoading(true);
      try {
        const created = await dispatch(
          addIndividual({
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

        const parentId = (created as Individual).id;
        await addExistingParent(childId, parentId);
        return parentId;
      } catch (e: any) {
        setError(e?.message ?? "Misslyckades att skapa förälder.");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, addExistingParent]
  );

  return {
    loading,
    error,
    canLink,             // (childId, parentId)
    addExistingParent,   // (childId, parentId)
    addNewParent,        // (childId, data) -> parentId
    byId,
  };
}