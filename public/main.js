const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");

const path = require("path");
const isDev = require("electron-is-dev");

const notesDataPath = path.join(app.getPath("userData"), "notesData.json");
require("@electron/remote/main").initialize();

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#2f3241",
      symbolColor: "#74b1be",
    },

    icon: `${__dirname}/../public/fav1.ico`,

    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  ipcMain.on("minimize-app", () => {
    win.minimize();
  });

  ipcMain.on("maximize-app", () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });

  ipcMain.on("close-app", () => {
    win.close();
  });
}

app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function loadNotes() {
  if (fs.existsSync(notesDataPath)) {
    return JSON.parse(fs.readFileSync(notesDataPath));
  }
  return []; // Return an empty array if the file does not exist
}

// Function to save notes data
function saveNotes(data) {
  fs.writeFileSync(notesDataPath, JSON.stringify(data));
}

// Handle IPC events for loading and saving notes
ipcMain.on("load-notes", (event) => {
  event.reply("notes-data", loadNotes());
});

ipcMain.on("save-notes", (event, notes) => {
  saveNotes(notes);
});

ipcMain.on("clear-notes", () => {
  fs.unlinkSync(notesDataPath);
  console.log("Notes cleared");
  const win = BrowserWindow.getFocusedWindow();
  win.reload();
  // win.loadURL(
  //   isDev
  //     ? "http://localhost:3000"
  //     : `file://${path.join(__dirname, "../build/index.html")}`
  // );
  // win.reload();
});
