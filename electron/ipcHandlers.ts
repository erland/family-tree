import { ipcMain } from "electron";
import { dialog, BrowserWindow } from "electron";
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
import { exportExcel } from "./exportExcel.js";   // 👈 use the new unified export
import { importExcel } from "./importExcel.js";
import { generateGedcom } from "../src/utils/exportGedcom.js";
import fs from "fs";

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

  // Excel Export (unified)
  ipcMain.handle("individuals:exportExcel", async () => {
    const individuals = await getIndividuals();
    const relationships = await getRelationships();

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Exportera till Excel",
      defaultPath: "slakten.xlsx",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (!canceled && filePath) {
      await exportExcel(individuals, relationships, filePath);
      return { success: true, path: filePath };
    }

    return { success: false };
  });

  // Excel Import
  ipcMain.handle("importExcel", async (_event, filePath: string) => {
    const { individuals, relationships } = await importExcel(filePath);

    // Save imported data to DB
    for (const ind of individuals) {
      await addIndividual(ind);
    }
    for (const rel of relationships) {
      await addRelationship(rel);
    }

    return { count: individuals.length, relCount: relationships.length };
  });

  ipcMain.handle("showOpenDialog", async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, options);
    return result.filePaths;
  });
  
  ipcMain.handle("individuals:exportGedcom", async () => {
    const individuals = await getIndividuals();
    const relationships = await getRelationships();
  
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Exportera till GEDCOM",
      defaultPath: "slakten.ged",
      filters: [{ name: "GEDCOM", extensions: ["ged"] }],
    });
  
    if (!canceled && filePath) {
      const ged = generateGedcom(individuals, relationships);
      fs.writeFileSync(filePath, ged, "utf-8");
      return { success: true, path: filePath };
    }
    return { success: false };
  });
}