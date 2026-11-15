import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties } from "@/db/schema";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface Ctx { params: Promise<{ id: string }> }

/**
 * هل هذه أول فاتورة لهذا العميل؟ (+ رقم تليفونه) — تُستخدم لتقرير إرسال رسالة الترحيب/العرض.
 */
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = Number((await params).id);
    if (!id) return { isFirst: false, phone: "" };

    const [inv] = await db
      .select({ partyId: invoices.partyId })
      .from(invoices)
      .where(eq(invoices.id, id));
    if (!inv?.partyId) return { isFirst: false, phone: "" };

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.partyId, inv.partyId), eq(invoices.type, "sale"), eq(invoices.isDraft, false)));

    const [p] = await db.select({ phone: parties.phone }).from(parties).where(eq(parties.id, inv.partyId));
    return { isFirst: count <= 1, phone: p?.phone || "" };
  });
}
