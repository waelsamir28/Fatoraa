// جسر آمن بين واجهة البرنامج ونافذة الويندوز (تصغير / تكبير / خروج / تحديثات / معلومات التشغيل)
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

  // معلومات التشغيل (الإصدار، وضع التشغيل، قاعدة البيانات)
  getRuntimeInfo: () => ipcRenderer.invoke("app:runtime-info"),

  // التحديث التلقائي
  checkForUpdates: (manual = true) => ipcRenderer.invoke("update:check", manual),
  getUpdateState: () => ipcRenderer.invoke("update:get-state"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdateState: (cb) => {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on("update:state", handler);
    return () => ipcRenderer.removeListener("update:state", handler);
  },

  // أدوات مساعدة
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  switchMode: (mode) => ipcRenderer.invoke("app:switch-mode", mode),
  setCloudUrl: (url) => ipcRenderer.invoke("app:set-cloud-url", url),

  // شاشة الإعدادات (رابط السحابة + قاعدة البيانات)
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch),
  testCloudUrl: (url) => ipcRenderer.invoke("settings:test-cloud", url),
  testDatabaseUrl: (url) => ipcRenderer.invoke("settings:test-database", url),
  clearDatabaseUrl: () => ipcRenderer.invoke("settings:clear-database"),
  relaunchApp: () => ipcRenderer.invoke("app:relaunch"),
});
