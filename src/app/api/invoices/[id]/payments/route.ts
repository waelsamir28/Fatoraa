import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties, payments } from "@/db/schema";
import { HttpError, handle, num, parseId, readJson, round2, str } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * سجل الدفعات على فاتورة واحدة + المتبقي
 * - كل دفعة تُسجَّل كصف مستقل في payments مربوط بالفاتورة
 * - paid في الفاتورة = مجموع الدفعات المربوطة + المدفوع الأصلي وقت الإنشاء
 */
export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");

    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(asc(payments.date), asc(payments.id));

    const extraPaid = round2(rows.reduce((s, p) => s + p.amount, 0));
    const totalPaid = round2(inv.paid + extraPaid);
    const remaining = Math.max(0, round2(inv.total - totalPaid));

    return {
      invoice: {
        id: inv.id,
        number: inv.number,
        type: inv.type,
        partyId: inv.partyId,
        partyName: inv.partyName,
        date: inv.date,
        total: inv.total,
        paid: round2(totalPaid),
        initialPaid: inv.paid,
        extraPaid,
        remaining,
      },
      payments: rows,
    };
  });
}

/** تسجيل دفعة جديدة على الفاتورة */
export function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const b = await readJson(req);
    const amount = round2(num(b.amount));
    if (amount <= 0) throw new HttpError(400, "أدخل مبلغاً صحيحاً أكبر من صفر");

    const dateRaw = str(b.date);
    const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) throw new HttpError(400, "تاريخ الدفعة غير صالح");
    const method = str(b.method) || "cash";
    const notes = str(b.notes);
    const session = await getSession();

    const result = await db.transaction(async (tx) => {
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
      if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
      if (inv.deletedAt) throw new HttpError(400, "لا يمكن تسجيل دفعة على فاتورة محذوفة");
      if (inv.isDraft) throw new HttpError(400, "هذه الفاتورة معلقة — اعتمدها أولاً");

      // المدفوع المسجّل حالياً (مدفوع الفاتورة + الدفعات المربوطة)
      const [agg] = await tx
        .select({ sum: sql<number>`coalesce(sum(${payments.amount}), 0)`.mapWith(Number) })
        .from(payments)
        .where(eq(payments.invoiceId, id));
      const already = round2(inv.paid + Number(agg?.sum ?? 0));
      const remaining = round2(inv.total - already);
      if (remaining <= 0.009) throw new HttpError(400, "الفاتورة مسدّدة بالكامل — لا يوجد مبلغ متبقٍ");
      if (amount > remaining + 0.009) {
        throw new HttpError(400, `المبلغ أكبر من المتبقي على الفاتورة (${remaining.toFixed(2)})`);
      }

      const [row] = await tx
        .insert(payments)
        .values({
          partyId: inv.partyId ?? 0,
          invoiceId: id,
          amount,
          date,
          notes: notes || `دفعة على الفاتورة رقم ${inv.number}`,
          shiftId: null,
        })
        .returning();

      // تسجيل الدفعة كحركة مخزون لا يلزم — فقط خصم رصيد العميل/المورد
      if (inv.partyId) {
        const sign = inv.type === "purchase" || inv.type === "purchase_return" ? 1 : -1;
        await tx
          .update(parties)
          .set({ balance: sql`round((${parties.balance} + ${round2(amount * sign)})::numeric, 2)::float8` })
          .where(eq(parties.id, inv.partyId));
      }
      return row;
    });

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    const rows = await db.select().from(payments).where(eq(payments.invoiceId, id));
    const extraPaid = round2(rows.reduce((s, p) => s + p.amount, 0));
    const totalPaid = round2(inv.paid + extraPaid);
    return {
      ok: true,
      payment: result,
      paid: totalPaid,
      remaining: Math.max(0, round2(inv.total - totalPaid)),
      userName: session?.name || "",
    };
  });
}
