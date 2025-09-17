import { ipcMain } from "electron";
import {
  getIndividuals,
  addIndividual,
  updateIndividual,
  deleteIndividual,
  getRelationships,
  addRelationship,
  updateRelationship,
  deleteRelationship,
} from "./db.js";

export function registerIpcHandlers() {
  // Individuals
  ipcMain.handle("individuals:list", async () => await getIndividuals());
  ipcMain.handle("individuals:add", async (_e, individual) => await addIndividual(individual));
  ipcMain.handle("individuals:update", async (_e, id, updates) => await updateIndividual(id, updates));
  ipcMain.handle("individuals:delete", async (_e, id) => {
    await deleteIndividual(id);
    return id;
  });

  // Relationships
  ipcMain.handle("relationships:list", async () => await getRelationships());
  ipcMain.handle("relationships:add", async (_e, rel) => await addRelationship(rel));
  ipcMain.handle("relationships:update", async (_e, id, updates) => await updateRelationship(id, updates));
  ipcMain.handle("relationships:delete", async (_e, id) => {
    await deleteRelationship(id);
    return id;
  });
}