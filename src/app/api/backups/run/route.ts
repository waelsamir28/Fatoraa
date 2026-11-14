import { NextResponse } from "next/server";
import { handle } from "@/lib/server/http";
import { runBackup } from "@/lib/server/backup";
import { requireSession, isAuthEnabled } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** إنشاء نسخة احتياطية الآن (يدوياً أو من مجدول خارجي عبر CRON_SECRET) */
export async function POST(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const secret = process.env.CRON_SECRET;
    const provided =
      req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    // نداء آلي (Vercel Cron) مسموح لو السر مطابق
    const isCron = Boolean(secret && provided && provided === secret);

    if (!isCron && (await isAuthEnabled())) {
      await requireSession("owner", "manager");
    }

    const result = await runBackup({ kind: isCron ? "auto" : "manual", source: isCron ? "cron" : "manual" });
    return NextResponse.json({ ...result, ok: true, source: u.searchParams.get("source") || "" });
  });
}

/** Vercel Cron يرسل GET — ندعمه أيضاً */
export async function GET(req: Request) {
  return POST(req);
}
