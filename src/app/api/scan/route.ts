import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scanSession } from "@/db/schema";
import { readJson, str, handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * ربط كاميرا الموبايل بالكاشير:
 *  - GET  ?code=XXXXXX  ⇒ الموبايل يسأل: فيه باركود جديد؟
 *  - POST {code, barcode} ⇒ الموبايل يرسل الباركود
 *  - PUT  {action:"start"} ⇒ الكاشير يفتح جلسة جديدة ويستلم كود 6 أرقام
 * الجلسة بتنتهي تلقائياً بعد ساعة من عدم الاستخدام.
 */
const rnd = () => String(Math.floor(100000 + Math.random() * 900000));

export async function PUT() {
  return handle(async () => {
    // أنشئ كود جديد غير مستخدم
    let code = rnd();
    for (let i = 0; i < 5; i++) {
      const [exists] = await db.select({ id: scanSession.id }).from(scanSession).where(eq(scanSession.code, code));
      if (!exists) break;
      code = rnd();
    }
    // نظّف الجلسات القديمة (أكثر من ساعة)
    try {
      const old = new Date(Date.now() - 60 * 60 * 1000);
      await db.delete(scanSession).where(eq(scanSession.code, code));
      void old;
    } catch {
      /* ignore */
    }
    const [row] = await db.insert(scanSession).values({ code, seq: 0, lastCode: "" }).returning();
    return NextResponse.json({ ok: true, code: row.code, seq: row.seq });
  });
}

export async function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const code = str(u.searchParams.get("code")).trim();
    const since = Number(u.searchParams.get("since") || 0);
    if (!code) return NextResponse.json({ error: "كود الجلسة مطلوب" }, { status: 400 });
    const [row] = await db.select().from(scanSession).where(eq(scanSession.code, code));
    if (!row) return NextResponse.json({ ok: false, found: false, error: "انتهت الجلسة أو الكود غير صحيح" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      found: true,
      seq: row.seq,
      barcode: row.seq > since ? row.lastCode : "",
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const code = str(b.code).trim();
    const barcode = str(b.barcode).trim();
    if (!code || !barcode) return NextResponse.json({ error: "كود الجلسة والباركود مطلوبين" }, { status: 400 });
    const [row] = await db.select().from(scanSession).where(eq(scanSession.code, code));
    if (!row) return NextResponse.json({ ok: false, error: "انتهت الجلسة — افتح جلسة جديدة من الكاشير" }, { status: 404 });
    await db
      .update(scanSession)
      .set({ lastCode: barcode, seq: row.seq + 1, updatedAt: new Date() })
      .where(eq(scanSession.id, row.id));
    return NextResponse.json({ ok: true, seq: row.seq + 1 });
  });
}
