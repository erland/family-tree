import { app } from "electron";
import path from "path";

let Low: any;
let JSONFile: any;
let db: any;

const defaultData = {
  individuals: [],
  relationships: [],
};

// Initialize the DB
export async function initDB() {
  if (!Low || !JSONFile) {
    // 👇 Dynamic import of ESM-only lowdb
    const lowdb = await import("lowdb");
    const lowdbNode = await import("lowdb/node");
    Low = lowdb.Low;
    JSONFile = lowdbNode.JSONFile;
  }

  const dbPath = path.join(app.getPath("userData"), "genealogy.json");
  db = new Low(new JSONFile(dbPath), defaultData);

  await db.read();
  db.data ||= defaultData;
  await db.write();
  return db;
}

// Helpers
async function readDB() {
  await db.read();
  return db.data;
}

async function writeDB() {
  await db.write();
}

// Individuals
export async function getIndividuals() {
  const data = await readDB();
  return data.individuals.map((ind: any) => {
      // Migration: split old "name" into given/family
      if (ind.name && (!ind.givenName || !ind.familyName)) {
        const parts = ind.name.trim().split(/\s+/);
        ind.givenName = parts.shift() || "";
        ind.familyName = parts.join(" ");
      }
      return ind;
    });
}

export async function addIndividual(ind: any) {
  const data = await readDB();
  if (data.individuals.length >= 1000) {
    throw new Error("Maximum 1000 individuals reached");
  }
  data.individuals.push(ind);
  await writeDB();
  return ind;
}

export async function updateIndividual(id: string, updates: any) {
  const data = await readDB();
  const ind = data.individuals.find((i: any) => i.id === id);
  if (!ind) throw new Error("Individual not found");
  Object.assign(ind, updates);
  await writeDB();
  return ind;
}

export async function deleteIndividual(id: string) {
  const data = await readDB();

  // Remove the individual
  data.individuals = data.individuals.filter((i: any) => i.id !== id);

  // Clean up relationships
  data.relationships = data.relationships
    .map((r: any) => {
      if (r.type === "parent-child") {
        // Case: child matches -> remove whole relation
        if (r.childId === id) return null;

        // Case: parent matches -> filter it out
        const newParents = r.parentIds.filter((pid: string) => pid !== id);
        if (newParents.length === 0) return null; // orphaned relation
        if (newParents.length !== r.parentIds.length) {
          return { ...r, parentIds: newParents };
        }
        return r;
      }

      if (r.type === "spouse") {
        if (r.person1Id === id || r.person2Id === id) {
          return null; // remove spouse relation
        }
        return r;
      }

      return r; // keep other relation types
    })
    .filter(Boolean); // remove nulls

  await writeDB(); // ✅ no arguments
}

// Relationships
export async function getRelationships() {
  const data = await readDB();
  return data.relationships;
}

export async function addRelationship(rel: any) {
  const data = await readDB();
  data.relationships.push(rel);
  await writeDB();
  return rel;
}

export async function updateRelationship(id: string, updates: any) {
  const data = await readDB();
  const rel = data.relationships.find((r: any) => r.id === id);
  if (!rel) throw new Error("Relationship not found");
  Object.assign(rel, updates);
  await writeDB();
  return rel;
}

export async function deleteRelationship(id: string) {
  const data = await readDB();
  data.relationships = data.relationships.filter((r: any) => r.id !== id);
  await writeDB();
}