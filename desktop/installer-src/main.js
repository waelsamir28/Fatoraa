// مثبّت FATORA — العملية الرئيسية (Electron)
// يقرأ حمولة التطبيق الملحقة بنفس ملف الـ exe (app.7z) ويفكّها في مجلد التثبيت.
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");

const APP_NAME = "FATORA";
const APP_EXE = "AlGamal.exe";
const UNINSTALL_EXE = "Uninstall FATORA.exe";
const UNINSTALL_KEY = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\FATORA";

const SIZE_OFFSET = 8;
const LOGO_SIZE_OFFSET = 16;
const HEADER_SIZE = 32;

let win = null;
const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

/* ---------------- الحمولة الملحقة ---------------- */

function payloadPath() {
  // داخل المثبّت نفسه: process.execPath
  return process.execPath;
}

function readPayloadInfo() {
  const file = payloadPath();
  const size = fs.statSync(file).size;
  const head = Buffer.alloc(HEADER_SIZE);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, HEADER_SIZE, 0);
  fs.closeSync(fd);
  const payloadSize = Number(head.readBigUInt64LE(SIZE_OFFSET));
  const logoSize = Number(head.readBigUInt64LE(LOGO_SIZE_OFFSET));
  const payloadStart = size - payloadSize - logoSize;
  if (!payloadSize || payloadStart <= 0 || payloadStart > size) {
    throw new Error("ملف التثبيت غير مكتمل أو تالف (لم يتم العثور على ملفات البرنامج داخله).");
  }
  return { payloadStart, payloadSize };
}

/** استخراج الحمولة إلى ملف 7z مؤقت */
function extractPayloadTo7z() {
  const { payloadStart, payloadSize } = readPayloadInfo();
  const tmp = path.join(os.tmpdir(), `fatora-setup-${Date.now()}.7z`);
  const fdIn = fs.openSync(payloadPath(), "r");
  const fdOut = fs.openSync(tmp, "w");
  const chunk = Buffer.alloc(1024 * 1024);
  let read = 0;
  while (read < payloadSize) {
    const n = fs.readSync(fdIn, chunk, 0, Math.min(chunk.length, payloadSize - read), payloadStart + read);
    if (n <= 0) break;
    fs.writeSync(fdOut, chunk, 0, n);
    read += n;
  }
  fs.closeSync(fdIn);
  fs.closeSync(fdOut);
  return tmp;
}

/** فك ضغط 7z المرفق مع electron */
function sevenZipBin() {
  const candidates = [
    path.join(process.resourcesPath, "app.asar.unpacked", "7za.exe"),
    path.join(process.resourcesPath, "7za.exe"),
    path.join(__dirname, "7za.exe"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("أداة فك الضغط غير موجودة داخل المثبّت.");
}

function run7z(args, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(sevenZipBin(), args, { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => {
      const text = String(d);
      out += text;
      if (onLine) onLine(text);
    });
    child.stderr.on("data", (d) => {
      out += String(d);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`فك الضغط انتهى بالكود ${code}`));
    });
  });
}

/* ---------------- الاختصارات والسجل ---------------- */

function psEscape(s) {
  return String(s).replace(/'/g, "''");
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      windowsHide: true,
    });
    let err = "";
    ps.stderr.on("data", (d) => {
      err += String(d);
    });
    ps.on("error", reject);
    ps.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(err || `PowerShell exit ${code}`))));
  });
}

function createShortcuts({ dir, desktopShortcut, startMenuShortcut }) {
  const exe = path.join(dir, APP_EXE);
  const icon = exe;
  const tasks = [];
  if (desktopShortcut) {
    const lnk = path.join(app.getPath("desktop"), `${APP_NAME}.lnk`);
    tasks.push({ lnk, icon });
  }
  if (startMenuShortcut) {
    // قائمة ابدأ للمستخدم الحالي (بدون صلاحيات مدير)
    const lnk = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", `${APP_NAME}.lnk`);
    tasks.push({ lnk, icon });
  }
  const scripts = tasks.map(
    ({ lnk, icon }) =>
      `$s=(New-Object -COM WScript.Shell).CreateShortcut('${psEscape(lnk)}');` +
      `$s.TargetPath='${psEscape(exe)}';` +
      `$s.WorkingDirectory='${psEscape(dir)}';` +
      `$s.IconLocation='${psEscape(icon)}';` +
      `$s.Description='FATORA - إدارة المحلات التجارية';` +
      `$s.Save();`,
  );
  if (!scripts.length) return Promise.resolve();
  return runPowerShell(scripts.join(" "));
}

