// تجهيز ملفات البرنامج لنسخة الويندوز:
// 1) بناء المشروع بوضع standalone  2) نسخ الخادم + الملفات الثابتة + قاعدة البيانات المدمجة إلى desktop/app-server
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const desktopDir = path.resolve(__dirname, "..");
const out = path.join(desktopDir, "app-server");

function run(cmd, env = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, env: { ...process.env, ...env } });
}

if (!fs.existsSync(path.join(root, "node_modules"))) {
  run("npm install --no-audit --no-fund");
}

run("npm run build", { NEXT_OUTPUT: "standalone", NEXT_TELEMETRY_DISABLED: "1" });

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("✖ لم يتم العثور على .next/standalone/server.js");
  process.exit(1);
}

console.log("\n• نسخ ملفات الخادم...");
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(standalone, out, { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });

if (fs.existsSync(path.join(root, "public"))) {
  fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
}

// نسخ صور البداية والأيقونات إلى مجلد build ومجلد desktop لضمان حزمها في البرنامج
const buildDir = path.join(desktopDir, "build");
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

if (fs.existsSync(path.join(root, "public", "images"))) {
  fs.cpSync(path.join(root, "public", "images"), buildDir, { recursive: true });
}

// التأكد من وجود splash.png و icon.png في مجلد desktop ومجلد build
for (const asset of ["splash.png", "icon.png"]) {
  const inDesktop = path.join(desktopDir, asset);
  const inBuild = path.join(buildDir, asset);
  if (fs.existsSync(inDesktop)) {
    fs.copyFileSync(inDesktop, inBuild);
  } else if (fs.existsSync(inBuild)) {
    fs.copyFileSync(inBuild, inDesktop);
  }
}

// التأكد من وجود ملفات قاعدة البيانات المدمجة كاملة (wasm / data)
const pgliteSrc = path.join(root, "node_modules", "@electric-sql", "pglite");
fs.cpSync(pgliteSrc, path.join(out, "node_modules", "@electric-sql", "pglite"), { recursive: true });

// إزالة إعدادات قاعدة بيانات التطوير
for (const f of [".env", ".env.local", ".env.production", ".env.development"]) {
  fs.rmSync(path.join(out, f), { force: true });
}

console.log(`\n✔ تم تجهيز ملفات البرنامج في: ${out}`);