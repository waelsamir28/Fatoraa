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

const isUninstall = process.argv.includes("--uninstall");

let win = null;
let installTarget = "";
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
    path.join(process.resourcesPath, "7za.exe"),
    path.join(process.resourcesPath, "app.asar.unpacked", "7za.exe"),
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
    `UninstallString="${uninstaller}" --uninstall`,
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

let cancelRequested = false;

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

    installTarget = target;
    cancelRequested = false;
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

    if (cancelRequested) {
      send({ percent: 0, message: "تم إلغاء التثبيت — جاري التنظيف…" });
      removeInstalledFiles(target);
      return { ok: false, cancelled: true, error: "تم إلغاء التثبيت وتنظيف الملفات." };
    }

    send({ percent: 90, message: "تجهيز ملفات التشغيل…" });

    // ملف إلغاء التثبيت: نسخة من المثبّت بدون الحمولة الملحقة (حتى لا يتضاعف الحجم)
    const uninstaller = path.join(target, UNINSTALL_EXE);
    try {
      const { payloadSize } = readPayloadInfo();
      const stubSize = fs.statSync(process.execPath).size - payloadSize;
      const fdIn = fs.openSync(process.execPath, "r");
      const fdOut = fs.openSync(uninstaller, "w");
      const buf = Buffer.alloc(4 * 1024 * 1024);
      let read = 0;
      while (read < stubSize) {
        const n = fs.readSync(fdIn, buf, 0, Math.min(buf.length, stubSize - read), read);
        if (n <= 0) break;
        fs.writeSync(fdOut, buf, 0, n);
        read += n;
      }
      fs.closeSync(fdIn);
      fs.closeSync(fdOut);
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


/** حذف الملفات التي نُسخت عند إلغاء التثبيت */
function removeInstalledFiles(dir) {
  try {
    if (dir && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    /* ignore */
  }
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** ملاحظات الإصدار — تُقرأ من release-notes.json المرفق مع المثبّت إن وُجد */
function releaseNotes() {
  const fallback = [
    "تثبيت بنمط Windows 11 (نافذة حديثة + شريط تقدم بنص متحرك)",
    "فتح البرنامج على الشاشة الرئيسية دائمًا + وضع ملء الشاشة + حجم خط 110%",
    "شاشة المبيعات تبدأ فارغة (بدون تحميل أي فاتورة قديمة)",
    "إصلاح شاشة معلومات البرنامج (كانت مقصوصة)",
    "اسم المسؤول مع رقم الدعم في كل أنحاء البرنامج",
  ];
  const candidates = [path.join(process.resourcesPath, "release-notes.json"), path.join(__dirname, "release-notes.json")];
  for (const file of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(data.items) && data.items.length) return data;
    } catch {
      /* ignore */
    }
  }
  return { version: app.getVersion(), items: fallback };
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
  win.once("ready-to-show", () => {
    if (!isUninstall) win.show();
  });
  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(async () => {
  createWindow();
  if (isUninstall) {
    // إزالة البرنامج: نستخدم نفس الواجهة (أزرار «إلغاء التثبيت / تراجع»)
    win.webContents.once("did-finish-load", async () => {
      win.show();
      try {
        $ui_uninstallMode();
      } catch {
        /* ignore */
      }
    });
    ipcMain.handle("setup:confirmUninstall", async () => {
      const done = await uninstall();
      if (done) app.quit();
      return done;
    });
  }
});

// وضع الإزالة: نبدّل واجهة الصفحة الأولى إلى تأكيد الحذف
function $ui_uninstallMode() {
  win.webContents.executeJavaScript(`
    (function () {
      var dir = document.getElementById('pgDir');
      var prog = document.getElementById('pgProg');
      if (!dir) return;
      dir.querySelector('h1').textContent = 'إزالة برنامج FATORA';
      dir.querySelector('.lead').textContent = 'سيتم حذف ملفات البرنامج والاختصارات. لن تُحذف بيانات المتجر (الفواتير والمخزون).';
      var field = dir.querySelector('.field');
      if (field) field.style.display = 'none';
      var opts = dir.querySelector('.opts');
      if (opts) opts.style.display = 'none';
      var next = document.getElementById('btnNext');
      var cancel = document.getElementById('btnCancel');
      next.textContent = 'إلغاء التثبيت';
      if (cancel) cancel.style.display = 'none';
      next.onclick = function () {
        next.disabled = true;
        next.textContent = 'جاري الإزالة…';
        if (prog) { document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');}); prog.classList.add('on'); }
        window.installer.confirmUninstall();
      };
    })();
  `);
}

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
ipcMain.handle("setup:openFolder", () => {
  const dir = installTarget || path.dirname(process.execPath);
  if (fs.existsSync(dir)) return shell.openPath(dir);
  return null;
});
ipcMain.handle("setup:whatsNew", () => releaseNotes());
ipcMain.on("setup:cancel", () => {
  cancelRequested = true;
});
ipcMain.on("setup:minimize", () => win && win.minimize());
ipcMain.on("setup:close", () => app.quit());
