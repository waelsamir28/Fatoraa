import { handle, readJson } from "@/lib/server/http";
import { requireSession, isAuthEnabled } from "@/lib/server/session";
import { getSchedule, saveSchedule } from "@/lib/server/backup-schedule";
import { maybeRunScheduledBackup } from "@/lib/server/backup";

export const dynamic = "force-dynamic";

/** قراءة إعدادات النسخ المجدول وحالة آخر تشغيل */
export function GET() {
  return handle(async () => {
    if (await isAuthEnabled()) await requireSession("owner", "manager");
    const s = await getSchedule();
    const nextRun = s.lastRun
      ? new Date(new Date(s.lastRun).getTime() + s.everyHours * 3600_000).toISOString()
      : new Date().toISOString();
    return { ...s, nextRun, due: !s.lastRun || new Date(nextRun).getTime() <= Date.now() };
  });
}

/** حفظ الإعدادات أو تشغيل النسخة الآن */
export function PUT(req: Request) {
  return handle(async () => {
    if (await isAuthEnabled()) await requireSession("owner", "manager");
    const b = await readJson(req);
    if (b.action === "run-now") {
      const r = await maybeRunScheduledBackup();
      return { ok: true, ran: r.ran, reason: r.reason || "", schedule: await getSchedule() };
    }
    const saved = await saveSchedule({
      enabled: b.enabled === undefined ? undefined : Boolean(b.enabled),
      everyHours: b.everyHours === undefined ? undefined : Number(b.everyHours),
      keepCount: b.keepCount === undefined ? undefined : Number(b.keepCount),
      hour: b.hour === undefined ? undefined : Number(b.hour),
      sendTelegram: b.sendTelegram === undefined ? undefined : Boolean(b.sendTelegram),
    });
    return saved;
  });
}
