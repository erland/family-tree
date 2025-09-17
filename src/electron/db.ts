import { app } from "electron";
import path from "path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { Individual, Relationship } from "../src/types/genealogy";

// ──────────────────────────────────────────────
// Database schema
// ──────────────────────────────────────────────
export interface GenealogyDB {
  individuals: Individual[];
  relationships: Relationship[];
}

const defaultData: GenealogyDB = {
  individuals: [
    {
      id: crypto.randomUUID(),
      name: "First Person",
      birthDate: "1900-01-01T00:00:00.000Z",
      birthLocation: {
        region: "Example Region",
        congregation: "Example Congregation",
        city: "Example City",
      },
      story: "This is an example individual. Replace with your own data.",
    },
  ],
  relationships: [],
};

// ──────────────────────────────────────────────
// Lowdb initialization
// ──────────────────────────────────────────────
const dbPath = path.join(app.getPath("userData"), "genealogy.json");
const adapter = new JSONFile<GenealogyDB>(dbPath);
const db = new Low<GenealogyDB>(adapter, defaultData);

// Initialize database
export async function initDB() {
  await db.read();
  // If file is missing or empty, load defaults
  db.data ||= defaultData;
  await db.write();
  return db;
}

// ──────────────────────────────────────────────
// Core DB helpers
// ──────────────────────────────────────────────
export async function readDB() {
  await db.read();
  return db.data!;
}

export async function writeDB() {
  await db.write();
}

// ──────────────────────────────────────────────
// Individuals helpers
// ──────────────────────────────────────────────
export async function getIndividuals(): Promise<Individual[]> {
  const data = await readDB();
  return data.individuals;
}

export async function addIndividual(individual: Individual) {
  const data = await readDB();
  if (data.individuals.length >= 500) {
    throw new Error("Maximum of 500 individuals reached");
  }
  data.individuals.push(individual);
  await writeDB();
  return individual;
}

export async function updateIndividual(id: string, updates: Partial<Individual>) {
  const data = await readDB();
  const ind = data.individuals.find((i) => i.id === id);
  if (!ind) throw new Error("Individual not found");
  Object.assign(ind, updates);
  await writeDB();
  return ind;
}

export async function deleteIndividual(id: string) {
  const data = await readDB();
  data.individuals = data.individuals.filter((i) => i.id !== id);
  data.relationships = data.relationships.filter(
    (r) => !r.personIds.includes(id)
  ); // remove linked relationships
  await writeDB();
}

// ──────────────────────────────────────────────
// Relationships helpers
// ──────────────────────────────────────────────
export async function getRelationships(): Promise<Relationship[]> {
  const data = await readDB();
  return data.relationships;
}

export async function addRelationship(rel: Relationship) {
  const data = await readDB();
  data.relationships.push(rel);
  await writeDB();
  return rel;
}

export async function updateRelationship(id: string, updates: Partial<Relationship>) {
  const data = await readDB();
  const rel = data.relationships.find((r) => r.id === id);
  if (!rel) throw new Error("Relationship not found");
  Object.assign(rel, updates);
  await writeDB();
  return rel;
}

export async function deleteRelationship(id: string) {
  const data = await readDB();
  data.relationships = data.relationships.filter((r) => r.id !== id);
  await writeDB();
}