import { and, asc, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoiceItems, invoices, parties, products } from "@/db/schema";
import { handle, num, parseDate } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const n = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const tz = Math.trunc(Math.max(-840, Math.min(840, num(u.searchParams.get("tz"), 0))));
    const now = new Date();
    const from = parseDate(u.searchParams.get("from")) ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = parseDate(u.searchParams.get("to")) ?? new Date(now.getTime() + 86400000);
    const inRange = (type: string) => and(eq(invoices.type, type), gte(invoices.date, from), lt(invoices.date, to));

    const agg = (type: string) =>
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          total: n(sql`sum(${invoices.total})`),
          subtotal: n(sql`sum(${invoices.subtotal})`),
          discount: n(sql`sum(${invoices.discount})`),
          tax: n(sql`sum(${invoices.tax})`),
          cost: n(sql`sum(${invoices.cost})`),
          paid: n(sql`sum(${invoices.paid})`),
        })
        .from(invoices)
        .where(inRange(type));

    const [[sales], [purchases], [salesReturns], [purchaseReturns], [exp]] = await Promise.all([
      agg("sale"),
      agg("purchase"),
      agg("sale_return"),
      agg("purchase_return"),
      db
        .select({ total: n(sql`sum(${expenses.amount})`) })
        .from(expenses)
        .where(and(gte(expenses.date, from), lt(expenses.date, to))),
    ]);
    const expensesTotal = exp?.total ?? 0;

    const [counts] = await db
      .select({
        products: sql<number>`(select count(*) from ${products})`.mapWith(Number),
        customers: sql<number>`(select count(*) from ${parties} where ${parties.type} = 'customer')`.mapWith(Number),
        suppliers: sql<number>`(select count(*) from ${parties} where ${parties.type} = 'supplier')`.mapWith(Number),
        lowStock: sql<number>`(select count(*) from ${products} where ${products.stock} <= ${products.minStock})`.mapWith(Number),
        receivables: sql<number>`(select coalesce(sum(${parties.balance}), 0) from ${parties} where ${parties.type} = 'customer')`.mapWith(Number),
        payables: sql<number>`(select coalesce(sum(${parties.balance}), 0) from ${parties} where ${parties.type} = 'supplier')`.mapWith(Number),
        stockCost: sql<number>`(select coalesce(sum(${products.stock} * ${products.costPrice}), 0) from ${products})`.mapWith(Number),
        stockSale: sql<number>`(select coalesce(sum(${products.stock} * ${products.salePrice}), 0) from ${products})`.mapWith(Number),
      })
      .from(sql`(select 1) as one`);

    const profit =
      sales.subtotal - sales.discount - sales.cost - (salesReturns.subtotal - salesReturns.discount - salesReturns.cost);
    const netProfit = profit - expensesTotal;

    if (u.searchParams.get("summary") === "today") {
      return { sales, purchases, salesReturns, purchaseReturns, expenses: expensesTotal, counts, profit, netProfit };
    }

    const dayExpr = sql<string>`to_char(date_trunc('day', (${invoices.date} at time zone 'UTC') + interval '${sql.raw(String(tz))} minutes'), 'YYYY-MM-DD')`;

    const daily = await db
      .select({
        day: dayExpr,
        type: invoices.type,
        total: n(sql`sum(${invoices.total})`),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(invoices)
      .where(and(gte(invoices.date, from), lt(invoices.date, to)))
      .groupBy(dayExpr, invoices.type)
      .orderBy(dayExpr);

    const topProducts = await db
      .select({
        name: invoiceItems.productName,
        qty: n(sql`sum(${invoiceItems.qty})`),
        total: n(sql`sum(${invoiceItems.total})`),
        profit: n(sql`sum(${invoiceItems.total} - ${invoiceItems.qty} * ${invoiceItems.cost})`),
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(inRange("sale"))
      .groupBy(invoiceItems.productName)
      .orderBy(desc(sql`sum(${invoiceItems.total})`))
      .limit(10);

    const methods = await db
      .select({
        method: invoices.paymentMethod,
        count: sql<number>`count(*)`.mapWith(Number),
        total: n(sql`sum(${invoices.total})`),
      })
      .from(invoices)
      .where(inRange("sale"))
      .groupBy(invoices.paymentMethod)
      .orderBy(desc(sql`sum(${invoices.total})`));

    const topCustomers = await db
      .select({
        name: invoices.partyName,
        count: sql<number>`count(*)`.mapWith(Number),
        total: n(sql`sum(${invoices.total})`),
      })
      .from(invoices)
      .where(inRange("sale"))
      .groupBy(invoices.partyName)
      .orderBy(desc(sql`sum(${invoices.total})`))
      .limit(8);

    const lowStock = await db
      .select()
      .from(products)
      .where(lte(products.stock, products.minStock))
      .orderBy(asc(products.stock))
      .limit(15);

    return { from, to, sales, purchases, salesReturns, purchaseReturns, expenses: expensesTotal, netProfit, profit, counts, daily, topProducts, methods, topCustomers, lowStock };
  });
}
