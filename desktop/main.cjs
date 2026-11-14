// برنامج FATORA - نسخة الويندوز (Electron)
// - الوضع السحابي (افتراضي): يفتح واجهة البرنامج من Vercel => أي تعديل على الويب يظهر فوراً
//   ولو مفيش إنترنت يشتغل على النسخة المدمجة محلياً تلقائياً.
// - التحديث التلقائي: يتحقق من GitHub Releases ويحمّل وينصّب الإصدار الجديد.
const { app, BrowserWindow, ipcMain, utilityProcess, dialog, shell, Menu, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");

const APP_TITLE = "برنامج FATORA - لإدارة المحلات التجارية";
const DEV = process.argv.includes("--dev");
const DEV_URL = process.env.ALGAMAL_DEV_URL || "http://localhost:3000";

// رابط نسخة الويب على Vercel (يُقرأ من ملف cloud.json أو من متغير بيئة)
const DEFAULT_CLOUD_URL = "https://fatoraa.vercel.app";

app.setPath("userData", path.join(app.getPath("appData"), "AlGamalPOS"));
app.setAppUserModelId("com.algamal.pos");

let mainWindow = null;
let splash = null;
let server = null;
let baseUrl = "";
let quitting = false;
let serverStarted = false;
let cloudUrl = "";
let currentMode = "local"; // "cloud" | "local"

const iconPath = () => path.join(__dirname, "build", "icon.png");
const logFile = () => {
  const dir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "server.log");
};
function log(line) {
  try {
    fs.appendFileSync(logFile(), `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    /* ignore */
  }
}

/** ملفات الإعدادات على جهاز المستخدم */
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
  } catch {
    return {};
  }
}
function writeSettings(patch) {
  try {
    const next = { ...readSettings(), ...patch };
    fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2), "utf8");
    return next;
  } catch (e) {
    log(`settings write failed: ${e}`);
    return readSettings();
  }
}

/** رابط السحابة: من settings.json ثم متغير البيئة ثم الملف المرفق مع البرنامج */
function resolveCloudUrl() {
  const fromSettings = readSettings().cloudUrl;
  if (fromSettings) return String(fromSettings).trim().replace(/\/+$/, "");
  if (process.env.FATORA_CLOUD_URL) return String(process.env.FATORA_CLOUD_URL).trim().replace(/\/+$/, "");
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "cloud.json"), "utf8"));
    if (cfg.cloudUrl) return String(cfg.cloudUrl).trim().replace(/\/+$/, "");
  } catch {
    /* ignore */
  }
  return DEFAULT_CLOUD_URL;
}

function getDatabaseUrl() {
  return readSettings().databaseUrl || process.env.FATORA_DATABASE_URL || "";
}

/** إخفاء كلمة سر قاعدة البيانات عند عرضها في الواجهة */
function maskDatabaseUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return String(url).replace(/:\/\/([^:/@]+):[^@]*@/, "://$1:****@");
  }
}

/** اختبار الاتصال بقاعدة بيانات قبل حفظها (بمهلة 12 ثانية) */
function testDatabaseUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ ok: false, error: "لم يتم إدخال رابط قاعدة البيانات" });
    let Client;
    try {
      ({ Client } = require("pg"));
    } catch {
      // pg غير مرفق مع البرنامج: نتحقق من صحة الصيغة فقط
      try {
        const u = new URL(url);
        return resolve({ ok: Boolean(u.hostname), host: u.hostname, checked: "format" });
      } catch {
        return resolve({ ok: false, error: "صيغة الرابط غير صحيحة" });
      }
    }
    const client = new Client({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      client.end().catch(() => undefined);
      resolve(r);
    };
    client.connect((err) => {
      if (err) return finish({ ok: false, error: String(err.message || err) });
      client.query("select 1", (e2) => {
        if (e2) return finish({ ok: false, error: String(e2.message || e2) });
        let host = "";
        try {
          host = new URL(url).hostname;
        } catch {
          /* ignore */
        }
        finish({ ok: true, host, checked: "live" });
      });
    });
    setTimeout(() => finish({ ok: false, error: "انتهت مهلة الاتصال (12 ثانية) — تحقق من الرابط والإنترنت" }), 12500);
  });
}

/** اختبار الوصول إلى رابط السحابة */
async function testCloudUrl(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) return { ok: false, error: "لم يتم إدخال رابط السحابة" };
  try {
    const u = new URL(clean);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, error: "الرابط يجب أن يبدأ بـ http أو https" };
  } catch {
    return { ok: false, error: "صيغة الرابط غير صحيحة" };
  }
  const started = Date.now();
  const online = await isOnline(clean, 8000);
  return online
    ? { ok: true, ms: Date.now() - started }
    : { ok: false, error: "تعذر الوصول إلى الرابط — تأكد أن المشروع منشور على Vercel" };
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(start);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitFor(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      let settled = false;
      const retry = () => {
        if (settled) return;
        settled = true;
        if (Date.now() - started > timeoutMs) reject(new Error("انتهت مهلة تشغيل خادم البرنامج"));
        else setTimeout(attempt, 350);
      };
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          settled = true;
          resolve();
        } else retry();
      });
      req.on("error", retry);
      req.setTimeout(4000, () => req.destroy());
    };
    attempt();
  });
}

/** فحص سريع: هل الموقع السحابي متاح؟ (مهلة 5 ثوان) */
function isOnline(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    try {
      const req = http.get(`${url}/api/health`, (res) => {
        res.resume();
        finish(res.statusCode === 200);
      });
      req.on("error", () => finish(false));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        finish(false);
      });
    } catch {
      finish(false);
    }
  });
}

async function startServer() {
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, "app-server")
    : path.join(__dirname, "app-server");
  const entry = path.join(serverDir, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(`ملفات البرنامج غير موجودة:\n${entry}\n\nشغّل الأمر: npm run prepare-app`);
  }
  const port = await getFreePort();
  const dataDir = path.join(app.getPath("userData"), "database");
  fs.mkdirSync(dataDir, { recursive: true });

  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) log("database: cloud (DATABASE_URL from settings)");
  else log("database: embedded (PGlite) - no DATABASE_URL configured");

  server = utilityProcess.fork(entry, [], {
    cwd: serverDir,
    stdio: "pipe",
    serviceName: "AlGamal Server",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      // لو مفيش رابط قاعدة بيانات نستخدم القاعدة المدمجة على الجهاز
      ...(databaseUrl ? { DATABASE_URL: databaseUrl, DB_DRIVER: "postgres" } : { DB_DRIVER: "pglite", PGLITE_DATA_DIR: dataDir }),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  serverStarted = true;
  server.stdout?.on("data", (d) => log(String(d).trim()));
  server.stderr?.on("data", (d) => log(`ERR ${String(d).trim()}`));
  server.on("exit", (code) => {
    log(`server exited with code ${code}`);
    serverStarted = false;
    if (!quitting) {
      dialog.showErrorBox(APP_TITLE, `توقف خادم البرنامج بشكل غير متوقع وسيتم الإغلاق.\nملف السجل:\n${logFile()}`);
      quitting = true;
      app.quit();
    }
  });

  baseUrl = `http://127.0.0.1:${port}`;
  await waitFor(`${baseUrl}/api/health`, 120000);
}

function createSplash() {
  splash = new BrowserWindow({
    width: 540,
    height: 330,
    frame: false,
    resizable: false,
    center: true,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: "#0b3a8c",
    icon: iconPath(),
    title: APP_TITLE,
  });
  splash.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow() {
  Menu.setApplicationMenu(null);
  const area = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1180, area.width),
    height: Math.min(820, area.height),
    center: true,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: "#0b3a8c",
    title: APP_TITLE,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (splash && !splash.isDestroyed()) splash.destroy();
  });
  mainWindow.on("maximize", () => mainWindow.webContents.send("win:maximized", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("win:maximized", false));

  // تأكيد الخروج عند الضغط على Alt+F4 أو إغلاق من شريط المهام
  mainWindow.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["نعم", "لا"],
      defaultId: 0,
      cancelId: 1,
      title: "برنامج FATORA",
      message: "هل تريد الخروج من برنامج FATORA؟",
    });
    if (choice === 0) {
      quitting = true;
      app.quit();
    }
  });

  const isInternal = (url) =>
    url.startsWith(baseUrl) || (cloudUrl && url.startsWith(cloudUrl));
  // نوافذ الطباعة داخل البرنامج - والروابط الخارجية (واتساب / اتصال) في النظام
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: { width: 920, height: 1000, autoHideMenuBar: true, icon: iconPath(), title: "طباعة الفاتورة" },
      };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (DEV && input.type === "keyDown" && input.key === "F12") mainWindow.webContents.toggleDevTools();
  });

  loadApp();
}

