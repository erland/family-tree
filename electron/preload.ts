import { contextBridge, ipcRenderer } from "electron";
import type { GenealogyAPI } from "../src/types/ipc";

const api: GenealogyAPI = {
  listIndividuals: () => ipcRenderer.invoke("individuals:list"),
  addIndividual: (individual) => ipcRenderer.invoke("individuals:add", individual),
  updateIndividual: (id, updates) => ipcRenderer.invoke("individuals:update", id, updates),
  deleteIndividual: (id) => ipcRenderer.invoke("individuals:delete", id),

  listRelationships: () => ipcRenderer.invoke("relationships:list"),
  addRelationship: (relationship) => ipcRenderer.invoke("relationships:add", relationship),
  updateRelationship: (id, updates) => ipcRenderer.invoke("relationships:update", id, updates),
  deleteRelationship: (id) => ipcRenderer.invoke("relationships:delete", id),

  exportIndividualsExcel: () => ipcRenderer.invoke("individuals:exportExcel"),
  exportRelationshipsExcel: () => ipcRenderer.invoke("relationships:exportExcel"), 

  importExcel: (filePath: string) => ipcRenderer.invoke("importExcel", filePath),

  exportGedcom: () => ipcRenderer.invoke("individuals:exportGedcom"),
  importGedcom: (filePath: string) => ipcRenderer.invoke("importGedcom", filePath),
  resetDatabase: () => ipcRenderer.invoke("resetDatabase"),
};
contextBridge.exposeInMainWorld("electronAPI", {
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
     ipcRenderer.invoke("showOpenDialog", options),
});
contextBridge.exposeInMainWorld("genealogyAPI", api);