// مثبّت FATORA — العملية الرئيسية (Electron)
// يقرأ حمولة التطبيق الملحقة بنفس ملف الـ exe (app.7z) ويفكّها في مجلد التثبيت.
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");

const APP_NAME = "FATORA";
const APP_EXE = "AlGamal.exe";
const UNINSTALL_EXE = "Uninstall FATORA.bat";
const UNINSTALL_KEY = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\FATORA";

const SIZE_OFFSET = 8;
const LOGO_SIZE_OFFSET = 16;
const HEADER_SIZE = 32;

let win = null;
let installTarget = "";
const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

/* ---------------- الحمولة الملحقة ---------------- */

function payloadPath() {
  // المثبّت ملف واحد (portable): بعد فك نفسه يعمل من مجلد مؤقت،
  // والملف الأصلي الحقيقي موجود في هذا المتغير.
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
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


/** ملف إزالة خفيف (bat) بجانب البرنامج — يحذف الملفات والاختصارات وسجل ويندوز */
function writeUninstallerScript({ dir, file, appName }) {
  const startMenu = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", `${appName}.lnk`);
  const desktop = path.join(app.getPath("desktop"), `${appName}.lnk`);
  const lines = [
    "@echo off",
    "chcp 65001 >nul",
    `title إزالة ${appName}`,
    "echo.",
    `echo   سيتم إزالة برنامج ${appName} من هذا الجهاز.`,
    "echo   ملاحظة: بيانات المتجر (الفواتير والمخزون) لن تُحذف.",
    "echo.",
    "pause",
    "taskkill /f /im AlGamal.exe >nul 2>&1",
    `del /f /q "${desktop}" >nul 2>&1`,
    `del /f /q "${startMenu}" >nul 2>&1`,
    `reg delete "HKCU\\${UNINSTALL_KEY}" /f >nul 2>&1`,
    `rmdir /s /q "${dir}" >nul 2>&1`,
    "echo.",
    `echo   تمت إزالة ${appName} بنجاح.`,
    "timeout /t 2 /nobreak >nul",
    'del /f /q "%~f0"',
  ];
  fs.writeFileSync(file, lines.join("\r\n") + "\r\n", "utf8");
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

    // ملف إلغاء التثبيت: سكربت صغير (بدون نسخ المثبّت 250 ميجا)
    const uninstaller = path.join(target, UNINSTALL_EXE);
    writeUninstallerScript({ dir: target, file: uninstaller, appName: APP_NAME });

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
  // نُظهر النافذة عند أي إشارة تحميل — وليس فقط ready-to-show
  // (لو الواجهة تعثّرت قبل الجاهزية كانت النافذة تفضل مخفية للأبد)
  const showOnce = () => {
    if (!win || win.isDestroyed() || win.isVisible()) return;
    win.show();
  };
  win.once("ready-to-show", showOnce);
  win.webContents.once("dom-ready", showOnce);
  win.webContents.once("did-finish-load", showOnce);
  // لو ما حصلش تحميل خلال 6 ثوانٍ: تظهر النافذة بأي حال + صفحة إرشاد
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    showOnce();
    if (win.webContents.isLoading()) return;
  }, 6000);
  // أي رسالة خطأ من صفحة الواجهة تظهر في الكونسول (للتشخيص)
  win.webContents.on("console-message", (_e, level, message) => {
    if (level >= 2) console.error("[setup-ui]", message);
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[setup-ui] renderer gone:", details && details.reason);
    showOnce();
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    showOnce();
    const html =
      "<html dir='rtl'><body style='font-family:Segoe UI,Tahoma;padding:28px'>" +
      "<h2 style='color:#c42b1c'>تعذّر تحميل واجهة المثبّت</h2>" +
      `<p style='color:#444;line-height:2'>رمز الخطأ: ${code} — ${desc}</p>` +
      "<p style='color:#444;line-height:2'>نزّل الملف من جديد من الرابط الرسمي، وبعدها شغّله كمسؤول (Run as administrator).</p>" +
      "<p style='color:#444'>الدعم: م/ وائل الجمال — 01222355769</p></body></html>";
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

// أي خطأ غير متوقع: نُبلغ الواجهة بدل تركها معلّقة بلا استجابة
process.on("unhandledRejection", (e) => {
  send({ error: String((e && e.message) || e) });
});
process.on("uncaughtException", (e) => {
  send({ error: String((e && e.message) || e) });
});

/* ---------------- IPC ---------------- */

// نسخة احتياطية: بعض الحالات تظهر فيها الواجهة قبل اكتمال app.getVersion()
ipcMain.handle("setup:version", () => app.getVersion());

ipcMain.handle("setup:info", () => {
  // التثبيت في حساب المستخدم حتى لا يحتاج صلاحيات مدير
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const defaultDir = path.join(localAppData, "Programs", APP_NAME);
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
/**
 * ملاحظات الإصدار — تُقرأ من ملف مرفق مع المثبّت.
 * (كانت الدالة غير معرّفة أصلًا ⇒ استدعاؤها كان يرمي ReferenceError
 *  فيفشل تحميل الواجهة كاملة وتبقى الأزرار بلا استجابة.)
 * لو الملف غير موجود نرجّع رقم الإصدار الحقيقي مع قائمة افتراضية.
 */
function releaseNotes() {
  const fallback = {
    version: app.getVersion(),
    items: [
      "تثبيت بدون صلاحيات مدير — داخل حساب المستخدم",
      "خلفيات لشاشة الدخول وشاشة القفل + مقاسات موثقة",
      "6 ثيمات جديدة وتخصيص كامل للأزرار والخطوط",
      "صلاحيات الشاشات: كل حساب يرى ما تسمح له به فقط",
      "كاميرا الموبايل كماسح باركود + قارئ باركود عام",
      "حفظ تلقائي للفواتير كل 20 ثانية",
      "قفل كامل عند انتهاء الاشتراك مع تفعيل فوري",
    ],
  };
  for (const file of [path.join(__dirname, "release-notes.json"), path.join(process.resourcesPath, "release-notes.json")]) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const items = Array.isArray(data.items) ? data.items.filter((x) => typeof x === "string") : [];
      if (items.length) return { version: data.version || app.getVersion(), items };
    } catch {
      /* جرّب المسار التالي */
    }
  }
  return fallback;
}

ipcMain.handle("setup:whatsNew", () => releaseNotes());
ipcMain.on("setup:cancel", () => {
  cancelRequested = true;
});
ipcMain.on("setup:minimize", () => win && win.minimize());
ipcMain.on("setup:close", () => app.quit());
