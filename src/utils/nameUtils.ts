import { Individual } from "../types/individual";

export function fullName(ind?: Individual | null): string {
  if (!ind) return "";
  const family = ind.familyName || ind.birthFamilyName || "";
  return [ind.givenName, family].filter(Boolean).join(" ");
}