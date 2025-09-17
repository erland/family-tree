const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpcHandlers } = require("./ipcHandlers");
const { initDB } = require("./db");

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

  win.loadURL("http://localhost:5173");

  // 👇 automatically open DevTools
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);