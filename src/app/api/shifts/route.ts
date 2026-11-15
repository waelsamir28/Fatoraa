import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { cashMoves, expenses, invoices, payments, parties, shifts } from "@/db/schema";
import { HttpError, handle, num, readJson, round2, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const n = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

/**
 * ملخص نقدية الوردية:
 * رصيد البداية + مبيعات نقدية + بيع بالتقسيط المدفوع + تحصيلات العملاء + إيداعات
 * − مشتريات نقدية − مرتجعات مبيعات نقدية − سداد الموردين − مصروفات − سحوبات
 */
export async function shiftCashSummary(shift: { id: number; openedAt: Date | null; startingCash: number }) {
  const from = shift.openedAt ?? new Date(0);
  const untilNow = new Date();
  const opened = gte(invoices.date, from);
  // الفواتير المحذوفة والمسودات لا تدخل في حساب الوردية
  const notDeleted = and(isNull(invoices.deletedAt), eq(invoices.isDraft, false));

  const [sales] = await db
    .select({
      cashSales: n(sql`sum(case when ${invoices.paymentType} = 'cash' then ${invoices.total} else 0 end)`),
      creditPaid: n(sql`sum(case when ${invoices.paymentType} = 'credit' then ${invoices.paid} else 0 end)`),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(invoices)
    .where(and(eq(invoices.type, "sale"), notDeleted, opened, lt(invoices.date, untilNow)));

  const [purchases] = await db
    .select({ total: n(sql`sum(${invoices.paid})`) })
    .from(invoices)
    .where(and(eq(invoices.type, "purchase"), notDeleted, opened, lt(invoices.date, untilNow)));

  const [salesReturns] = await db
    .select({ total: n(sql`sum(${invoices.paid})`) })
    .from(invoices)
    .where(and(eq(invoices.type, "sale_return"), notDeleted, opened, lt(invoices.date, untilNow)));

  const [purchaseReturns] = await db
    .select({ total: n(sql`sum(${invoices.paid})`) })
    .from(invoices)
    .where(and(eq(invoices.type, "purchase_return"), notDeleted, opened, lt(invoices.date, untilNow)));

  // التحصيلات: من العملاء يدخل الدرج، وللموردين يخرج
  const [collect] = await db
    .select({
      fromCustomers: n(sql`sum(case when ${parties.type} = 'customer' then ${payments.amount} else 0 end)`),
      toSuppliers: n(sql`sum(case when ${parties.type} = 'supplier' then ${payments.amount} else 0 end)`),
    })
    .from(payments)
    .innerJoin(parties, eq(payments.partyId, parties.id))
    .where(and(gte(payments.date, from), lt(payments.date, untilNow)));

  const [exp] = await db
    .select({ total: n(sql`sum(${expenses.amount})`) })
    .from(expenses)
    .where(and(gte(expenses.date, from), lt(expenses.date, untilNow)));

  const [moves] = await db
    .select({
      deposits: n(sql`sum(case when ${cashMoves.kind} = 'in' then ${cashMoves.amount} else 0 end)`),
      withdrawals: n(sql`sum(case when ${cashMoves.kind} = 'out' then ${cashMoves.amount} else 0 end)`),
    })
    .from(cashMoves)
    .where(and(gte(cashMoves.date, from), lt(cashMoves.date, untilNow)));

  const start = round2(shift.startingCash);
  const cashIn = round2(
    Number(sales?.cashSales ?? 0) +
      Number(sales?.creditPaid ?? 0) +
      Number(collect?.fromCustomers ?? 0) +
      Number(moves?.deposits ?? 0) +
      Number(purchaseReturns?.total ?? 0),
  );
  const cashOut = round2(
    Number(purchases?.total ?? 0) +
      Number(salesReturns?.total ?? 0) +
      Number(collect?.toSuppliers ?? 0) +
      Number(exp?.total ?? 0) +
      Number(moves?.withdrawals ?? 0),
  );
  const expected = round2(start + cashIn - cashOut);

  return {
    startingCash: start,
    cashSales: round2(Number(sales?.cashSales ?? 0)),
    creditPaid: round2(Number(sales?.creditPaid ?? 0)),
    customerPayments: round2(Number(collect?.fromCustomers ?? 0)),
    deposits: round2(Number(moves?.deposits ?? 0)),
    purchaseReturns: round2(Number(purchaseReturns?.total ?? 0)),
    purchases: round2(Number(purchases?.total ?? 0)),
    salesReturns: round2(Number(salesReturns?.total ?? 0)),
    supplierPayments: round2(Number(collect?.toSuppliers ?? 0)),
    expenses: round2(Number(exp?.total ?? 0)),
    withdrawals: round2(Number(moves?.withdrawals ?? 0)),
    cashIn,
    cashOut,
    expectedCash: expected,
    invoicesCount: Number(sales?.count ?? 0),
  };
}

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

    // ملخص حي للوردية المفتوحة قبل ما الكاشير يقفل
    const live = current ? await shiftCashSummary(current) : null;

    return { current: current ?? null, items, live };
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
      // النقدية المتوقعة تُحسب من كل حركات الوردية (مبيعات، تحصيلات، مصروفات، سحب...)
      const summary = await shiftCashSummary(shift);
      const expectedCash = summary.expectedCash;
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

      return { ...updated, summary };
    }

    throw new HttpError(400, "إجراء غير صالح");
  });
}
