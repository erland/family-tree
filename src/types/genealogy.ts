import { z } from "zod";

/**
 * ──────────────────────────────────────────────
 * TypeScript interfaces
 * ──────────────────────────────────────────────
 */

export interface Location {
  region: string;
  congregation: string;
  city: string;
}

export interface Individual {
  id: string;
  givenName: string;
  familyName: string;
  birthDate?: string; // ISO date
  birthLocation?: Location;
  deathDate?: string; // ISO date
  deathLocation?: Location;
  story?: string;
}

export type RelationshipType = "parentChild" | "spouse";

export interface Relationship {
  id: string;
  type: RelationshipType;
  personIds: string[]; // [parentId, childId] or [spouse1Id, spouse2Id]
  weddingDate?: string; // only for spouse
  groomLocation?: Location; // only for spouse
  brideLocation?: Location; // only for spouse
}

/**
 * ──────────────────────────────────────────────
 * Zod runtime schemas
 * ──────────────────────────────────────────────
 */

export const locationSchema = z.object({
  region: z.string(),
  congregation: z.string(),
  city: z.string(),
});

export const individualSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  birthDate: z.string().datetime().optional(),
  birthLocation: locationSchema.optional(),
  deathDate: z.string().datetime().optional(),
  deathLocation: locationSchema.optional(),
  story: z.string().optional(),
});

export const relationshipSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["parentChild", "spouse"]),
  personIds: z.array(z.string().uuid()).min(2).max(2),
  weddingDate: z.string().datetime().optional(),
  groomLocation: locationSchema.optional(),
  brideLocation: locationSchema.optional(),
});

/**
 * ──────────────────────────────────────────────
 * Helper for enforcing 500-individual limit
 * ──────────────────────────────────────────────
 */

export const MAX_INDIVIDUALS = 500;

export function canAddIndividual(currentCount: number): boolean {
  return currentCount < MAX_INDIVIDUALS;
}

// Example usage:
// if (!canAddIndividual(individuals.length)) {
//   throw new Error("Maximum of 500 individuals reached");
// }