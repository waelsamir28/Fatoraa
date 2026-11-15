import crypto from "crypto";
import os from "os";

// الكلمة السرية الخاصة بك وحدك (لا تشاركها مع أحد)
const SECRET_SALT = "WAEL_ALGAMMAL_FATORA_2026_PRO";

export const TRIAL_DAYS = 15;
export const MAX_TRIAL_PRODUCTS = 50;
export const MAX_TRIAL_INVOICES = 30;

/**
 * بصمة الجهاز الطبيعيّة (نظام التشغيل + المعالج + الرام).
 * تُستخدم كقيمة أوّلية لكود الجهاز على النسخة المثبّتة (exe).
 * ملاحظة: على السيرفرات السحابية (Vercel) هذه البصمة تتغيّر، لذلك لا تُستخدم
 * مباشرة في التفعيل — بل الكود الثابت المحفوظ في قاعدة البيانات (انظر license-store).
 */
export function getMachineId(): string {
  // في نسخة الويندوز يرسل الـ Electron بصمة الجهاز الحقيقية (نفسها في الوضعين
  // المحلي والسحابي) فيبقى كود الجهاز واحداً مهما اشتغل البرنامج.
  const hint = (process.env.FATORA_DEVICE_HINT || "").trim();
  const raw =
    hint ||
    [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model || "cpu", os.totalmem().toString()].join("|");

  const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
  return `FAT-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

/** هل النص كود جهاز صالح؟ (FAT-XXXX-XXXX) */
export function isValidDeviceId(id: string): boolean {
  return /^FAT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(String(id || "").trim().toUpperCase());
}

/** تنظيم كود الجهاز (حروف كبيرة بدون مسافات) */
export function normalizeDeviceId(id: string): string {
  return String(id || "").trim().toUpperCase();
}

/** حساب كود التفعيل الصحيح بناءً على كود الجهاز */
export function generateActivationCode(deviceId: string): string {
  const cleanId = normalizeDeviceId(deviceId);
  const hash = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(cleanId)
    .digest("hex")
    .toUpperCase();

  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/** التحقق من صحة كود التفعيل الذي أدخله العميل */
export function verifyActivationCode(deviceId: string, inputCode: string): boolean {
  if (!inputCode) return false;
  const expected = generateActivationCode(deviceId);
  return expected === String(inputCode).trim().toUpperCase();
}

export interface LicenseStatus {
  isActivated: boolean;
  isExpired: boolean;
  isClockTampered: boolean;
  daysLeft: number;
  /** كود الجهاز الثابت المستخدم في التفعيل */
  machineId: string;
  limits: {
    maxProducts: number;
    maxInvoices: number;
  };
}

/** فحص حالة النسخة (مفعلة / تجريبية / منتهية / تلاعب بالتاريخ) */
export function checkLicense(
  data: {
    firstRunAt?: string | null;
    lastRunAt?: string | null;
    activationKey?: string | null;
  },
  deviceId: string
): LicenseStatus {
  const machineId = normalizeDeviceId(deviceId);
  const isActivated = verifyActivationCode(machineId, data.activationKey || "");

  if (isActivated) {
    return {
      isActivated: true,
      isExpired: false,
      isClockTampered: false,
      daysLeft: 9999,
      machineId,
      limits: { maxProducts: Infinity, maxInvoices: Infinity },
    };
  }

  const now = Date.now();
  const firstRun = data.firstRunAt ? new Date(data.firstRunAt).getTime() : now;
  const lastRun = data.lastRunAt ? new Date(data.lastRunAt).getTime() : now;

  // كشف إرجاع تاريخ الويندوز للخلف (بسماحية ساعة واحدة فقط)
  const isClockTampered = now < lastRun - 3600 * 1000;

  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((now - firstRun) / msPerDay);
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsedDays);
  const isExpired = isClockTampered || daysLeft <= 0;

  return {
    isActivated: false,
    isExpired,
    isClockTampered,
    daysLeft,
    machineId,
    limits: {
      maxProducts: MAX_TRIAL_PRODUCTS,
      maxInvoices: MAX_TRIAL_INVOICES,
    },
  };
}
