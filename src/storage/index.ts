// src/storage/index.ts

type Individual = any;
type Relationship = any;

type DBData = {
  individuals: Individual[];
  relationships: Relationship[];
};

const STORAGE_KEY = "genealogy-db";

const defaultData: DBData = {
  individuals: [],
  relationships: [],
};

function readRaw(): DBData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    return {
      individuals: Array.isArray(parsed.individuals)
        ? parsed.individuals
        : [],
      relationships: Array.isArray(parsed.relationships)
        ? parsed.relationships
        : [],
    };
  } catch {
    return { ...defaultData };
  }
}

function writeRaw(data: DBData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// mimic electron initDB for parity
export async function initDB() {
  const data = readRaw();
  writeRaw(data); // ensures shape exists
  return data;
}

async function getData(): Promise<DBData> {
  return readRaw();
}

async function setData(next: DBData): Promise<void> {
  writeRaw(next);
}

async function list<T = any>(key: keyof DBData): Promise<T[]> {
  const data = await getData();
  return data[key] as any;
}

async function add<T = any>(key: keyof DBData, item: T): Promise<T> {
  const data = await getData();
  (data[key] as any[]).push(item);
  await setData(data);
  return item;
}

async function updateItem<T extends { id: string }>(
  key: keyof DBData,
  id: string,
  patch: Partial<T>
): Promise<T> {
  const data = await getData();
  const arr = data[key] as any[];
  const found = arr.find((x: any) => x.id === id);
  if (!found) throw new Error(`${String(key).slice(0, -1)} not found`);
  Object.assign(found, patch);
  await setData(data);
  return found;
}

async function remove(key: keyof DBData, id: string): Promise<void> {
  const data = await getData();

  if (key === "relationships") {
    data.relationships = data.relationships.filter((r: any) => r.id !== id);
  } else if (key === "individuals") {
    // delete individual
    data.individuals = data.individuals.filter((i: any) => i.id !== id);

    // cascade cleanup exactly like your Electron db.ts
    data.relationships = data.relationships
      .map((r: any) => {
        if (r.type === "parent-child") {
          if (r.childId === id) return null;
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
      .filter(Boolean) as any[];
  }

  await setData(data);
}

// exported API (same shape as Electron db.ts)

export async function resetDatabase() {
  const blank = { individuals: [], relationships: [] };
  await setData(blank);
}

export async function getIndividuals() {
  const raw = await list<any>("individuals");
  return raw.map((ind: any) => {
    // migration rules from your electron db.ts
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
  const data = await getData();
  if (data.individuals.length >= 1000) {
    throw new Error("Maximum 1000 individuals reached");
  }
  return add("individuals", ind);
}

export async function updateIndividual(id: string, updates: any) {
  return updateItem("individuals", id, updates);
}

export async function deleteIndividual(id: string) {
  await remove("individuals", id);
}

export async function getRelationships() {
  return list("relationships");
}

export async function addRelationship(rel: any) {
  return add("relationships", rel);
}

export async function updateRelationship(id: string, updates: any) {
  return updateItem("relationships", id, updates);
}

export async function deleteRelationship(id: string) {
  await remove("relationships", id);
}