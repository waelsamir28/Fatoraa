// برنامج FATORA - نسخة الويندوز (Electron)
// يشغّل خادم البرنامج داخلياً مع قاعدة بيانات مدمجة (PGlite) ويفتح نافذة بدون إطار
const { app, BrowserWindow, ipcMain, utilityProcess, dialog, shell, Menu, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");

const APP_TITLE = "برنامج FATORA - لإدارة المحلات التجارية";
const DEV = process.argv.includes("--dev");
const DEV_URL = process.env.ALGAMAL_DEV_URL || "http://localhost:3000";

// مسار بيانات بحروف إنجليزية لتجنب مشاكل المسارات العربية
app.setPath("userData", path.join(app.getPath("appData"), "AlGamalPOS"));
app.setAppUserModelId("com.algamal.pos");

let mainWindow = null;
let splash = null;
let server = null;
let baseUrl = "";
let quitting = false;

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

  server = utilityProcess.fork(entry, [], {
    cwd: serverDir,
    stdio: "pipe",
    serviceName: "AlGamal Server",
    env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: "postgresql://neondb_owner:npg_k37jtJnfoYuB@ep-floral-hill-bej9r8ow-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  });
  server.stdout?.on("data", (d) => log(String(d).trim()));
  server.stderr?.on("data", (d) => log(`ERR ${String(d).trim()}`));
  server.on("exit", (code) => {
    log(`server exited with code ${code}`);
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

  const isInternal = (url) => url.startsWith(baseUrl);
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

  mainWindow.loadURL(`${baseUrl}/`);
}

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
  try {
    if (DEV) baseUrl = DEV_URL;
    else await startServer();
    createMainWindow();
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
