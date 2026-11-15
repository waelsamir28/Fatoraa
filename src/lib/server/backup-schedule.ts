import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { CONFIG_KEYS, getConfig, setConfig } from "./config-store";

/** إعدادات النسخ الاحتياطي المجدول — تُحفظ في app_config */
export interface BackupSchedule {
  /** النسخ التلقائي مفعّل */
  enabled: boolean;
  /** كل كم ساعة يعمل النسخ (1..72) */
  everyHours: number;
  /** الاحتفاظ بآخر كام نسخة (5..200) */
  keepCount: number;
  /** ساعة اليوم للنسخة اليومية (0..23) — تُستخدم لو everyHours = 24 */
  hour: number;
  /** آخر مرة عمل فيها النسخ */
  lastRun: string;
  /** آخر نتيجة */
  lastStatus: string;
  /** إرسال نسخة إلى تيليجرام */
  sendTelegram: boolean;
}

export const DEFAULT_SCHEDULE: BackupSchedule = {
  enabled: true,
  everyHours: 24,
  keepCount: 30,
  hour: 20,
  lastRun: "",
  lastStatus: "",
  sendTelegram: true,
};

const SCHEDULE_KEY = "backup.schedule";

export async function getSchedule(): Promise<BackupSchedule> {
  try {
    const raw = await getConfig(SCHEDULE_KEY);
    if (!raw) return { ...DEFAULT_SCHEDULE };
    const o = JSON.parse(raw) as Partial<BackupSchedule>;
    return {
      enabled: o.enabled !== false,
      everyHours: clamp(Number(o.everyHours) || 24, 1, 72),
      keepCount: clamp(Number(o.keepCount) || 30, 5, 200),
      hour: clamp(Number(o.hour) || 20, 0, 23),
      lastRun: typeof o.lastRun === "string" ? o.lastRun : "",
      lastStatus: typeof o.lastStatus === "string" ? o.lastStatus : "",
      sendTelegram: o.sendTelegram !== false,
    };
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

export async function saveSchedule(patch: Partial<BackupSchedule>): Promise<BackupSchedule> {
  const current = await getSchedule();
  const next: BackupSchedule = {
    ...current,
    ...patch,
    everyHours: clamp(Number(patch.everyHours ?? current.everyHours), 1, 72),
    keepCount: clamp(Number(patch.keepCount ?? current.keepCount), 5, 200),
    hour: clamp(Number(patch.hour ?? current.hour), 0, 23),
  };
  await setConfig(SCHEDULE_KEY, JSON.stringify(next));
  return next;
}

/** هل حان وقت النسخة القادمة حسب الجدول؟ */
export async function isScheduleDue(): Promise<boolean> {
  const s = await getSchedule();
  if (!s.enabled) return false;
  if (!s.lastRun) return true;
  const last = new Date(s.lastRun).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last >= s.everyHours * 3600_000;
}

/** تسجيل نتيجة النسخة في الجدول */
export async function markRun(status: string): Promise<void> {
  await saveSchedule({ lastRun: new Date().toISOString(), lastStatus: status });
}

/** حذف النسخ القديمة فوق الحد المسموح (من سجل قاعدة البيانات) */
export async function pruneOldBackups(keep: number): Promise<number> {
  try {
    const { backups } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select({ id: backups.id }).from(backups).orderBy(desc(backups.createdAt));
    const old = rows.slice(Math.max(5, keep));
    if (!old.length) return 0;
    const { inArray } = await import("drizzle-orm");
    await db.delete(backups).where(inArray(backups.id, old.map((r) => r.id)));
    return old.length;
  } catch {
    return 0;
  }
}

/** عنوان إعدادات السحابة المكتشفة */
export async function getCloudTarget(): Promise<"telegram" | "local" | "none"> {
  const token = await getConfig(CONFIG_KEYS.telegramToken);
  const chat = await getConfig(CONFIG_KEYS.telegramChat);
  if (token && chat) return "telegram";
  return "local";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

/** لمس جدول appConfig حتى لا يشتكي TypeScript من عدم الاستخدام */
export const _scheduleTable = appConfig;
