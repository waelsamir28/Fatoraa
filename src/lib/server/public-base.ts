import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * تحديد الرابط العام الذي يفتحه العميل عند مسح QR.
 *
 * مشكلة مهمة: نسخة سطح المكتب تعمل على 127.0.0.1 — ورابط QR بـ localhost
 * لا يفتح على موبايل العميل. لذلك نفضّل دائماً الرابط السحابي.
 *
 * الترتيب:
 *  1) PUBLIC_BASE_URL (يمرره برنامج سطح المكتب من إعداداته)
 *  2) رابط السحابة المحفوظ في settings.json على الجهاز
 *  3) x-forwarded-host / host من الطلب (Vercel يمرره صحيحاً)
 *  4) لا نقبل عناوين loopback — نرجع null ليتصرف المستدعي
 */

const LOOPBACK = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|::1)/i;

function cloudFromDesktopSettings(): string | null {
  try {
    if (process.platform !== "win32" && !process.env.APPDATA) return null;
    const appData = process.env.APPDATA || path.join(os.homedir(), ".config");
    const file = path.join(appData, "AlGamalPOS", "settings.json");
    if (!fs.existsSync(file)) return null;
    const s = JSON.parse(fs.readFileSync(file, "utf8")) as { cloudUrl?: string };
    return s.cloudUrl ? String(s.cloudUrl).replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

function clean(url: string | undefined | null): string | null {
  if (!url) return null;
  const v = String(url).trim().replace(/\/+$/, "");
  if (!v) return null;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (LOOPBACK.test(u.host)) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function resolvePublicBase(req?: Request): string | null {
  const fromEnv = clean(process.env.PUBLIC_BASE_URL) || clean(process.env.FATORA_CLOUD_URL);
  if (fromEnv) return fromEnv;

  const fromSettings = clean(cloudFromDesktopSettings() || null);
  if (fromSettings) return fromSettings;

  if (req) {
    const headers = req.headers;
    const host = headers.get("x-forwarded-host") || headers.get("host");
    const proto = headers.get("x-forwarded-proto") || (host && /^localhost|^127\./.test(host) ? "http" : "https");
    if (host) {
      const candidate = clean(`${proto}://${host}`);
      if (candidate) return candidate;
    }
  }

  return null;
}
