import { z } from "zod";

// NEW types for moves (flyttar)
export type Move = {
  id: string;
  /** ISO date 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' */
  date?: string;
  region?: string;
  city?: string;
  congregation?: string;
  note?: string;
};

export const MoveSchema = z.object({
  id: z.string(),
  date: z.string().optional(),          // allow partial dates as in rest of app
  region: z.string().optional(),
  city: z.string().optional(),
  congregation: z.string().optional(),
  note: z.string().optional(),
});

export const IndividualSchema = z.object({
  id: z.string(),
  gender: z.string().optional(),
  givenName: z.string().min(1, "Namn krävs"),
  familyName: z.string().optional(),
  birthFamilyName: z.string().optional(),

  dateOfBirth: z.string().optional(),
  birthRegion: z.string().optional(),
  birthCongregation: z.string().optional(),
  birthCity: z.string().optional(),

  dateOfDeath: z.string().optional(),
  deathRegion: z.string().optional(),
  deathCongregation: z.string().optional(),
  deathCity: z.string().optional(),

  moves: z.array(MoveSchema).optional(),

  story: z.string().optional(),
});

export type Individual = z.infer<typeof IndividualSchema>;