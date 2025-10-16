import { useCallback, useMemo } from "react";
import { useAppSelector } from "../store";
import { Individual, IndividualSchema } from "../types/individual";
import { canAddParentChild } from "../utils/relationshipUtils";
import { useAddChild } from "./useAddChild";

type CreateAndLinkParams = {
  primaryParentId: string;
  otherParentId?: string | null;
  form: Partial<Individual>;
};

type LinkExistingParams = {
  parentIds: string[];
  childId: string;
};

export function useAddChildFlow() {
  const relationships = useAppSelector((s) => s.relationships.items);
  const { loading, error, canLink, addExistingChild, addNewChild } = useAddChild();

  const validateNoCycles = useCallback(
    (parentIds: string[], childId: string) => {
      for (const pid of parentIds) {
        const { ok } = canAddParentChild(relationships, pid, childId);
        if (!ok) return false;
      }
      return true;
    },
    [relationships]
  );

  const linkExisting = useCallback(
    async ({ parentIds, childId }: LinkExistingParams) => {
      if (!validateNoCycles(parentIds, childId)) {
        throw new Error("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
      }
      // Link each valid parent idempotently
      for (const pid of parentIds) {
        if (canLink(pid, childId)) {
          await addExistingChild(pid, childId);
        }
      }
    },
    [addExistingChild, canLink, validateNoCycles]
  );

  const createAndLink = useCallback(
    async ({ primaryParentId, otherParentId, form }: CreateAndLinkParams) => {
      // Validate the UI form via your schema (keeps previous behavior)
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
        throw new Error("Kontrollera barnets uppgifter.");
      }

      // 1) Create child + link to primary parent
      const childId = await addNewChild(primaryParentId, {
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

      // 2) Optionally link the second parent
      if (otherParentId && otherParentId !== primaryParentId) {
        if (!validateNoCycles([otherParentId], childId)) {
          // We don’t roll back primary link, mirroring current behavior
          throw new Error("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
        }
        if (canLink(otherParentId, childId)) {
          await addExistingChild(otherParentId, childId);
        }
      }
      return childId;
    },
    [addExistingChild, addNewChild, canLink, validateNoCycles]
  );

  return useMemo(
    () => ({
      loading,
      error,
      linkExisting,
      createAndLink,
    }),
    [loading, error, linkExisting, createAndLink]
  );
}