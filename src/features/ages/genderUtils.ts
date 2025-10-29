// src/features/ages/genderUtils.ts

export type NormalizedGender = "male" | "female" | "unknown";

const MALE_WORDS = ["m", "male", "man"];
const FEMALE_WORDS = ["f", "female", "kvinna"];

export function normalizeGender(raw: string | undefined | null): NormalizedGender {
  if (!raw) return "unknown";
  const g = raw.toLowerCase().trim();
  if (MALE_WORDS.includes(g)) return "male";
  if (FEMALE_WORDS.includes(g)) return "female";
  return "unknown";
}

/**
 * Returns true if an individual with `gender` should be shown
 * under the active filter ("all" | "male" | "female").
 */
export function genderMatchesFilter(
  rawGender: string | undefined | null,
  activeFilter: "all" | "male" | "female"
): boolean {
  if (activeFilter === "all") return true;
  return normalizeGender(rawGender) === activeFilter;
}

/**
 * Helpers exposed so other code can count unknowns per gender.
 */
export const isMale = (raw: string | undefined | null) =>
  normalizeGender(raw) === "male";

export const isFemale = (raw: string | undefined | null) =>
  normalizeGender(raw) === "female";