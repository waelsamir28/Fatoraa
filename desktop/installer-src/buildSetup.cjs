// بناء مثبّت FATORA بنمط Windows 11 (ملف واحد فقط — بدون ملفات DLL خارجية)
//
// لماذا؟
//   تشغيل واجهة المثبّت مباشرة على ملف electron.exe هو السبب في خطأ
//   «ffmpeg.dll was not found»: إعادة تسمية electron.exe لا تُدمج ملفات DLL داخله.
//   الحل: بناء المثبّت كـ «portable» من electron-builder = ملف exe واحد يحتوي كل شيء
//   (واجهة المثبّت + Electron + الحمولة)، يستخرج نفسه إلى مجلد مؤقت ثم يعمل.
//
// الخطوات:
//  1) dist/win-unpacked = التطبيق الأصلي بعد electron-builder.
//  2) نضغط التطبيق كله في dist-setup/resources-payload.7z.
//  3) نبني واجهة المثبّت كتطبيق Electron مستقل (dist-setup/setup-app) بملف portable واحد.
//  4) نلحق الحمولة بملف المثبّت النهائي (writePayload.cjs).
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const desktopDir = path.resolve(__dirname, "..");
const appUnpacked = path.join(desktopDir, "dist", "win-unpacked");
const setupDir = path.join(desktopDir, "dist-setup");
const setupAppDir = path.join(setupDir, "setup-app");
const payloadFile = path.join(setupDir, "resources-payload.7z");
const sevenZip = path.join(desktopDir, "node_modules", "7zip-bin", "win", "x64", "7za.exe");
const version = require(path.join(desktopDir, "package.json")).version;

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(appUnpacked)) fail(`لم يتم العثور على بناء التطبيق: ${appUnpacked}`);
if (!fs.existsSync(sevenZip)) fail(`لم يتم العثور على أداة 7za: ${sevenZip}`);

/* ---------- 1) حمولة التطبيق ---------- */
console.log("• ضغط ملفات برنامج FATORA (حمولة المثبّت)…");
fs.mkdirSync(setupDir, { recursive: true });
fs.rmSync(payloadFile, { force: true });
execFileSync(sevenZip, ["a", "-t7z", "-mx=9", "-mmt=on", payloadFile, "."], { cwd: appUnpacked, stdio: "inherit" });


/** نسخة Electron المثبّتة عندنا — تُمرَّر لـ electron-builder كرقم فقط (بدون electronDist) */
function electronVersion() {
  try {
    const dist = path.join(desktopDir, "node_modules", "electron", "dist", "version");
    const raw = fs.readFileSync(dist, "utf8").trim().replace(/^v/i, "");
    if (raw) return raw;
  } catch {
    /* جرّب package.json */
  }
  try {
    const pkgFile = path.join(desktopDir, "node_modules", "electron", "package.json");
    return String(JSON.parse(fs.readFileSync(pkgFile, "utf8")).version).replace(/^v/i, "");
  } catch {
    return "";
  }
}

/* ---------- 2) مشروع واجهة المثبّت ---------- */
console.log("• تجهيز مشروع المثبّت…");
fs.rmSync(setupAppDir, { recursive: true, force: true });
fs.mkdirSync(setupAppDir, { recursive: true });

for (const file of ["main.js", "preload.js", "index.html", "installer.js"]) {
  // نطبع رقم الإصدار الحقيقي داخل الملفات حتى يظهر في الواجهة من أول لحظة
  const text = fs.readFileSync(path.join(__dirname, file), "utf8").split("__APP_VERSION__").join(version);
  fs.writeFileSync(path.join(setupAppDir, file), text, "utf8");
}
// ملاحظات الإصدار: نكتب فيها رقم الإصدار الحقيقي من package.json دائمًا
try {
  const notesFile = path.join(__dirname, "release-notes.json");
  const notes = JSON.parse(fs.readFileSync(notesFile, "utf8"));
  notes.version = version;
  fs.writeFileSync(path.join(setupAppDir, "release-notes.json"), JSON.stringify(notes, null, 2), "utf8");
} catch {
  fs.copyFileSync(path.join(__dirname, "release-notes.json"), path.join(setupAppDir, "release-notes.json"));
}
fs.cpSync(path.join(__dirname, "assets"), path.join(setupAppDir, "assets"), { recursive: true });