async function loadApp() {
  if (!mainWindow) return;
  cloudUrl = resolveCloudUrl();

  // الوضع السحابي أولاً: أحدث واجهة دائماً + نفس قاعدة البيانات
  if (cloudUrl && (await isOnline(cloudUrl))) {
    currentMode = "cloud";
    log(`loading cloud UI: ${cloudUrl}`);
    mainWindow.loadURL(`${cloudUrl}/`);
    return;
  }

  // لا يوجد إنترنت => النسخة المدمجة على الجهاز
  log("cloud unreachable - falling back to local bundled app");
  currentMode = "local";
  if (!serverStarted) await startServer().catch((e) => log(`local server failed: ${e}`));
  if (mainWindow) mainWindow.loadURL(`${baseUrl}/`);
}

/** معلومات التحديث والتشغيل (تظهر في شاشة "معلومات عن البرنامج") */
function runtimeInfo() {
  return {
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    mode: currentMode,
    cloudUrl,
    localUrl: baseUrl,
    database: getDatabaseUrl() ? "cloud" : "embedded",
    databaseHost: (() => {
      const url = getDatabaseUrl();
      if (!url) return "";
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    })(),
    logFile: logFile(),
    isPackaged: app.isPackaged,
  };
}

// ==================== التحديث التلقائي ====================
let updater = null;
try {
  // electron-updater اختياري: لو غير متاح يعمل البرنامج عادي بدون تحديث تلقائي
  updater = require("electron-updater").autoUpdater;
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = true;
  updater.logger = { info: log, warn: log, error: log, debug: () => undefined };
} catch (e) {
  log(`electron-updater not available: ${e}`);
}

