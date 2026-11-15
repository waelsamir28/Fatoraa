#!/usr/bin/env node
/**
 * مولد أكواد التفعيل (يعمل على جهازك فقط — لا يُنشر على الويب)
 *
 * الاستخدام:
 *   node scripts/activation-code.mjs FAT-6DCA-7179
 *   node scripts/activation-code.mjs FAT-6DCA-7179 FAT-1234-ABCD
 *
 * الخوارزمية (نفسها في البرنامج):
 *   code = HMAC_SHA256(SALT, "FAT-XXXX-XXXX") → أول 12 حرف HEX → XXXX-XXXX-XXXX
 */

import crypto from "node:crypto";

const SALT = "WAEL_ALGAMMAL_FATORA_2026_PRO";

function makeCode(deviceId) {
  const clean = String(deviceId).trim().toUpperCase();
  if (!/^FAT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean)) {
    return { deviceId, error: "كود جهاز غير صالح (الصيغة FAT-XXXX-XXXX)" };
  }
  const h = crypto.createHmac("sha256", SALT).update(clean).digest("hex").toUpperCase();
  return { deviceId: clean, code: `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}` };
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.log("الاستخدام: node scripts/activation-code.mjs FAT-XXXX-XXXX [FAT-YYYY-YYYY ...]");
  process.exit(1);
}

console.log("");
for (const id of ids) {
  const r = makeCode(id);
  if (r.error) console.log(`  ${id.padEnd(16)}  ✗ ${r.error}`);
  else console.log(`  ${r.deviceId.padEnd(16)}  →  ${r.code}`);
}
console.log("");
