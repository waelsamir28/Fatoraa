import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import { HttpError, handle, parseId } from "@/lib/server/http";
import { shiftCashSummary } from "../route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * تفاصيل وردية واحدة + ملخص النقدية (لطباعة تقرير Z).
 * يعمل للورديات المفتوحة والمقفلة: المقفلة تستخدم القيم المحفوظة وقت التقفيل.
 */
export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    if (!shift) throw new HttpError(404, "الوردية غير موجودة");

    const live = await shiftCashSummary(shift);

    // لو الوردية مقفلة نعرض الأرقام المحفوظة وقت التقفيل
    const isClosed = shift.status === "closed";
    return {
      shift,
      summary: live,
      closed: isClosed
        ? {
            expectedCash: shift.expectedCash ?? live.expectedCash,
            actualCash: shift.actualCash ?? 0,
            difference: shift.difference ?? 0,
          }
        : null,
    };
  });
}
