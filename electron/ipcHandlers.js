const { ipcMain } = require("electron");
const {
  getIndividuals,
  addIndividual,
  updateIndividual,
  deleteIndividual,
  getRelationships,
  addRelationship,
  updateRelationship,
  deleteRelationship,
} = require("./db");

function registerIpcHandlers() {
  // Individuals
  ipcMain.handle("individuals:list", async () => await getIndividuals());

  ipcMain.handle("individuals:add", async (_e, individual) => {
    return await addIndividual(individual);
  });

  ipcMain.handle("individuals:update", async (_e, id, updates) => {
    return await updateIndividual(id, updates);
  });

  ipcMain.handle("individuals:delete", async (_e, id) => {
    await deleteIndividual(id);
    return { success: true };
  });

  // Relationships
  ipcMain.handle("relationships:list", async () => await getRelationships());

  ipcMain.handle("relationships:add", async (_e, rel) => {
    return await addRelationship(rel);
  });

  ipcMain.handle("relationships:update", async (_e, id, updates) => {
    return await updateRelationship(id, updates);
  });

  ipcMain.handle("relationships:delete", async (_e, id) => {
    await deleteRelationship(id);
    return { success: true };
  });
}

module.exports = { registerIpcHandlers };