let updateState = {
  status: "idle", // idle | checking | available | none | downloading | downloaded | error
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null,
  progress: 0,
  error: null,
};

function broadcastUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update:state", { ...updateState });
  }
}
function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  broadcastUpdate();
}

function wireUpdater() {
  if (!updater) return;
  updater.on("checking-for-update", () => setUpdateState({ status: "checking", error: null }));
  updater.on("update-available", (info) =>
    setUpdateState({
      status: "available",
      latestVersion: info?.version || null,
      releaseNotes: typeof info?.releaseNotes === "string" ? info.releaseNotes : null,
    }),
  );
  updater.on("update-not-available", () => setUpdateState({ status: "none", latestVersion: app.getVersion() }));
  updater.on("download-progress", (p) => setUpdateState({ status: "downloading", progress: Math.round(p?.percent || 0) }));
  updater.on("update-downloaded", (info) =>
    setUpdateState({ status: "downloaded", latestVersion: info?.version || updateState.latestVersion, progress: 100 }),
  );
  updater.on("error", (e) =>
    setUpdateState({ status: "error", error: e?.message ? String(e.message) : "تعذر التحقق من التحديثات" }),
  );
}

async function checkForUpdates(manual) {
  if (!updater) {
    if (manual) {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "التحديثات",
        message: "التحديث التلقائي غير مُفعّل في هذه النسخة.",
        detail: "يمكنك تحميل أحدث إصدار يدوياً من صفحة الإصدارات على GitHub.",
        buttons: ["موافق", "فتح صفحة التحميل"],
        defaultId: 0,
        cancelId: 0,
      }).then((r) => {
        if (r.response === 1) shell.openExternal("https://github.com/waelsamir28/Fatoraa/releases/latest");
      });
    }
    return updateState;
  }
  try {
    setUpdateState({ status: "checking", error: null });
    await updater.checkForUpdates();
  } catch (e) {
    setUpdateState({ status: "error", error: e?.message ? String(e.message) : "تعذر الاتصال بخادم التحديثات" });
  }
  return updateState;
}

