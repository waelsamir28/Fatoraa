// جسر آمن بين واجهة البرنامج ونافذة الويندوز (تصغير / تكبير / خروج)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aljamalDesktop", {
  isDesktop: true,
  minimize: () => ipcRenderer.send("win:minimize"),
  toggleMaximize: () => ipcRenderer.send("win:toggle-maximize"),
  quit: () => ipcRenderer.send("app:quit"),
  isMaximized: () => ipcRenderer.invoke("win:is-maximized"),
  onMaximizedChange: (cb) => {
    const handler = (_event, value) => cb(value);
    ipcRenderer.on("win:maximized", handler);
    return () => ipcRenderer.removeListener("win:maximized", handler);
  },
});
