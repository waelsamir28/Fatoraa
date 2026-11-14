import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, installments, invoiceItems, invoices, products, shifts } from "@/db/schema";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const n = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

/**
 * لوحة المالك: مؤشرات اليوم/الأمس/الشهر + تنبيهات + أكثر مبيعات + آخر الفواتير.
 * محسوبة على الخادم في استعلامات مجمعة (سريعة على الموبايل).
 */
export function GET() {
  return handle(async () => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const yStart = new Date(dayStart.getTime() - 86400000);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const range = (from: Date, to: Date) =>
      and(eq(invoices.type, "sale"), gte(invoices.date, from), lt(invoices.date, to));

    const [today] = await db
      .select({
        sales: n(sql`sum(${invoices.total} - ${invoices.tax})`),
        invoices: sql<number>`count(*)`.mapWith(Number),
        cost: n(sql`sum(${invoices.cost})`),
        cash: n(sql`sum(${invoices.paid})`),
      })
      .from(invoices)
      .where(range(dayStart, dayEnd));

    const [yesterday] = await db
      .select({
        sales: n(sql`sum(${invoices.total} - ${invoices.tax})`),
        invoices: sql<number>`count(*)`.mapWith(Number),
      })
      .from(invoices)
      .where(range(yStart, dayStart));

    const [month] = await db
      .select({
        sales: n(sql`sum(${invoices.total} - ${invoices.tax})`),
        cost: n(sql`sum(${invoices.cost})`),
      })
      .from(invoices)
      .where(range(mStart, dayEnd));

    const [expToday] = await db
      .select({ total: n(sql`sum(${expenses.amount})`) })
      .from(expenses)
      .where(and(gte(expenses.date, dayStart), lt(expenses.date, dayEnd)));

    const [expMonth] = await db
      .select({ total: n(sql`sum(${expenses.amount})`) })
      .from(expenses)
      .where(and(gte(expenses.date, mStart), lt(expenses.date, dayEnd)));

    const [low] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .where(sql`${products.stock} <= ${products.minStock}`);

    const [due] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        amount: n(sql`sum(${installments.amount})`),
      })
      .from(installments)
      .where(and(eq(installments.status, "pending"), lt(installments.dueDate, dayEnd)));

    const topProducts = await db
      .select({
        name: invoiceItems.productName,
        qty: n(sql`sum(${invoiceItems.qty})`),
        revenue: n(sql`sum(${invoiceItems.total})`),
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(range(mStart, dayEnd))
      .groupBy(invoiceItems.productName)
      .orderBy(desc(sql`sum(${invoiceItems.qty})`))
      .limit(5);

    const [openShift] = await db
      .select({
        cashierName: shifts.cashierName,
        openedAt: shifts.openedAt,
        startingCash: shifts.startingCash,
      })
      .from(shifts)
      .where(eq(shifts.status, "open"))
      .orderBy(desc(shifts.openedAt))
      .limit(1);

    const recent = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        partyName: invoices.partyName,
        total: invoices.total,
        date: invoices.date,
        type: invoices.type,
      })
      .from(invoices)
      .where(eq(invoices.type, "sale"))
      .orderBy(desc(invoices.date))
      .limit(6);

    const t = Number(today?.sales ?? 0);
    const tc = Number(today?.cost ?? 0);
    const mS = Number(month?.sales ?? 0);
    const mC = Number(month?.cost ?? 0);

    return {
      today: {
        sales: t,
        invoices: Number(today?.invoices ?? 0),
        profit: t - tc - Number(expToday?.total ?? 0),
        cash: Number(today?.cash ?? 0),
      },
      yesterday: {
        sales: Number(yesterday?.sales ?? 0),
        invoices: Number(yesterday?.invoices ?? 0),
      },
      month: {
        sales: mS,
        profit: mS - mC - Number(expMonth?.total ?? 0),
      },
      alerts: {
        lowStock: Number(low?.count ?? 0),
        dueInstallments: Number(due?.count ?? 0),
        dueAmount: Number(due?.amount ?? 0),
      },
      topProducts: topProducts.map((p) => ({ name: p.name, qty: Number(p.qty), revenue: Number(p.revenue) })),
      openShift: openShift
        ? {
            cashierName: openShift.cashierName,
            openedAt: String(openShift.openedAt),
            startingCash: Number(openShift.startingCash),
          }
        : null,
      recent: recent.map((r) => ({ ...r, total: Number(r.total), date: String(r.date) })),
    };
  });
}
