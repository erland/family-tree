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
import { exportIndividualsExcel, exportRelationshipsExcel } from "./exportExcel.js";


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

  // Exports
  ipcMain.handle("individuals:exportExcel", async () => {
    return exportIndividualsExcel();
  });
  ipcMain.handle("relationships:exportExcel", async () => {
    return exportRelationshipsExcel(); // 👈 new
  });

  /*
  // Excel exports
  ipcMain.handle("individuals:exportExcel", async () => {
    const individuals = await getIndividuals();
  
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Individer");
  
    // Define headers
    sheet.columns = [
      { header: "ID", key: "id", width: 36 },
      { header: "Namn", key: "name", width: 25 },
      { header: "Födelsedatum", key: "dateOfBirth", width: 15 },
      { header: "Region (födelse)", key: "birthRegion", width: 20 },
      { header: "Församling (födelse)", key: "birthCongregation", width: 20 },
      { header: "Stad (födelse)", key: "birthCity", width: 20 },
      { header: "Dödsdatum", key: "dateOfDeath", width: 15 },
      { header: "Region (död)", key: "deathRegion", width: 20 },
      { header: "Församling (död)", key: "deathCongregation", width: 20 },
      { header: "Stad (död)", key: "deathCity", width: 20 },
      { header: "Berättelse", key: "story", width: 40 },
    ];
  
    // Add rows
    individuals.forEach((i: any) => sheet.addRow(i));
  
    // Style header row
    sheet.getRow(1).font = { bold: true };
  
    // Save dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Exportera individer till Excel",
      defaultPath: "individuals.xlsx",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
  
    if (!canceled && filePath) {
      await workbook.xlsx.writeFile(filePath);
      return { success: true, path: filePath };
    }
  
    return { success: false };
  });
*/

}