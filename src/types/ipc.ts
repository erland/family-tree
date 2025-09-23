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

  // 📦 New Excel export
  exportIndividualsExcel: () => Promise<{ success: boolean; path?: string }>;
  exportRelationshipsExcel: () => Promise<{ success: boolean; path?: string }>; // 👈 new
  exportGedcom: () => Promise<{ success: boolean; path?: string }>; // 👈 new
  importExcel(filePath: string): Promise<{ count: number; relCount: number }>;
}