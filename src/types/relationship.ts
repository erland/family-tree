import { z } from "zod";

export const RelationshipType = z.enum(["spouse", "parent-child"]);

export const SpouseRelationshipSchema = z.object({
  id: z.string(),
  type: z.literal("spouse"),
  person1Id: z.string(),
  person2Id: z.string(),
  weddingDate: z.string().optional(),
  groomRegion: z.string().optional(),
  groomCongregation: z.string().optional(),
  groomCity: z.string().optional(),
  brideRegion: z.string().optional(),
  brideCongregation: z.string().optional(),
  brideCity: z.string().optional(),
});

export const ParentChildRelationshipSchema = z.object({
  id: z.string(),
  type: z.literal("parent-child"),
  parentIds: z.array(z.string()).min(1),
  childId: z.string(),
});

export const RelationshipSchema = z.discriminatedUnion("type", [
  SpouseRelationshipSchema,
  ParentChildRelationshipSchema,
]);

export type Relationship = z.infer<typeof RelationshipSchema>;