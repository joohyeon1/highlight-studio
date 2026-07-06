const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("highlightDesktop", {
  onCommand(callback) {
    ipcRenderer.on("desktop:command", (_event, command) => callback(command));
  },
  onSettings(callback) {
    ipcRenderer.on("desktop:settings", (_event, settings) => callback(settings));
  }
});
