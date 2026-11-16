import { desc, sql } from "drizzle-orm";
import fs from "fs";
import os from "os";
import { db } from "@/db";
import { backups, invoices } from "@/db/schema";
import { getConfig, setConfig } from "./config-store";
import { getCurrentLicense } from "@/lib/license-store";

/**
 * فحص صحة البرنامج:
 * - قاعدة البيانات تعمل؟
 * - آخر نسخة احتياطية ناجحة من إمتى؟
 * - مساحة التخزين كافية؟
 * - الترخيص ساري؟
 * - آخر فاتورة اتسجلت إمتى؟
 *
 * لو فيه مشكلة حرجة يتم إرسال تنبيه تيليجرام مرة واحدة يومياً (بدون إغراق).
 */

export type HealthLevel = "ok" | "warn" | "fail";

export interface HealthCheck {
  /** مسار التخزين الفعلي (لسياسة المساحة) */
  path?: string;
  /** هل الفحص على سيرفر سحابي؟ */
  cloud?: boolean;
  key: string;
  label: string;
  level: HealthLevel;
  value: string;
  hint?: string;
}

export interface HealthReport {
  at: string;
  level: HealthLevel;
  checks: HealthCheck[];
  alerts: string[];
}

const ALERT_KEY = "health.last_alert";

