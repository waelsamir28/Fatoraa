import { and, desc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { licenseActivations } from "@/db/schema";
import { getConfig, setConfig } from "./config-store";
import { sendTelegram } from "./notify";

/**
 * تنبيهات اقتراب انتهاء اشتراكات العملاء — تُرسل لك على تيليجرام.
 *
 * يعمل مع Cron يومي (vercel.json) أو يدوياً من لوحة التراخيص.
 * كل جهاز يُنبّه مرة واحدة عند كل مرحلة (10 أيام ثم 3 أيام) لتجنّب التكرار.
 */

const STAGES = [10, 3];
const SENT_KEY = "license.reminders.sent";

interface SentMap {
  [deviceId: string]: number; // آخر مرحلة أُرسلت
}

function daysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
}

/** يفحص كل التراخيص السارية ويرسل تنبيهات للتي تقترب من الانتهاء */
export async function runRenewalReminders(): Promise<{
  checked: number;
  sent: { deviceId: string; daysLeft: number; plan: string }[];
  skipped: number;
  telegram: { ok: boolean; error?: string };
}> {
  // آخر عملية لكل جهاز = حالته الحالية
  const rows = await db
    .select()
    .from(licenseActivations)
    .where(and(isNotNull(licenseActivations.expiresAt), lte(licenseActivations.expiresAt, new Date(Date.now() + 40 * 86_400_000))))
    .orderBy(desc(licenseActivations.createdAt))
    .limit(500);

  const byDevice = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.plan === "lifetime") continue;
    if (!byDevice.has(r.deviceId)) byDevice.set(r.deviceId, r);
  }

  let sentMap: SentMap = {};
  try {
    const raw = await getConfig(SENT_KEY);
    if (raw) sentMap = JSON.parse(raw) as SentMap;
  } catch {
    sentMap = {};
  }

  const sent: { deviceId: string; daysLeft: number; plan: string }[] = [];
  let skipped = 0;

  for (const [deviceId, r] of byDevice) {
    const left = daysLeft(r.expiresAt);
    if (left === null) continue;
    // أعلى مرحلة وصلها: 10 لو باقي 10 أيام أو أقل، 3 لو باقي 3 أيام أو أقل
    const stage = left <= 3 ? 3 : left <= 10 ? 10 : null;
    if (stage === null) {
      skipped += 1;
      continue;
    }
    const already = sentMap[deviceId] ?? 99;
    // لا نرسل نفس المرحلة مرتين، ولا مرحلة أقل لو الأكبر اتبعت
    if (already <= stage) {
      skipped += 1;
      continue;
    }
    sentMap[deviceId] = stage;
    sent.push({ deviceId, daysLeft: left, plan: r.plan });
  }

  if (sent.length) {
    const lines = [
      "⏰ <b>اشتراكات FATORA تقترب من الانتهاء</b>",
      "",
      ...sent.map(
        (s) =>
          `• <code>${s.deviceId}</code> — ${s.plan === "tier2" ? "سنتين" : "سنة"} — باقي <b>${s.daysLeft}</b> يوم`
      ),
      "",
      "كلّم العميل قبل الانتهاء واعرض عليه خصم التجديد المبكر 15%.",
    ];
    const tg = await sendTelegram(lines.join("\n"));
    try {
      await setConfig(SENT_KEY, JSON.stringify(sentMap));
    } catch {
      /* ignore */
    }
    return { checked: byDevice.size, sent, skipped, telegram: tg };
  }

  // لا يوجد جديد — نرسل رسالة فقط لو كان هناك تراخيص قاربت ولا شيء أُرسل
  return {
    checked: byDevice.size,
    sent,
    skipped,
    telegram: { ok: true, error: "لا توجد تنبيهات جديدة" },
  };
}

/** تصفير سجل التنبيهات (لاختبار الإرسال) */
export async function resetReminders(): Promise<void> {
  await setConfig(SENT_KEY, "{}");
}

/** حالة كل الاشتراكات القريبة من الانتهاء (لعرضها في اللوحة) */
export async function expiringList(): Promise<{ deviceId: string; plan: string; daysLeft: number; expiresAt: Date | null }[]> {
  const rows = await db
    .select()
    .from(licenseActivations)
    .where(isNotNull(licenseActivations.expiresAt))
    .orderBy(desc(licenseActivations.createdAt))
    .limit(500);
  const byDevice = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!byDevice.has(r.deviceId)) byDevice.set(r.deviceId, r);
  const out: { deviceId: string; plan: string; daysLeft: number; expiresAt: Date | null }[] = [];
  for (const [deviceId, r] of byDevice) {
    if (r.plan === "lifetime") continue;
    const left = daysLeft(r.expiresAt);
    if (left !== null && left <= 30) out.push({ deviceId, plan: r.plan, daysLeft: left, expiresAt: r.expiresAt });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** هل يوجد تفعيل لهذا الجهاز؟ (helper للاستخدام في cron) */
export async function hasActivation(deviceId: string): Promise<boolean> {
  const rows = await db
    .select({ id: licenseActivations.id })
    .from(licenseActivations)
    .where(eq(licenseActivations.deviceId, deviceId))
    .limit(1);
  return rows.length > 0;
}
