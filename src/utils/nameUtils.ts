import { Individual } from "../types/individual";

export function fullName(ind: Individual | undefined): string {
  if (!ind) return "";
  return [ind.givenName, ind.familyName].filter(Boolean).join(" ");
}