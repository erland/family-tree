// src/core/viewModelBuilders/personHistory/types.ts
// TODO: adjust these import paths to match your actual codebase.
import { Individual } from "../../domain";       // e.g. "../../domain/person"
import { Relationship } from "../../domain";     // e.g. "../../domain/relationship"

export type LifeEventType =
  | "birth"
  | "death"
  | "marriage"
  | "spouseDeath"
  | "childBirth"
  | "childDeath"
  | "grandchildBirth"
  | "grandchildDeath"
  | "ancestorBirth"
  | "ancestorDeath"
  | "siblingBirth"
  | "siblingDeath"
  | "move"
  | "custom";

export type LifeEvent = {
  type: LifeEventType;
  date?: string;
  label: string;
  individual: Individual;
  relatedIndividuals?: Individual[];
  ageAtEvent?: string;
  location?: {
    region?: string;
    city?: string;
    congregation?: string;
  };
};

// For “where has this person been” timelines
export type LocationEvent = {
  id: string;
  kind: "birth" | "move" | "death";
  date?: string;
  label: string;
  note?: string;
};

// Narrowed relationship helpers
export type SpouseRel = Extract<Relationship, { type: "spouse" }>;
export type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;