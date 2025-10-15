import { app } from "electron";
import path from "path";

type Key = "individuals" | "relationships";
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

  const dbPath = path.join(app.getPath("userData"), "family-tree.json");
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

// ──────────────────────────────────────────────
// Generic helpers
// ──────────────────────────────────────────────
async function list<T = any>(key: Key): Promise<T[]> {
  const data = await readDB();
  return data[key] as T[];
}

async function add<T = any>(key: Key, item: T): Promise<T> {
  const data = await readDB();
  (data[key] as T[]).push(item);
  await writeDB();
  return item;
}

async function update<T extends { id: string }>(
  key: Key,
  id: string,
  patch: Partial<T>
): Promise<T> {
  const data = await readDB();
  const arr = data[key] as T[];
  const found = arr.find((x) => x.id === id);
  if (!found) throw new Error(`${key.slice(0, -1)} not found`);
  Object.assign(found, patch);
  await writeDB();
  return found;
}

async function remove(key: Key, id: string): Promise<void> {
  const data = await readDB();
  if (key === "relationships") {
    data.relationships = data.relationships.filter((r: any) => r.id !== id);
  } else if (key === "individuals") {
    // Special rule: deleting an individual also cleans up relationships.
    data.individuals = data.individuals.filter((i: any) => i.id !== id);
    data.relationships = data.relationships
      .map((r: any) => {
        if (r.type === "parent-child") {
          if (r.childId === id) return null; // remove whole relation
          const newParents = r.parentIds.filter((pid: string) => pid !== id);
          if (newParents.length === 0) return null;
          if (newParents.length !== r.parentIds.length) {
            return { ...r, parentIds: newParents };
          }
          return r;
        }
        if (r.type === "spouse") {
          if (r.person1Id === id || r.person2Id === id) return null;
          return r;
        }
        return r;
      })
      .filter(Boolean);
  }
  await writeDB();
}

// ──────────────────────────────────────────────
// Individuals (thin wrappers keep behavior)
// ──────────────────────────────────────────────
export async function getIndividuals() {
  // Preserve migration logic exactly as before.
  const raw = await list<any>("individuals");
  return raw.map((ind: any) => {
    // Migration: split old "name" into given/family
    if (ind.name && (!ind.givenName || !ind.familyName)) {
      const parts = ind.name.trim().split(/\s+/);
      ind.givenName = parts.shift() || "";
      ind.familyName = parts.join(" ");
    }
    if (!ind.gender) ind.gender = "unknown";
    if (!ind.birthFamilyName) ind.birthFamilyName = "";
    return ind;
  });
}

export async function addIndividual(ind: any) {
  const data = await readDB();
  if (data.individuals.length >= 1000) {
    throw new Error("Maximum 1000 individuals reached");
  }
  return add("individuals", ind);
}
  
export async function updateIndividual(id: string, updates: any) {
  return update("individuals", id, updates);
}

export async function deleteIndividual(id: string) {
  // Use generic remover (which carries the special cleanup for individuals)
  await remove("individuals", id);
}

// Relationships
export async function getRelationships() {
  return list("relationships");
}

export async function addRelationship(rel: any) {
  return add("relationships", rel);
}

export async function updateRelationship(id: string, updates: any) {
  return update("relationships", id, updates);
}

export async function deleteRelationship(id: string) {
  await remove("relationships", id);
}
export async function resetDatabase() {
  await db.read();
  db.data = { individuals: [], relationships: [] };
  await db.write();
}
