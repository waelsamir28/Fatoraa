import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { checkLicense, isValidDeviceId, normalizeDeviceId, type LicenseStatus } from "./license";

/**
 * تخزين بيانات الترخيص:
 *
 * 1) قاعدة البيانات (app_config) — الأساس، يعمل على الويب والـ exe، ولا يضيع مع
 *    إعادة تشغيل السيرفر (كانت المشكلة أن /tmp على Vercel يُمسح).
 * 2) ملف lic.dat — نسخة احتياطية محلية:
 *      - نسخة الويندوز: %APPDATA%\.fatora-sys
 *      - السيرفر: FATORA_DATA_DIR أو /tmp (للقراءة فقط، نتجاهل الفشل)
 *
 * كود الجهاز (Device ID) يُولَّد **مرة واحدة** ويُحفظ، فبعدها يبقى ثابتاً أبداً
 * حتى لو تغيّر اسم المضيف أو إعادة نشر السيرفر — وهذا سبب خطأ
 * «كود التفعيل غير صحيح لهذا الجهاز» سابقاً على Vercel.
 */

export interface LicenseData {
  firstRunAt?: string | null;
  lastRunAt?: string | null;
  activationKey?: string | null;
}

const CFG_DEVICE = "license.device_id";
const CFG_STATE = "license.state";

/** حالة احتياطية في الذاكرة (لو قاعدة البيانات غير جاهزة) */
const mem = globalThis as typeof globalThis & { __fatoraLicense?: LicenseData };

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

/** قراءة/كتابة إعداد من قاعدة البيانات (مع تجاهل الأخطاء) */
async function getCfg(key: string): Promise<string> {
  try {
    const { getConfig } = await import("./server/config-store");
    return await getConfig(key);
  } catch {
    return "";
  }
}

async function setCfg(key: string, value: string): Promise<boolean> {
  try {
    const { setConfig } = await import("./server/config-store");
    await setConfig(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * كود الجهاز الثابت:
 * - لو موجود في قاعدة البيانات → يُستخدم كما هو (ثابت للأبد).
 * - وإلا نولّد كوداً عشوائياً جديداً ونحفظه (مرة واحدة فقط).
 * - لو قاعدة البيانات غير متاحة نهائياً → بصمة الجهاز الطبيعيّة.
 */
export async function getDeviceId(): Promise<string> {
  const { getMachineId } = await import("./license");

  // نسخة الويندوز: بصمة الجهاز حتمية من نظام التشغيل (الـ Electron يرسلها)
  // → نفس الكود في الوضع المحلي (بدون إنترنت) والوضع السحابي.
  if ((process.env.FATORA_DEVICE_HINT || "").trim()) {
    const deterministic = getMachineId();
    if (deterministic !== normalizeDeviceId(await getCfg(CFG_DEVICE))) {
      void setCfg(CFG_DEVICE, deterministic);
    }
    return deterministic;
  }

  const saved = normalizeDeviceId(await getCfg(CFG_DEVICE));
  if (isValidDeviceId(saved)) return saved;

  const generated = getMachineId();
  const ok = await setCfg(CFG_DEVICE, generated);
  if (!ok) return generated;
  // نستخدم الكود الذي حُفظ فعلاً (لو الحفظ فشل نستخدم المولّد)
  const check = normalizeDeviceId(await getCfg(CFG_DEVICE));
  return isValidDeviceId(check) ? check : generated;
}

/** توليد كود جهاز ثابت جديد (يُستخدم لو أردت إعادة ضبط الجهاز) */
export function newDeviceId(): string {
  const hash = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `FAT-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

function readFileData(): LicenseData | null {
  const file = resolveLicenseFile();
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as LicenseData;
  } catch {
    return null;
  }
}

export function writeFileData(data: LicenseData, file: string | null = resolveLicenseFile()) {
  if (!file) return false;
  try {
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
    return true;
  } catch {
    return false;
  }
}

/** قراءة بيانات الترخيص (قاعدة البيانات أولاً ثم الملف ثم الذاكرة) */
export async function readLicenseData(): Promise<LicenseData> {
  const now = new Date().toISOString();

  const raw = await getCfg(CFG_STATE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LicenseData;
      parsed.lastRunAt = now;
      void setCfg(CFG_STATE, JSON.stringify(parsed));
      return parsed;
    } catch {
      /* تجاهل */
    }
  }

  const fromFile = readFileData();
  if (fromFile) {
    fromFile.lastRunAt = now;
    void setCfg(CFG_STATE, JSON.stringify(fromFile));
    return fromFile;
  }

  const initial: LicenseData = { firstRunAt: now, lastRunAt: now, activationKey: "" };
  const saved = await setCfg(CFG_STATE, JSON.stringify(initial));
  if (!saved) {
    mem.__fatoraLicense = initial;
    writeFileData(initial);
  }
  return initial;
}

/** حفظ بيانات الترخيص في كل الأماكن المتاحة */
export async function saveLicenseData(data: LicenseData): Promise<boolean> {
  const asJson = JSON.stringify(data);
  const dbOk = await setCfg(CFG_STATE, asJson);
  writeFileData(data);
  if (!dbOk) mem.__fatoraLicense = data;
  return dbOk;
}

/** حالة الترخيص الحالية (تُستخدم في مسارات المنتجات والفواتير) */
export async function getCurrentLicense(): Promise<LicenseStatus> {
  try {
    const [deviceId, data] = await Promise.all([getDeviceId(), readLicenseData()]);
    return checkLicense(data, deviceId);
  } catch {
    const { getMachineId } = await import("./license");
    return checkLicense({}, getMachineId());
  }
}
