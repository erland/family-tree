import { GenealogyAPI } from "./types/ipc";

declare global {
  interface Window {
    genealogyAPI: GenealogyAPI;
  }
}