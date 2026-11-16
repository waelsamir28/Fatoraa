// إرفاق حمولة التطبيق (app.7z) داخل مثبّت FATORA المخصص
// يُستدعى بعد بناء المثبّت (installer:build) وبعد حزم التطبيق الأصلي (win-unpacked).
const fs = require("node:fs");
const path = require("node:path");

const desktopDir = path.resolve(__dirname, "..");
const setupExe = path.join(desktopDir, "dist-setup", "win-unpacked", "FATORA-Setup.exe");
const payload = path.join(desktopDir, "dist", "win-unpacked", "resources", "app.7z");
const version = require(path.join(desktopDir, "package.json")).version;

const SIZE_OFFSET = 8; // حجم الحمولة (BigUInt64LE)
const LOGO_SIZE_OFFSET = 16; // حجم بيانات إضافية (غير مستخدم حاليًا)
const HEADER_SIZE = 32;

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(setupExe)) fail(`لم يتم العثور على المثبّت: ${setupExe}`);
if (!fs.existsSync(payload)) fail(`لم يتم العثور على حمولة التطبيق: ${payload}`);

const payloadSize = fs.statSync(payload).size;
const stubSize = fs.statSync(setupExe).size;

// نكتب الأحجام في أول 32 بايت من رأس الملف (قبل أي كود، لا يؤثر على تشغيل الملف)
const fd = fs.openSync(setupExe, "r+");
const head = Buffer.alloc(HEADER_SIZE);
fs.readSync(fd, head, 0, HEADER_SIZE, 0);
head.writeBigUInt64LE(BigInt(payloadSize), SIZE_OFFSET);
head.writeBigUInt64LE(BigInt(0), LOGO_SIZE_OFFSET);
fs.writeSync(fd, head, 0, HEADER_SIZE, 0);
fs.closeSync(fd);

// نسخة نهائية في dist باسم واضح للمستخدم
const outDir = path.join(desktopDir, "dist");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `FATORA-Setup-${version}.exe`);
fs.copyFileSync(setupExe, outFile);

// إلحاق الحمولة بالنسخة النهائية (على قطع لتقليل استهلاك الذاكرة)
const fdOut = fs.openSync(outFile, "a");
const fdIn = fs.openSync(payload, "r");
const chunk = Buffer.alloc(4 * 1024 * 1024);
let read = 0;
while (read < payloadSize) {
  const n = fs.readSync(fdIn, chunk, 0, Math.min(chunk.length, payloadSize - read), read);
  if (n <= 0) break;
  fs.writeSync(fdOut, chunk, 0, n);
  read += n;
}
fs.closeSync(fdIn);
fs.closeSync(fdOut);

const total = fs.statSync(outFile).size;
console.log(`✔ المثبّت الأساسي: ${(stubSize / 1048576).toFixed(1)} MB`);
console.log(`✔ الحمولة: ${(payloadSize / 1048576).toFixed(1)} MB`);
console.log(`✔ المثبّت النهائي: ${outFile} (${(total / 1048576).toFixed(1)} MB)`);
