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
} from "./db";
import { individualSchema, relationshipSchema } from "../src/types/genealogy";

// Register IPC handlers (call once in main.ts)
export function registerIpcHandlers() {
  // ─────────────── Individuals ───────────────
  ipcMain.handle("individuals:list", async () => {
    return await getIndividuals();
  });

  ipcMain.handle("individuals:add", async (_event, individual) => {
    const parsed = individualSchema.parse(individual); // validation
    return await addIndividual(parsed);
  });

  ipcMain.handle("individuals:update", async (_event, id: string, updates) => {
    individualSchema.partial().parse(updates); // validate partial
    return await updateIndividual(id, updates);
  });

  ipcMain.handle("individuals:delete", async (_event, id: string) => {
    await deleteIndividual(id);
    return { success: true };
  });

  // ─────────────── Relationships ───────────────
  ipcMain.handle("relationships:list", async () => {
    return await getRelationships();
  });

  ipcMain.handle("relationships:add", async (_event, relationship) => {
    const parsed = relationshipSchema.parse(relationship);
    return await addRelationship(parsed);
  });

  ipcMain.handle("relationships:update", async (_event, id: string, updates) => {
    relationshipSchema.partial().parse(updates); // validate partial
    return await updateRelationship(id, updates);
  });

  ipcMain.handle("relationships:delete", async (_event, id: string) => {
    await deleteRelationship(id);
    return { success: true };
  });
}