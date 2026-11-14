#!/usr/bin/env node
// تحديث رقم الإصدار في كل مكان دفعة واحدة
// الاستخدام:  npm run release 1.2.0
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("✖ استخدم رقماً بصيغة x.y.z  مثال: npm run release 1.2.0");
  process.exit(1);
}

function edit(rel, fn) {
  const file = path.join(root, rel);
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log(`✔ ${rel}`);
  }
}

// 1) نسخة الويب
edit("package.json", (s) => s.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`));
// 2) إصدار البرنامج الظاهر داخل الواجهة
edit("src/lib/constants.ts", (s) =>
  s.replace(/export const APP_VERSION = "[^"]*";/, `export const APP_VERSION = "${version}";`),
);
// 3) نسخة سطح المكتب (المسؤولة عن التحديث التلقائي)
edit("desktop/package.json", (s) => s.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`));

console.log(`\n✅ تم تحديث الإصدار إلى ${version} في: package.json + constants.ts + desktop/package.json`);
console.log(`\nخطوات إصدار نسخة جديدة على GitHub:
  1) git add -A && git commit -m "release v${version}"
  2) git push origin main
  3) git tag v${version} && git push origin v${version}
  (وقتها GitHub Actions يبني الـ EXE وينشره على Releases تلقائياً)`);
