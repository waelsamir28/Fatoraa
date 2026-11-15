#!/usr/bin/env node
/**
 * مولد أكواد التفعيل (يعمل على جهازك فقط — لا يُنشر على الويب)
 *
 * الاستخدام:
 *   node scripts/activation-code.mjs FAT-6DCA-7179              # مدى الحياة
 *   node scripts/activation-code.mjs FAT-6DCA-7179 --year       # سنة
 *   node scripts/activation-code.mjs FAT-6DCA-7179 --2y         # سنتين
 *   node scripts/activation-code.mjs FAT-6DCA-7179 --life       # مدى الحياة
 *   node scripts/activation-code.mjs --all FAT-6DCA-7179        # الثلاثة معاً
 *
 * الخوارزمية (نفسها في البرنامج):
 *   code = HMAC_SHA256(SALT, "DEVICE|LETTER") → 15 حرف HEX + حرف الخطة
 *          → XXXX-XXXX-XXXX-XXXL   (Y = سنة، T = سنتان، L = مدى الحياة)
 *   الكود القديم (XXXX-XXXX-XXXX) لسه شغال ويعني تفعيل مدى الحياة.
 */

import crypto from "node:crypto";

const SALT = "WAEL_ALGAMMAL_FATORA_2026_PRO";

const PLANS = {
  "--year": { letter: "Y", label: "اشتراك سنة", months: 12, defaultPrice: 1000 },
  "--2y": { letter: "T", label: "اشتراك سنتين", months: 24, defaultPrice: 1700 },
  "--life": { letter: "L", label: "مدى الحياة", months: 0, defaultPrice: 3500 },
};

const VALID_ID = /^FAT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function makeCode(deviceId, letter) {
  const h = crypto.createHmac("sha256", SALT).update(`${deviceId}|${letter}`).digest("hex").toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 15)}${letter}`;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.log(
    [
      "",
      "الاستخدام:",
      "  node scripts/activation-code.mjs FAT-XXXX-XXXX            → كود مدى الحياة",
      "  node scripts/activation-code.mjs FAT-XXXX-XXXX --year     → كود سنة",
      "  node scripts/activation-code.mjs FAT-XXXX-XXXX --2y       → كود سنتين",
      "  node scripts/activation-code.mjs FAT-XXXX-XXXX --life     → كود مدى الحياة",
      "  node scripts/activation-code.mjs --all FAT-XXXX-XXXX      → الثلاثة معاً",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const all = args.includes("--all");
const ids = args.filter((a) => !a.startsWith("--")).map((a) => a.trim().toUpperCase());
const picked = Object.keys(PLANS).filter((k) => args.includes(k));
const plans = all || !picked.length ? (all ? ["--year", "--2y", "--life"] : ["--life"]) : picked;

let bad = false;
console.log("");
for (const id of ids) {
  if (!VALID_ID.test(id)) {
    console.log(`  ${id.padEnd(16)}  ✗ كود جهاز غير صالح (الصيغة FAT-XXXX-XXXX)`);
    bad = true;
    continue;
  }
  console.log(`  كود الجهاز: ${id}`);
  for (const p of plans) {
    const def = PLANS[p];
    const validity = def.months === 0 ? "بدون انتهاء" : `${def.months} شهراً`;
    console.log(
      `    ${def.label.padEnd(14)} ${def.defaultPrice.toString().padStart(5)} ج.م   ${validity.padEnd(12)} →  ${makeCode(id, def.letter)}`
    );
  }
  console.log("");
}

process.exit(bad ? 1 : 0);
