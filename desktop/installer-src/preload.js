// جسر آمن بين واجهة المثبّت والعملية الرئيسية
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installer", {
  getInfo: () => ipcRenderer.invoke("setup:info"),
  browse: (current) => ipcRenderer.invoke("setup:browse", current),
  install: (opts) => ipcRenderer.invoke("setup:install", opts),
  launch: () => ipcRenderer.invoke("setup:launch"),
  minimize: () => ipcRenderer.send("setup:minimize"),
  close: () => ipcRenderer.send("setup:close"),
  confirmUninstall: () => ipcRenderer.invoke("setup:confirmUninstall"),
  openFolder: () => ipcRenderer.invoke("setup:openFolder"),
  whatsNew: () => ipcRenderer.invoke("setup:whatsNew"),
  cancel: () => ipcRenderer.send("setup:cancel"),
  onProgress: (cb) => ipcRenderer.on("setup:progress", (_e, data) => cb(data)),
});
