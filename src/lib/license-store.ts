import fs from "fs";
import os from "os";
import path from "path";
import { checkLicense, type LicenseStatus } from "./license";

/**
 * تخزين بيانات الترخيص (lic.dat)
 *
 * - نسخة الويندوز: تُحفظ في %APPDATA%\.fatora-sys
 * - نسخة السيرفر (Vercel): نظام الملفات للقراءة فقط، لذلك نحاول مجلداً قابلاً للكتابة
 *   (FATORA_DATA_DIR أو /tmp) وإن فشل كل شيء نكمل بالقيم الافتراضية بدون تعطيل البرنامج.
 */

export interface LicenseData {
  firstRunAt?: string | null;
  lastRunAt?: string | null;
  activationKey?: string | null;
}

function candidateDirs(): string[] {
  const dirs: string[] = [];
  const override = process.env.FATORA_DATA_DIR;
  if (override) dirs.push(override);
  const appData = process.env.APPDATA || (process.platform === "win32" ? os.homedir() : "");
  if (appData) dirs.push(path.join(appData, ".fatora-sys"));
  dirs.push(path.join(os.tmpdir(), ".fatora-sys"));
  return dirs;
}

/** يرجّع أول مسار ملف قابل للكتابة، أو null لو لم يوجد (بيئة للقراءة فقط) */
function resolveLicenseFile(): string | null {
  for (const dir of candidateDirs()) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return path.join(dir, "lic.dat");
    } catch {
      /* جرّب المسار التالي */
    }
  }
  return null;
}

export function readLicenseData(): LicenseData {
  const now = new Date().toISOString();
  const file = resolveLicenseFile();
  if (!file) return { firstRunAt: now, lastRunAt: now, activationKey: "" };

  if (!fs.existsSync(file)) {
    const initial: LicenseData = { firstRunAt: now, lastRunAt: now, activationKey: "" };
    writeLicenseData(initial, file);
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as LicenseData;
    // تحديث آخر وقت فتح للبرنامج إذا كان التاريخ طبيعياً
    if (new Date(now).getTime() >= new Date(parsed.lastRunAt || now).getTime()) {
      parsed.lastRunAt = now;
      writeLicenseData(parsed, file);
    }
    return parsed;
  } catch {
    return { firstRunAt: now, lastRunAt: now, activationKey: "" };
  }
}

export function writeLicenseData(data: LicenseData, file: string | null = resolveLicenseFile()) {
  if (!file) return false;
  try {
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
    return true;
  } catch {
    return false;
  }
}

/** حالة الترخيص الحالية (تُستخدم في مسارات المنتجات والفواتير) */
export function getCurrentLicense(): LicenseStatus {
  try {
    return checkLicense(readLicenseData());
  } catch {
    return checkLicense({});
  }
}
