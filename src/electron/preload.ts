import { contextBridge, ipcRenderer } from "electron";
import { GenealogyAPI } from "../types/ipc";

const api: GenealogyAPI = {
  listIndividuals: () => ipcRenderer.invoke("individuals:list"),
  addIndividual: (individual) => ipcRenderer.invoke("individuals:add", individual),
  updateIndividual: (id, updates) =>
    ipcRenderer.invoke("individuals:update", id, updates),
  deleteIndividual: (id) => ipcRenderer.invoke("individuals:delete", id),

  listRelationships: () => ipcRenderer.invoke("relationships:list"),
  addRelationship: (relationship) =>
    ipcRenderer.invoke("relationships:add", relationship),
  updateRelationship: (id, updates) =>
    ipcRenderer.invoke("relationships:update", id, updates),
  deleteRelationship: (id) =>
    ipcRenderer.invoke("relationships:delete", id),
};

contextBridge.exposeInMainWorld("genealogyAPI", api);