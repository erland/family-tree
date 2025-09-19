import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { registerIpcHandlers } from "./ipcHandlers.js";
import { initDB } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWindow() {
  await initDB();
  registerIpcHandlers();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    // ✅ Go two levels up from dist-electron/electron to reach /dist/index.html
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
    //win.webContents.openDevTools();
  } else {
    win.loadURL("http://localhost:5173");
    //win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);