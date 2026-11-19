import { runHealthChecks } from "@/lib/server/health";
import { getSession } from "@/lib/server/session";
import { isPglite } from "@/db";

export const dynamic = "force-dynamic";

/**
 * فحص صحة البرنامج.
 * - GET بسيط (بدون تفاصيل) لمراقب خارجي: { ok: true }
 * - GET ?full=1 للوحة الصحة: كل الفحوصات + التنبيهات
 * - مع CRON_SECRET: يُشغّل الفحص ويرسل التنبيهات (يُستخدم مع Cron اليومي)
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const isCron = Boolean(secret && provided && provided === secret);

  if (u.searchParams.get("full") === "1" && !isCron) {
    const session = await getSession();
    if (!session) return Response.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (u.searchParams.get("full") === "1" || isCron) {
    const report = await runHealthChecks();
    return Response.json({ ok: report.level !== "fail", ...report }, { status: report.level === "fail" ? 503 : 200 });
  }

  // فحص خفيف للربط الخارجي (Uptime monitor)
  try {
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, dbMode: isPglite ? "local-pglite" : "cloud-postgres" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
