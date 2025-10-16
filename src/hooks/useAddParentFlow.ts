import { useCallback, useMemo } from "react";
import { useAppSelector } from "../store";
import { Individual, IndividualSchema } from "../types/individual";
import { canAddParentChild } from "../utils/relationshipUtils";
import { useAddParent } from "./useAddParent";

/** create-new + link (with optional second parent) */
type CreateAndLinkParams = {
  childId: string;
  withOtherParentId?: string | null;
  form: Partial<Individual>;
};

/** link one or more existing parents */
type LinkExistingParams = {
  childId: string;
  parentIds: string[];
};

export function useAddParentFlow() {
  const relationships = useAppSelector((s) => s.relationships.items);
  const { loading, error, canLink, addExistingParent, addNewParent } = useAddParent();

  const validateNoCycles = useCallback(
    (childId: string, parentIds: string[]) =>
      parentIds.every((pid) => canAddParentChild(relationships, pid, childId).ok),
    [relationships]
  );

  const linkExisting = useCallback(
    async ({ childId, parentIds }: LinkExistingParams) => {
      if (!validateNoCycles(childId, parentIds)) {
        throw new Error("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
      }
      // Link idempotently (skip already-linked pairs)
      for (const pid of parentIds) {
        if (canLink(childId, pid)) {
          await addExistingParent(childId, pid);
        }
      }
    },
    [addExistingParent, canLink, validateNoCycles]
  );

  const createAndLink = useCallback(
    async ({ childId, withOtherParentId, form }: CreateAndLinkParams) => {
      // Build & validate via your Zod schema (same fields you used in the dialog)
      const candidate: Individual = {
        id: "TEMP",
        givenName: form.givenName ?? "",
        birthFamilyName: form.birthFamilyName ?? "",
        familyName: form.familyName ?? "",
        dateOfBirth: form.dateOfBirth ?? "",
        birthRegion: form.birthRegion ?? "",
        birthCongregation: form.birthCongregation ?? "",
        birthCity: form.birthCity ?? "",
        dateOfDeath: form.dateOfDeath ?? "",
        deathRegion: form.deathRegion ?? "",
        deathCongregation: form.deathCongregation ?? "",
        deathCity: form.deathCity ?? "",
        gender: (form.gender as any) ?? "unknown",
        story: form.story ?? "",
      };
      const parsed = IndividualSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new Error("Kontrollera förälderns uppgifter.");
      }

      // 1) Create parent & link to child
      const parentId = await addNewParent(childId, {
        givenName: parsed.data.givenName || undefined,
        familyName: parsed.data.familyName || parsed.data.birthFamilyName || undefined,
        dateOfBirth: parsed.data.dateOfBirth || undefined,
        birthRegion: parsed.data.birthRegion || undefined,
        birthCongregation: parsed.data.birthCongregation || undefined,
        birthCity: parsed.data.birthCity || undefined,
        dateOfDeath: parsed.data.dateOfDeath || undefined,
        deathRegion: parsed.data.deathRegion || undefined,
        deathCongregation: parsed.data.deathCongregation || undefined,
        deathCity: parsed.data.deathCity || undefined,
        gender: parsed.data.gender,
        story: parsed.data.story || undefined,
      });

      // 2) Optionally merge another known parent
      if (withOtherParentId && withOtherParentId !== parentId) {
        if (!validateNoCycles(childId, [withOtherParentId])) {
          // we don't roll back the first link (matches your current behavior)
          throw new Error("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
        }
        if (canLink(childId, withOtherParentId)) {
          await addExistingParent(childId, withOtherParentId);
        }
      }

      return parentId;
    },
    [addNewParent, addExistingParent, canLink, validateNoCycles]
  );

  return useMemo(
    () => ({ loading, error, linkExisting, createAndLink }),
    [loading, error, linkExisting, createAndLink]
  );
}