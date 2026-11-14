import crypto from "crypto";
import os from "os";

// الكلمة السرية الخاصة بك وحدك (لا تشاركها مع أحد)
const SECRET_SALT = "WAEL_ALGAMMAL_FATORA_2026_PRO";

export const TRIAL_DAYS = 15;
export const MAX_TRIAL_PRODUCTS = 50;
export const MAX_TRIAL_INVOICES = 30;

/** توليد بصمة ثابتة وفريدة لجهاز العميل */
export function getMachineId(): string {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "cpu",
    os.totalmem().toString(),
  ].join("|");

  const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
  return `FAT-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

/** حساب كود التفعيل الصحيح بناءً على بصمة الجهاز */
export function generateActivationCode(machineId: string): string {
  const cleanId = machineId.trim().toUpperCase();
  const hash = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(cleanId)
    .digest("hex")
    .toUpperCase();

  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/** التحقق من صحة كود التفعيل الذي أدخله العميل */
export function verifyActivationCode(machineId: string, inputCode: string): boolean {
  if (!inputCode) return false;
  const expected = generateActivationCode(machineId);
  return expected === inputCode.trim().toUpperCase();
}

export interface LicenseStatus {
  isActivated: boolean;
  isExpired: boolean;
  isClockTampered: boolean;
  daysLeft: number;
  machineId: string;
  limits: {
    maxProducts: number;
    maxInvoices: number;
  };
}

/** فحص حالة النسخة (مفعلة / تجريبية / منتهية / تلاعب بالتاريخ) */
export function checkLicense(data: {
  firstRunAt?: string | null;
  lastRunAt?: string | null;
  activationKey?: string | null;
}): LicenseStatus {
  const machineId = getMachineId();
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
