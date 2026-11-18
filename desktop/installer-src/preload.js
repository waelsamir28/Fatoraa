// جسر آمن بين واجهة المثبّت والعملية الرئيسية
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installer", {
  getInfo: () => ipcRenderer.invoke("setup:info"),
  checkSystem: () => ipcRenderer.invoke("setup:checkSystem"),
  browse: (current) => ipcRenderer.invoke("setup:browse", current),
  install: (opts) => ipcRenderer.invoke("setup:install", opts),
  uninstall: (opts) => ipcRenderer.invoke("setup:uninstall", opts),
  launch: () => ipcRenderer.invoke("setup:launch"),
  minimize: () => ipcRenderer.send("setup:minimize"),
  close: () => ipcRenderer.send("setup:close"),
  openFolder: () => ipcRenderer.invoke("setup:openFolder"),
  whatsNew: () => ipcRenderer.invoke("setup:whatsNew"),
  cancel: () => ipcRenderer.send("setup:cancel"),
  onProgress: (cb) => ipcRenderer.on("setup:progress", (_e, data) => cb(data)),
});
