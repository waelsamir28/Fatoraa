import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceControl } from "@/db/schema";
import { str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * يسأله الجهاز نفسه كل فترة: هل تم إلغاء تفعيله من لوحة التحكم؟
 *  GET ?deviceId=FAT-XXXX-XXXX ⇒ { revoked: boolean }
 * ويسجّل «آخر ظهور» حتى تعرف أي أجهزة العميل متصلة فعلاً.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const deviceId = str(u.searchParams.get("deviceId")).trim().toUpperCase();
  if (!deviceId) return NextResponse.json({ revoked: false });

  try {
    const [row] = await db.select().from(deviceControl).where(eq(deviceControl.deviceId, deviceId));
    if (row) {
      await db.update(deviceControl).set({ lastSeenAt: new Date() }).where(eq(deviceControl.id, row.id));
      return NextResponse.json({ revoked: row.revoked, note: row.note || "" });
    }
    await db.insert(deviceControl).values({ deviceId, lastSeenAt: new Date() }).onConflictDoNothing();
    return NextResponse.json({ revoked: false });
  } catch {
    return NextResponse.json({ revoked: false });
  }
}
