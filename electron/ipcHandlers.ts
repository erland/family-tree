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
import { exportExcel, exportRelationshipsExcel } from "./exportExcel.js";   // 👈 use the new unified export
import { importExcel } from "./importExcel.js";
import { generateGedcom } from "./exportGedcom.js";
import { importGedcom } from "./importGedcom.js";
import { resetDatabase } from "./db.js";
import fs from "fs";

export function registerIpcHandlers() {
  // ──────────────────────────────────────────────
  // DRY CRUD registrar
  // ──────────────────────────────────────────────
  function registerCRUD<T>(
    prefix: string,
    svc: {
      list: () => Promise<T[]>;
      add: (x: T) => Promise<T>;
      update: (id: string, patch: Partial<T>) => Promise<T>;
      remove: (id: string) => Promise<any>;
    }
  ) {
    ipcMain.handle(`${prefix}:list`, async () => svc.list());
    ipcMain.handle(`${prefix}:add`, async (_e, item) => svc.add(item));
    ipcMain.handle(`${prefix}:update`, async (_e, id, updates) =>
      svc.update(id, updates)
    );
    ipcMain.handle(`${prefix}:delete`, async (_e, id) => {
      await svc.remove(id);
      return id;
    });
  }

  // Individuals
  registerCRUD("individuals", {
    list: getIndividuals,
    add: addIndividual,
    update: updateIndividual,
    remove: deleteIndividual,
  });

  // Relationships
  registerCRUD("relationships", {
    list: getRelationships,
    add: addRelationship,
    update: updateRelationship,
    remove: deleteRelationship,
  });

  ipcMain.handle("relationships:exportExcel", async () => {
    return exportRelationshipsExcel(); // 👈 new
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
  ipcMain.handle("importGedcom", async (_event, filePath: string) => {
    const { individuals, relationships } = await importGedcom(filePath);
  
    for (const ind of individuals) await addIndividual(ind);
    for (const rel of relationships) await addRelationship(rel);
  
    return { count: individuals.length, relCount: relationships.length };
  });
  ipcMain.handle("resetDatabase", async () => {
    await resetDatabase();
    return { success: true };
  });
}