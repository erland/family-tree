const { app } = require("electron");
const path = require("path");

let Low, JSONFile, db;

const defaultData = {
  individuals: [],
  relationships: [],
};

async function initDB() {
  if (!Low || !JSONFile) {
    // dynamically import ESM modules
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

async function readDB() {
  await db.read();
  return db.data;
}

async function writeDB() {
  await db.write();
}

// CRUD helpers
async function getIndividuals() {
  const data = await readDB();
  return data.individuals;
}

async function addIndividual(ind) {
  const data = await readDB();
  if (data.individuals.length >= 500) throw new Error("Maximum 500 individuals");
  data.individuals.push(ind);
  await writeDB();
  return ind;
}

async function updateIndividual(id, updates) {
  const data = await readDB();
  const ind = data.individuals.find((i) => i.id === id);
  if (!ind) throw new Error("Individual not found");
  Object.assign(ind, updates);
  await writeDB();
  return ind;
}

async function deleteIndividual(id) {
  const data = await readDB();
  data.individuals = data.individuals.filter((i) => i.id !== id);
  data.relationships = data.relationships.filter((r) => !r.personIds.includes(id));
  await writeDB();
}

async function getRelationships() {
  const data = await readDB();
  return data.relationships;
}

async function addRelationship(rel) {
  const data = await readDB();
  data.relationships.push(rel);
  await writeDB();
  return rel;
}

async function updateRelationship(id, updates) {
  const data = await readDB();
  const rel = data.relationships.find((r) => r.id === id);
  if (!rel) throw new Error("Relationship not found");
  Object.assign(rel, updates);
  await writeDB();
  return rel;
}

async function deleteRelationship(id) {
  const data = await readDB();
  data.relationships = data.relationships.filter((r) => r.id !== id);
  await writeDB();
}

module.exports = {
  initDB,
  getIndividuals,
  addIndividual,
  updateIndividual,
  deleteIndividual,
  getRelationships,
  addRelationship,
  updateRelationship,
  deleteRelationship,
};