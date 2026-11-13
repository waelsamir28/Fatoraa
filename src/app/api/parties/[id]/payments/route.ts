import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties, payments } from "@/db/schema";
import { INVOICE_LABELS } from "@/lib/constants";
import { HttpError, handle, num, parseDate, parseId, readJson, round2, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** كشف حساب العميل / المورد */
export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [party] = await db.select().from(parties).where(eq(parties.id, id));
    if (!party) throw new HttpError(404, "الحساب غير موجود");

    const invs = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        type: invoices.type,
        date: invoices.date,
        total: invoices.total,
        paid: invoices.paid,
      })
      .from(invoices)
      .where(eq(invoices.partyId, id))
      .orderBy(asc(invoices.date));
    const pays = await db.select().from(payments).where(eq(payments.partyId, id)).orderBy(asc(payments.date));

    const entries = [
      ...invs.map((i) => ({
        kind: "invoice" as const,
        id: i.id,
        ref: i.number,
        date: i.date,
        description: `${INVOICE_LABELS[i.type] ?? "فاتورة"} رقم ${i.number}`,
        debit: i.type.endsWith("_return") ? i.paid : i.total,
        credit: i.type.endsWith("_return") ? i.total : i.paid,
      })),
      ...pays.map((p) => ({
        kind: "payment" as const,
        id: p.id,
        ref: p.id,
        date: p.date,
        description: p.notes || (party.type === "customer" ? "تحصيل نقدي" : "سداد نقدي"),
        debit: 0,
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const net = entries.reduce((s, e) => s + e.debit - e.credit, 0);
    const opening = round2(party.balance - net);
    let running = opening;
    const rows = entries.map((e) => {
      running = round2(running + e.debit - e.credit);
      return { ...e, balance: running };
    });
    return { party, opening, rows };
  });
}

/** تسجيل دفعة (تحصيل من عميل / سداد لمورد) */
export function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const b = await readJson(req);
    const amount = round2(num(b.amount));
    if (amount <= 0) throw new HttpError(400, "يجب إدخال مبلغ صحيح أكبر من صفر");
    const date = parseDate(str(b.date)) ?? new Date();
    const row = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(parties).where(eq(parties.id, id));
      if (!p) throw new HttpError(404, "الحساب غير موجود");
      await tx.insert(payments).values({ partyId: id, amount, date, notes: str(b.notes) });
      const [updated] = await tx
        .update(parties)
        .set({ balance: sql`round((${parties.balance} - ${amount})::numeric, 2)::float8` })
        .where(eq(parties.id, id))
        .returning();
      return updated;
    });
    return row;
  });
}