function writeUninstallRegistry({ dir, sizeKb }) {
  const uninstaller = path.join(dir, UNINSTALL_EXE);
  const key = `HKCU\\${UNINSTALL_KEY}`;
  const parts = [
    `DisplayName=FATORA`,
    `DisplayVersion=${app.getVersion()}`,
    `Publisher=FATORA`,
    `DisplayIcon=${path.join(dir, APP_EXE)}`,
    `InstallLocation=${dir}`,
    `UninstallString="${uninstaller}"`,
    `NoModify=1`,
    `NoRepair=1`,
    `EstimatedSize=${sizeKb}`,
  ];
  const script = parts
    .map((p) => {
      const i = p.indexOf("=");
      const name = p.slice(0, i);
      const value = p.slice(i + 1);
      return `New-ItemProperty -Path '${psEscape(key)}' -Name '${psEscape(name)}' -Value '${psEscape(value)}' -PropertyType String -Force | Out-Null;`;
    })
    .join(" ");
  const ensure = `New-Item -Path '${psEscape(key)}' -Force | Out-Null;`;
  return runPowerShell(ensure + " " + script);
}

/* ---------------- التثبيت ---------------- */

async function install({ dir, desktopShortcut, startMenuShortcut }) {
  const target = String(dir || "").trim();
  if (!target || !/^[a-zA-Z]:\\/.test(target)) {
    return { ok: false, error: "من فضلك اختر مسارًا صحيحًا على القرص (مثال: C:\\Program Files\\FATORA)." };
  }

  try {
    if (fs.existsSync(path.join(target, APP_EXE))) {
      const answer = dialog.showMessageBoxSync(win, {
        type: "question",
        buttons: ["إعادة التثبيت", "إلغاء"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        title: APP_NAME,
        message: "البرنامج مثبّت بالفعل في هذا المجلد.",
        detail: "هل تريد إعادة تثبيت النسخة الحالية فوق النسخة الموجودة؟",
      });
      if (answer === 1) return { ok: false, cancelled: true, error: "تم إلغاء التثبيت." };
      await closeRunningApp();
    }

    fs.mkdirSync(target, { recursive: true });

    send({ percent: 4, message: "جاري فك ضغط ملفات البرنامج…" });
    const archive = extractPayloadTo7z();
    try {
      await run7z(["-y", `-o${target}`, archive], (line) => {
        const m = /(\d{1,3})%/.exec(line);
        if (m) {
          const p = Math.min(88, 4 + Math.round((Number(m[1]) / 100) * 84));
          send({ percent: p });
        }
        const trimmed = line.trim();
        if (trimmed && /Extracting/i.test(trimmed)) send({ detail: trimmed.slice(-120) });
      });
    } finally {
      try {
        fs.unlinkSync(archive);
      } catch {
        /* ignore */
      }
    }

    send({ percent: 90, message: "تجهيز ملفات التشغيل…" });

    // ملف إلغاء التثبيت: نفس المثبّت مع وسيط --uninstall
    const uninstaller = path.join(target, UNINSTALL_EXE);
    try {
      fs.copyFileSync(process.execPath, uninstaller);
    } catch {
      /* ignore */
    }

    send({ percent: 94, message: "إنشاء الاختصارات…" });
    await createShortcuts({ dir: target, desktopShortcut, startMenuShortcut });

    send({ percent: 97, message: "تسجيل البرنامج في ويندوز…" });
    const sizeKb = Math.round(dirSizeKb(target));
    await writeUninstallRegistry({ dir: target, sizeKb });

    send({ percent: 100, message: "تم التثبيت بنجاح", detail: "" });
    return { ok: true, dir: target };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

function dirSizeKb(dir) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) total += dirSizeKb(full);
        else total += fs.statSync(full).size;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return total / 1024;
}

async function closeRunningApp() {
  try {
    await runPowerShell(`Get-Process -Name 'AlGamal' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue;`);
  } catch {
    /* ignore */
  }
}

/* ---------------- إلغاء التثبيت ---------------- */

async function uninstall() {
  const dir = path.dirname(process.execPath);
  const answer = dialog.showMessageBoxSync(win, {
    type: "warning",
    buttons: ["إلغاء التثبيت", "تراجع"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: APP_NAME,
    message: "هل تريد إزالة برنامج FATORA من هذا الجهاز؟",
    detail: "لن يتم حذف بيانات المتجر (الفواتير والمخزون) الموجودة في مجلد بيانات المستخدم.",
  });
  if (answer === 1) return false;

  await closeRunningApp();
  send({ percent: 20, message: "جاري إزالة الملفات…" });

  const script = [
    `Remove-Item -Path '${psEscape(path.join(app.getPath("desktop"), `${APP_NAME}.lnk`))}' -Force -ErrorAction SilentlyContinue;`,
    `Remove-Item -Path '${psEscape(path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", `${APP_NAME}.lnk`))}' -Force -ErrorAction SilentlyContinue;`,
    `Remove-Item -Path 'HKCU:\\${UNINSTALL_KEY}' -Recurse -Force -ErrorAction SilentlyContinue;`,
  ].join(" ");
  try {
    await runPowerShell(script);
  } catch {
    /* ignore */
  }

  // حذف البرنامج نفسه في النهاية (بعد خروج المثبّت)
  const selfDelete = path.join(os.tmpdir(), `fatora-rm-${Date.now()}.cmd`);
  fs.writeFileSync(
    selfDelete,
    `@echo off\r\ntimeout /t 2 /nobreak >nul\r\nrmdir /s /q "${dir}"\r\ndel /f /q "%~f0"\r\n`,
    "utf8",
  );
  spawn("cmd.exe", ["/c", selfDelete], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  return true;
}

/* ---------------- النافذة ---------------- */

function createWindow() {
  win = new BrowserWindow({
    width: 720,
    height: 480,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    backgroundColor: "#f3f3f3",
    title: `${APP_NAME} Setup`,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    win = null;
  });
}

const isUninstall = process.argv.includes("--uninstall");

app.whenReady().then(async () => {
  createWindow();
  if (isUninstall) {
    win.webContents.once("did-finish-load", async () => {
      const done = await uninstall();
      if (done) app.quit();
    });
  }
});

app.on("window-all-closed", () => app.quit());

/* ---------------- IPC ---------------- */

ipcMain.handle("setup:info", () => {
  const defaultDir = path.join(process.env.ProgramFiles || "C:\\Program Files", APP_NAME);
  let freeBytes = 0;
  try {
    const stats = fs.statfsSync(path.parse(defaultDir).root);
    freeBytes = Number(stats.bavail) * Number(stats.bsize);
  } catch {
    freeBytes = os.freemem();
  }
  return {
    version: app.getVersion(),
    defaultDir,
    requiredBytes: 420 * 1024 * 1024,
    freeBytes,
  };
});

ipcMain.handle("setup:browse", async (_e, current) => {
  const res = await dialog.showOpenDialog(win, {
    title: "اختر مجلد التثبيت",
    defaultPath: current || undefined,
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "اختيار المجلد",
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const picked = res.filePaths[0];
  return path.basename(picked).toUpperCase() === APP_NAME ? picked : path.join(picked, APP_NAME);
});

ipcMain.handle("setup:install", async (_e, opts) => install(opts || {}));
ipcMain.handle("setup:launch", () => {
  const dir = path.dirname(process.execPath);
  const exe = path.join(dir, APP_EXE);
  if (fs.existsSync(exe)) shell.openPath(exe);
  app.quit();
});
ipcMain.on("setup:minimize", () => win && win.minimize());
ipcMain.on("setup:close", () => app.quit());
