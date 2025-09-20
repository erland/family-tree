import { z } from "zod";

export const IndividualSchema = z.object({
  id: z.string(),
  gender: z.string().optional(),
  givenName: z.string().min(1, "Namn krävs"),
  familyName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  birthRegion: z.string().optional(),
  birthCongregation: z.string().optional(),
  birthCity: z.string().optional(),
  dateOfDeath: z.string().optional(),
  deathRegion: z.string().optional(),
  deathCongregation: z.string().optional(),
  deathCity: z.string().optional(),
  story: z.string().optional(),
});

export type Individual = z.infer<typeof IndividualSchema>;