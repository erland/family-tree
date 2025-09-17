import { Individual, Relationship } from "./genealogy";

export interface GenealogyAPI {
  // Individuals
  listIndividuals: () => Promise<Individual[]>;
  addIndividual: (individual: Individual) => Promise<Individual>;
  updateIndividual: (
    id: string,
    updates: Partial<Individual>
  ) => Promise<Individual>;
  deleteIndividual: (id: string) => Promise<{ success: boolean }>;

  // Relationships
  listRelationships: () => Promise<Relationship[]>;
  addRelationship: (relationship: Relationship) => Promise<Relationship>;
  updateRelationship: (
    id: string,
    updates: Partial<Relationship>
  ) => Promise<Relationship>;
  deleteRelationship: (id: string) => Promise<{ success: boolean }>;
}