import { asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db";
import { parties, payments, shifts } from "@/db/schema";
import { HttpError, handle, num, readJson, round2, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const status = u.searchParams.get("status");

    // الوردية الحالية المفتوحة
    const [current] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.status, "open"))
      .orderBy(desc(shifts.id))
      .limit(1);

    const items = await db
      .select()
      .from(shifts)
      .where(status ? eq(shifts.status, status) : undefined)
      .orderBy(desc(shifts.id))
      .limit(100);

    return { current: current ?? null, items };
  });
}

/** فتح أو إغلاق وردية */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const action = str(b.action) || "open";

    if (action === "open") {
      // التأكد من عدم وجود وردية مفتوحة حالياً
      const [existing] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.status, "open"))
        .limit(1);
      if (existing) {
        throw new HttpError(400, "توجد وردية مفتوحة بالفعل، يرجى إغلاقها أولاً");
      }

      const [maxRow] = await db
        .select({ n: sql<number>`coalesce(max(${shifts.shiftNumber}), 0) + 1`.mapWith(Number) })
        .from(shifts);
      const shiftNumber = maxRow?.n ?? 1;

      const [created] = await db
        .insert(shifts)
        .values({
          shiftNumber,
          cashierName: str(b.cashierName) || "كاشير 1",
          startingCash: round2(num(b.startingCash, 0)),
          notes: str(b.notes),
          status: "open",
        })
        .returning();

      return created;
    }

    if (action === "close") {
      const shiftId = num(b.shiftId, 0);
      const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
      if (!shift || shift.status !== "open") {
        throw new HttpError(404, "الوردية غير موجودة أو تم إغلاقها بالفعل");
      }

      const actualCash = round2(num(b.actualCash, 0));
      // حساب النقدية المتوقعة من حركات الوردية
      // مبيعات نقدية + إيداعات - مشتريات نقدية - مصروفات + رصيد البداية
      const expectedCash = round2(shift.startingCash); // مبدئياً
      const difference = round2(actualCash - expectedCash);

      const [updated] = await db
        .update(shifts)
        .set({
          status: "closed",
          closedAt: new Date(),
          actualCash,
          expectedCash,
          difference,
          notes: str(b.notes) || shift.notes,
        })
        .where(eq(shifts.id, shiftId))
        .returning();

      return updated;
    }

    throw new HttpError(400, "إجراء غير صالح");
  });
}