const setupElectron = electronVersion();
if (!setupElectron) {
  console.warn("⚠ لم نتعرف على نسخة Electron — سيعتمد electron-builder على أحدث نسخة.");
} else {
  console.log(`• نسخة Electron للمثبّت: ${setupElectron}`);
}

fs.writeFileSync(
  path.join(setupAppDir, "package.json"),
  JSON.stringify(
    {
      name: "fatora-setup",
      productName: "FATORA Setup",
      version,
      description: "مثبّت FATORA — نمط Windows 11",
      main: "main.js",
      author: "FATORA - م/ وائل الجمال 01222355769",
      license: "UNLICENSED",
      private: true,
      // electron-builder يحتاج معرفة نسخة Electron: بدون devDependency ولا electronVersion
      // كان البناء يفشل (كان يعتمد سابقًا على electronDist المحذوف).
      devDependencies: setupElectron ? { electron: setupElectron } : {},
      build: {
        // ملاحظة مهمة: لا نستخدم electronDist هنا.
        // electron-builder يستخدم dist كـ «قالب» جاهز ولا يعيد تسمية electron.exe إلى
        // FATORA-Setup.exe — فتظهر نوافذ بتسمية electron وتفشل أدوات مساعدة.
        // لذلك نعطيه رقم النسخة فقط ويحمّل/يستخدم الكاش بنفسه ويعيد التسمية صح.
        electronVersion: setupElectron || undefined,
        appId: "com.algamal.setup",
        productName: "FATORA Setup",
        executableName: "FATORA-Setup",
        copyright: "© FATORA - م/ وائل الجمال 01222355769",
        directories: { output: "../setup-dist", buildResources: "assets" },
        files: ["main.js", "preload.js", "index.html", "installer.js", "release-notes.json", "assets/**"],
        extraResources: [{ from: `${desktopDir}/node_modules/7zip-bin/win/x64/7za.exe`, to: "7za.exe" }],
        asar: true,
        win: {
          icon: "assets/icon.ico",
          target: [{ target: "portable", arch: ["x64"] }],
        },
        portable: {
          artifactName: "FATORA-Setup-${version}.exe",
          // يظهر شعار أثناء فك المثبّت نفسه في الذاكرة المؤقتة
          splashImage: "assets/splash.bmp",
          unpackDirName: "FATORA-Setup",
        },
      },
    },
    null,
    2,
  ),
  "utf8",
);

/* ---------- 3) بناء المثبّت (ملف واحد) ---------- */
console.log("• بناء المثبّت النهائي…");

const builderCli = path.join(desktopDir, "node_modules", "electron-builder", "cli.js");
if (!fs.existsSync(builderCli)) fail(`أداة electron-builder غير موجودة: ${builderCli}`);

execFileSync(process.execPath, [builderCli, "--win", "portable", "--x64", "--publish", "never"], {
  cwd: setupAppDir,
  stdio: "inherit",
});

const builtExe = path.join(setupDir, "setup-dist", `FATORA-Setup-${version}.exe`);
if (!fs.existsSync(builtExe)) fail(`لم يتم إنتاج المثبّت: ${builtExe}`);

// تستخدمه writePayload.cjs كلاحقة الحمولة
const finalStub = path.join(setupDir, "stub", "FATORA-Setup.exe");
fs.mkdirSync(path.dirname(finalStub), { recursive: true });
fs.copyFileSync(builtExe, finalStub);

console.log(`✔ مثبّت الواجهة: ${(fs.statSync(finalStub).size / 1048576).toFixed(1)} MB`);
console.log(`✔ الحمولة: ${(fs.statSync(payloadFile).size / 1048576).toFixed(1)} MB`);