ipcMain.handle("app:runtime-info", () => runtimeInfo());
ipcMain.handle("update:get-state", () => ({ ...updateState }));
ipcMain.handle("update:check", (_e, manual) => checkForUpdates(Boolean(manual)));
ipcMain.handle("update:download", async () => {
  if (!updater) return { ok: false, error: "التحديث التلقائي غير مُفعّل" };
  try {
    setUpdateState({ status: "downloading", progress: 0 });
    await updater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    setUpdateState({ status: "error", error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
});
ipcMain.handle("update:install", () => {
  if (!updater) return false;
  quitting = true;
  setImmediate(() => updater.quitAndInstall(false, true));
  return true;
});
ipcMain.handle("app:open-external", (_e, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) shell.openExternal(url);
  return true;
});
ipcMain.handle("app:switch-mode", async (_e, mode) => {
  if (mode === "cloud") {
    quitting = false;
    await loadApp();
    return currentMode;
  }
  if (mode === "local") {
    currentMode = "local";
    if (!serverStarted) await startServer();
    if (mainWindow) mainWindow.loadURL(`${baseUrl}/`);
    return currentMode;
  }
  return currentMode;
});
ipcMain.handle("app:set-cloud-url", (_e, url) => {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  writeSettings({ cloudUrl: clean });
  cloudUrl = clean;
  return true;
});

// ==================== شاشة الإعدادات داخل البرنامج ====================
ipcMain.handle("settings:get", () => {
  const s = readSettings();
  return {
    cloudUrl: s.cloudUrl || "",
    databaseUrl: maskDatabaseUrl(s.databaseUrl || ""),
    hasCustomCloud: Boolean(s.cloudUrl),
    hasCustomDatabase: Boolean(s.databaseUrl),
    effectiveCloudUrl: resolveCloudUrl(),
    mode: currentMode,
    settingsFile: settingsFile(),
    logFile: logFile(),
  };
});

ipcMain.handle("settings:test-cloud", (_e, url) => testCloudUrl(url || resolveCloudUrl()));

ipcMain.handle("settings:test-database", (_e, url) => {
  // لو المستخدم بعت القيمة المخفية (****) نختبر الرابط المحفوظ فعلياً
  const value = String(url || "");
  if (value.includes("****")) return testDatabaseUrl(readSettings().databaseUrl || "");
  return testDatabaseUrl(value);
});

ipcMain.handle("settings:save", async (_e, patch) => {
  const incoming = patch && typeof patch === "object" ? patch : {};
  const before = readSettings();
  const next = {};

  if (typeof incoming.cloudUrl === "string") {
    next.cloudUrl = incoming.cloudUrl.trim().replace(/\/+$/, "");
  }
  // لا نحفظ القيمة المخفية بالنجوم مكان الرابط الحقيقي
  if (typeof incoming.databaseUrl === "string" && !incoming.databaseUrl.includes("****")) {
    next.databaseUrl = incoming.databaseUrl.trim();
  }

  // هل تغيّر رابط قاعدة البيانات فعلاً؟ (يحتاج إعادة تشغيل)
  const dbChanged =
    next.databaseUrl !== undefined && next.databaseUrl !== (before.databaseUrl || "");

  writeSettings(next);
  log(`settings updated: ${Object.keys(next).join(", ") || "(none)"}`);

  return {
    ok: true,
    restartNeeded: dbChanged,
    saved: Object.keys(next),
    masked: maskDatabaseUrl(readSettings().databaseUrl || ""),
  };
});

/** إعادة تشغيل التطبيق (بعد تغيير قاعدة البيانات) */
ipcMain.handle("app:relaunch", () => {
  quitting = true;
  try {
    server?.kill();
  } catch {
    /* ignore */
  }
  app.relaunch();
  setImmediate(() => app.quit());
  return true;
});

/** حذف رابط قاعدة البيانات والعودة للقاعدة المدمجة */
ipcMain.handle("settings:clear-database", () => {
  const s = readSettings();
  delete s.databaseUrl;
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2), "utf8");
  } catch (e) {
    log(`clear database failed: ${e}`);
    return { ok: false };
  }
  return { ok: true, restartNeeded: true };
});

ipcMain.on("win:minimize", () => mainWindow?.minimize());
ipcMain.on("win:toggle-maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on("app:quit", () => {
  quitting = true;
  app.quit();
});
ipcMain.handle("win:is-maximized", () => (mainWindow ? mainWindow.isMaximized() : false));

async function start() {
  createSplash();
  wireUpdater();
  try {
    if (DEV) {
      baseUrl = DEV_URL;
      currentMode = "local";
    }
    createMainWindow();
    if (DEV) mainWindow.loadURL(`${baseUrl}/`);
    // فحص التحديثات بعد فتح البرنامج (بدون إزعاج المستخدم)
    setTimeout(() => checkForUpdates(false), 8000);
  } catch (err) {
    log(`startup failed: ${err && err.stack ? err.stack : err}`);
    dialog.showErrorBox(APP_TITLE, `تعذر تشغيل البرنامج:\n${err && err.message ? err.message : err}\n\nملف السجل:\n${logFile()}`);
    quitting = true;
    app.quit();
  }
}

app.on("before-quit", () => {
  quitting = true;
  try {
    server?.kill();
  } catch {
    /* ignore */
  }
});
app.on("window-all-closed", () => app.quit());
