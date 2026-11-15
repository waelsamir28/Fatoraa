import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { runRenewalReminders, resetReminders, expiringList } from "@/lib/server/renewal-reminders";

export const dynamic = "force-dynamic";

function cronOk(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(secret && provided && provided === secret);
}

/**
 * GET:
 * - مع CRON_SECRET (من Vercel Cron)  → يشغّل التنبيهات ويرسلها
 * - بدون سر (من اللوحة)              → يرجّع قائمة الاشتراكات القريبة من الانتهاء
 */
export async function GET(req: Request) {
  if (cronOk(req)) {
    const result = await runRenewalReminders();
    return NextResponse.json(result);
  }
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "هذه الشاشة للمالك فقط" }, { status: 403 });
  }
  const items = await expiringList();
  return NextResponse.json({ items });
}

/**
 * تشغيل تنبيهات التجديد:
 * - تلقائي: Vercel Cron يرسله بـ GET مع CRON_SECRET
 * - يدوي: المالك من لوحة التراخيص
 */
export async function POST(req: Request) {
  if (!cronOk(req)) {
    const session = await getSession();
    if (!session || session.role !== "owner") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const url = new URL(req.url);
    if (url.searchParams.get("reset") === "1") await resetReminders();
  }
  const result = await runRenewalReminders();
  return NextResponse.json(result);
}