export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  const alerts: string[] = [];

  // 1) قاعدة البيانات
  try {
    const t0 = Date.now();
    await db.execute(sql`select 1`);
    const ms = Date.now() - t0;
    checks.push({
      key: "db",
      label: "قاعدة البيانات",
      level: ms > 2000 ? "warn" : "ok",
      value: `متصل (${ms} مللي ثانية)`,
      hint: ms > 2000 ? "الاستجابة بطيئة — راجع اتصال الشبكة أو السيرفر" : undefined,
    });
  } catch (e) {
    checks.push({
      key: "db",
      label: "قاعدة البيانات",
      level: "fail",
      value: "غير متصل",
      hint: e instanceof Error ? e.message : "",
    });
    alerts.push("قاعدة البيانات لا تستجيب!");
  }

  // 2) آخر نسخة احتياطية
  try {
    const [last] = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(1);
    if (!last) {
      checks.push({ key: "backup", label: "النسخ الاحتياطي", level: "warn", value: "لا توجد نسخة بعد", hint: "اضبط النسخ التلقائي" });
      alerts.push("لا توجد أي نسخة احتياطية للبيانات");
    } else {
      const days = Math.floor((Date.now() - new Date(last.createdAt).getTime()) / 86_400_000);
      const level: HealthLevel = last.status !== "ok" ? "fail" : days > 7 ? "fail" : days > 2 ? "warn" : "ok";
      checks.push({
        key: "backup",
        label: "آخر نسخة احتياطية",
        level,
        value: days === 0 ? "اليوم" : `منذ ${days} يوم (${last.fileName || last.location})`,
        hint: level === "fail" ? "النسخ متأخرة — راجع النسخ التلقائي فوراً" : undefined,
      });
      if (level === "fail") alerts.push(`آخر نسخة احتياطية ناجحة كانت منذ ${days} يوم`);
    }
  } catch {
    checks.push({ key: "backup", label: "النسخ الاحتياطي", level: "warn", value: "غير متاح" });
  }

  // 3) مساحة التخزين — المكان اللي قاعدة البيانات محفوظة فيه فعلاً
  try {
    const isCloud = Boolean(process.env.DATABASE_URL);
    const dir = process.env.PGLITE_DATA_DIR || (isCloud ? os.tmpdir() : process.cwd());
    const st = fs.statfsSync(dir);
    const freeGb = (st.bavail * st.bsize) / 1024 ** 3;
    const totalGb = (st.blocks * st.bsize) / 1024 ** 3;
    const pct = totalGb > 0 ? (freeGb / totalGb) * 100 : 100;
    const level: HealthLevel = freeGb < 0.5 ? "fail" : freeGb < 2 ? "warn" : "ok";
    checks.push({
      key: "disk",
      label: "مساحة التخزين",
      level,
      value: `${freeGb.toFixed(1)} جيجا حرة من ${totalGb.toFixed(0)} جيجا (${pct.toFixed(0)}%)`,
      hint: isCloud
        ? `هذه مساحة السيرفر السحابي المؤقتة (${dir}) وليست مساحة جهازك — البرنامج على Vercel وقاعدة البيانات على الاستضافة.`
        : `هذه مساحة القرص اللي بتحفظ فيه قاعدة البيانات: ${dir}`,
      path: dir,
      cloud: isCloud,
    });
    if (level === "fail") alerts.push(`مساحة التخزين منخفضة: ${freeGb.toFixed(1)} جيجا فقط`);
  } catch (e) {
    checks.push({
      key: "disk",
      label: "مساحة التخزين",
      level: "warn",
      value: "غير متاح للفحص من هنا",
      hint: `تعذّر قراءة مساحة القرص (${e instanceof Error ? e.message : "خطأ غير معروف"}) — لا يؤثر على عمل البرنامج.`,
      cloud: Boolean(process.env.DATABASE_URL),
    });
  }

  // 4) الترخيص
  try {
    const lic = await getCurrentLicense();
    const level: HealthLevel = lic.isActivated ? (lic.planDaysLeft !== null && lic.planDaysLeft <= 7 ? "warn" : "ok") : lic.isExpired ? "fail" : "warn";
    checks.push({
      key: "license",
      label: "الترخيص",
      level,
      value: lic.isActivated
        ? lic.plan === "lifetime"
          ? "مدى الحياة ✓"
          : `${lic.planLabel} — متبقي ${lic.planDaysLeft} يوم`
        : lic.isExpired
          ? "منتهي"
          : `تجريبي — متبقي ${lic.daysLeft} يوم`,
    });
    if (level === "fail") alerts.push("ترخيص البرنامج منتهي");
  } catch {
    checks.push({ key: "license", label: "الترخيص", level: "warn", value: "تعذّر القراءة" });
  }

  // 5) حركة الفواتير (مؤشر تشغيلي، ليس خطأ)
  try {
    const [lastInv] = await db
      .select({ date: invoices.date })
      .from(invoices)
      .orderBy(desc(invoices.date))
      .limit(1);
    checks.push({
      key: "activity",
      label: "آخر فاتورة",
      level: "ok",
      value: lastInv?.date ? `${Math.floor((Date.now() - new Date(lastInv.date).getTime()) / 86_400_000)} يوم` : "لا توجد فواتير",
    });
  } catch {
    /* تجاهل */
  }

  const level: HealthLevel = checks.some((c) => c.level === "fail")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "ok";

  const report: HealthReport = { at: new Date().toISOString(), level, checks, alerts };

  // إرسال التنبيه مرة واحدة يومياً فقط
  if (alerts.length) await maybeAlert(report);

  return report;
}

/** إرسال تنبيه تيليجرام (حد أقصى مرة كل 20 ساعة) */
async function maybeAlert(report: HealthReport): Promise<void> {
  try {
    const last = await getConfig(ALERT_KEY);
    if (last && Date.now() - new Date(last).getTime() < 20 * 3600 * 1000) return;
    const { sendTelegram } = await import("./notify");
    const text = [
      "🚨 <b>تنبيه صحة برنامج FATORA</b>",
      "",
      ...report.alerts.map((a) => `• ${a}`),
      "",
      `الحالة العامة: ${report.level === "fail" ? "خطأ حرج" : "تحذير"}`,
      `الوقت: ${new Date().toLocaleString("ar-EG")}`,
    ].join("\n");
    const r = await sendTelegram(text);
    if (r.ok) await setConfig(ALERT_KEY, new Date().toISOString());
  } catch {
    /* التنبيه مساعد */
  }
}
