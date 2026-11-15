import crypto from "crypto";
import os from "os";
import { PLAN_DEFS, buildPlanCode, planStatusOf, type PlanKey, type PlanStatus } from "./license-plans";

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
export function generateActivationCode(deviceId: string, plan: PlanKey = "lifetime"): string {
  return buildPlanCode(normalizeDeviceId(deviceId), plan, SECRET_SALT);
}

/** التحقق من صحة كود التفعيل الذي أدخله العميل */
export function verifyActivationCode(deviceId: string, inputCode: string): boolean {
  if (!inputCode) return false;
  const cleanId = normalizeDeviceId(deviceId);
  const input = String(inputCode).trim().toUpperCase();

  // الكود القديم (بدون خطة) — تفعيل دائم، يبقى مدعوماً
  if (expectedLegacy(cleanId) === input) return true;

  // أكواد الخطط: XXXX-XXXX-XXXX-XXXL|T|Y
  for (const def of PLAN_DEFS) {
    const expected = buildPlanCode(cleanId, def.key, SECRET_SALT);
    if (expected === input) return true;
  }
  return false;
}

/** الكود القديم (12 حرفاً) — يُعتبر تفعيلاً مدى الحياة */
export function expectedLegacy(deviceId: string): string {
  const hash = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(normalizeDeviceId(deviceId))
    .digest("hex")
    .toUpperCase();
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/**
 * استنتاج الخطة من كود التفعيل — **بعد التحقق** من أن الكود صحيح لهذا الجهاز.
 * أي كود غير صحيح يرجّع null (لا يُعتبر تفعيلاً بأي خطة).
 */
export function planOfCode(deviceId: string, code: string): PlanKey | null {
  const cleanId = normalizeDeviceId(deviceId);
  const input = String(code || "").trim().toUpperCase();
  if (!input) return null;

  // الكود القديم (بدون خطة) = تفعيل مدى الحياة
  if (expectedLegacy(cleanId) === input) return "lifetime";

  for (const def of PLAN_DEFS) {
    if (buildPlanCode(cleanId, def.key, SECRET_SALT) === input) return def.key;
  }
  return null;
}

export interface LicenseStatus {
  isActivated: boolean;
  isExpired: boolean;
  isClockTampered: boolean;
  daysLeft: number;
  /** كود الجهاز الثابت المستخدم في التفعيل */
  machineId: string;
  /** نوع الاشتراك المفعل (سنة / سنتين / مدى الحياة) */
  plan: PlanKey | null;
  planLabel: string;
  /** تاريخ انتهاء الاشتراك (null = مدى الحياة أو غير مفعل) */
  expiresAt: string | null;
  /** أيام متبقية في الاشتراك (null = مدى الحياة أو غير مفعل) */
  planDaysLeft: number | null;
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
    activatedAt?: string | null;
  },
  deviceId: string
): LicenseStatus {
  const machineId = normalizeDeviceId(deviceId);
  const key = data.activationKey || "";
  const plan = key ? planOfCode(machineId, key) : null;
  const keyValid = Boolean(plan);
  const activatedAt = data.activatedAt || data.firstRunAt || new Date().toISOString();

  // اشتراك ساري (سنة / سنتين / مدى الحياة)
  if (keyValid && plan) {
    const ps: PlanStatus = planStatusOf(plan, activatedAt);
    const planExpired = ps.daysLeft !== null && ps.daysLeft <= 0;
    if (!planExpired) {
      return {
        isActivated: true,
        isExpired: false,
        isClockTampered: false,
        daysLeft: ps.daysLeft === null ? 9999 : ps.daysLeft,
        machineId,
        plan,
        planLabel: ps.planLabel,
        expiresAt: ps.expiresAt,
        planDaysLeft: ps.daysLeft,
        limits: { maxProducts: Infinity, maxInvoices: Infinity },
      };
    }
    // الاشتراك انتهى → يرجع لوضع التجربة (غير مفعّل) مع بيانات الخطة للعرض
    return {
      isActivated: false,
      isExpired: true,
      isClockTampered: false,
      daysLeft: 0,
      machineId,
      plan,
      planLabel: ps.planLabel,
      expiresAt: ps.expiresAt,
      planDaysLeft: 0,
      limits: { maxProducts: MAX_TRIAL_PRODUCTS, maxInvoices: MAX_TRIAL_INVOICES },
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
    plan: null,
    planLabel: "",
    expiresAt: null,
    planDaysLeft: null,
    limits: {
      maxProducts: MAX_TRIAL_PRODUCTS,
      maxInvoices: MAX_TRIAL_INVOICES,
    },
  };
}
