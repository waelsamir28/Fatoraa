import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { deviceControl, licenseActivations } from "@/db/schema";
import { handle, num, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * التحكم عن بُعد في أجهزة العملاء من لوحة السحابة:
 *  GET  ⇒ كل الأجهزة + حالة الإلغاء + آخر ظهور + نوع الاشتراك
 *  POST {deviceId, action:"revoke"|"restore", note} ⇒ إلغاء/إعادة تفعيل جهاز
 * ملاحظة: الإلغاء يُطبَّق على الجهاز عند أول اتصال بالسحابة.
 */
export async function GET() {
  return handle(async () => {
    const rows = await db.select().from(deviceControl).orderBy(desc(deviceControl.lastSeenAt));
    const acts = await db
      .select({
        deviceId: licenseActivations.deviceId,
        plan: licenseActivations.plan,
        kind: licenseActivations.kind,
        price: licenseActivations.price,
        expiresAt: licenseActivations.expiresAt,
        createdAt: licenseActivations.createdAt,
      })
      .from(licenseActivations)
      .orderBy(desc(licenseActivations.createdAt))
      .limit(500);

    const byDevice = new Map<string, { plan: string; expiresAt: string | null; revenue: number; count: number }>();
    for (const a of acts) {
      const cur = byDevice.get(a.deviceId) || { plan: a.plan, expiresAt: null, revenue: 0, count: 0 };
      cur.revenue += Number(a.price) || 0;
      cur.count += 1;
      if (!cur.expiresAt && a.expiresAt) cur.expiresAt = new Date(a.expiresAt).toISOString();
      byDevice.set(a.deviceId, cur);
    }

    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
        revokedAt: r.revokedAt ? new Date(r.revokedAt).toISOString() : null,
        plan: byDevice.get(r.deviceId)?.plan || "",
        expiresAt: byDevice.get(r.deviceId)?.expiresAt || null,
        revenue: byDevice.get(r.deviceId)?.revenue || 0,
        activations: byDevice.get(r.deviceId)?.count || 0,
      })),
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const deviceId = str(b.deviceId).trim().toUpperCase();
    const action = str(b.action);
    const note = str(b.note).slice(0, 300);
    if (!deviceId) return NextResponse.json({ error: "كود الجهاز مطلوب" }, { status: 400 });
    if (!["revoke", "restore"].includes(action)) {
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    }

    const revoked = action === "revoke";
    const [existing] = await db.select().from(deviceControl).where(eq(deviceControl.deviceId, deviceId));
    if (existing) {
      await db
        .update(deviceControl)
        .set({ revoked, revokedAt: revoked ? new Date() : null, note: note || existing.note, lastSeenAt: new Date() })
        .where(eq(deviceControl.id, existing.id));
    } else {
      await db.insert(deviceControl).values({
        deviceId,
        revoked,
        revokedAt: revoked ? new Date() : null,
        note,
        lastSeenAt: new Date(),
      });
    }
    return NextResponse.json({ ok: true, deviceId, revoked });
  });
}

export async function PUT() {
  return handle(async () => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(deviceControl);
    const [{ count: revoked }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deviceControl)
      .where(eq(deviceControl.revoked, true));
    return NextResponse.json({ total: num(count, 0), revoked: num(revoked, 0) });
  });
}
