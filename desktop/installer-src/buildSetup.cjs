// بناء مثبّت FATORA المخصص (بدون مشروع electron-builder ثانٍ)
//
// الفكرة:
//  1) التطبيق الأصلي بعد البناء موجود في dist/win-unpacked (فيه كل ملفات Electron + resources).
//  2) نصنع "هيكل المثبّت" (stub) بنسخ كل ملفات Electron فقط + وضع واجهة المثبّت في resources/app.
//  3) نضغط مجلد resources الخاص بالتطبيق الأصلي في ملف 7z (الحمولة).
//  4) نلحق الحمولة بملف المثبّت (writePayload.cjs).
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const desktopDir = path.resolve(__dirname, "..");
const appUnpacked = path.join(desktopDir, "dist", "win-unpacked");
const stubDir = path.join(desktopDir, "dist-setup", "stub");
const payloadFile = path.join(desktopDir, "dist-setup", "resources-payload.7z");
const sevenZip = path.join(desktopDir, "node_modules", "7zip-bin", "win", "x64", "7za.exe");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(appUnpacked)) fail(`لم يتم العثور على بناء التطبيق: ${appUnpacked}`);
if (!fs.existsSync(sevenZip)) fail(`لم يتم العثور على أداة 7za: ${sevenZip}`);

/* ---------- 1) هيكل المثبّت ---------- */
console.log("• تجهيز هيكل المثبّت…");
fs.rmSync(stubDir, { recursive: true, force: true });
fs.mkdirSync(stubDir, { recursive: true });

// نستبعد ملفات التطبيق نفسه (resources) وملفات غير لازمة للمثبّت
const SKIP_FROM_APP = new Set(["resources", "LICENSE", "LICENSES.chromium.html"]);
for (const entry of fs.readdirSync(appUnpacked, { withFileTypes: true })) {
  if (SKIP_FROM_APP.has(entry.name)) continue; // runtime فقط — بدون ملفات التطبيق
  const from = path.join(appUnpacked, entry.name);
  const to = path.join(stubDir, entry.name);
  if (entry.name === "locales" && entry.isDirectory()) {
    // نحتاج لغة واحدة فقط (النصوص عربية/إنجليزية داخل الواجهة)
    fs.mkdirSync(to, { recursive: true });
    fs.copyFileSync(path.join(from, "en-US.pak"), path.join(to, "en-US.pak"));
    continue;
  }
  fs.cpSync(from, to, { recursive: true });
}

// واجهة المثبّت داخل resources/app (Electron يحمّلها تلقائيًا)
const installerApp = path.join(stubDir, "resources", "app");
fs.mkdirSync(installerApp, { recursive: true });
for (const file of ["main.js", "preload.js", "index.html", "installer.js", "release-notes.json"]) {
  fs.copyFileSync(path.join(__dirname, file), path.join(installerApp, file));
}
fs.cpSync(path.join(__dirname, "assets"), path.join(installerApp, "assets"), { recursive: true });
fs.writeFileSync(
  path.join(installerApp, "package.json"),
  JSON.stringify(
    {
      name: "fatora-setup",
      productName: "FATORA Setup",
      version: require(path.join(desktopDir, "package.json")).version,
      main: "main.js",
      description: "مثبّت FATORA",
    },
    null,
    2,
  ),
  "utf8",
);

// أداة فك الضغط داخل المثبّت
fs.copyFileSync(sevenZip, path.join(stubDir, "resources", "7za.exe"));

// إعادة تسمية ملف التشغيل ليكون هو المثبّت نفسه (بدون نسخة إضافية = بدون تضخيم الحجم)
const setupExe = path.join(stubDir, "FATORA-Setup.exe");
const mainExe = fs.readdirSync(stubDir).find((f) => f.toLowerCase().endsWith(".exe"));
if (!mainExe) fail("لم يتم العثور على ملف تشغيل التطبيق داخل win-unpacked");
fs.renameSync(path.join(stubDir, mainExe), setupExe);

/* ---------- 2) الحمولة: ملفات resources الخاصة بالتطبيق ---------- */
console.log("• ضغط ملفات البرنامج (حمولة المثبّت)…");
fs.rmSync(payloadFile, { force: true });
execFileSync(sevenZip, ["a", "-t7z", "-mx=9", "-mmt=on", payloadFile, "."], {
  cwd: appUnpacked,
  stdio: "inherit",
});

const stubSize = fs.statSync(setupExe).size;
const payloadSize = fs.statSync(payloadFile).size;
console.log(`✔ هيكل المثبّت: ${(stubSize / 1048576).toFixed(1)} MB`);
console.log(`✔ الحمولة: ${(payloadSize / 1048576).toFixed(1)} MB`);
