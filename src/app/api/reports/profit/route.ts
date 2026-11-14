import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoiceItems, invoices, products } from "@/db/schema";
import { handle, num, parseDate } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const n = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

/**
 * تقرير أرباح دقيق:
 * - الإيرادات من صافي المبيعات (بعد الخصم والضريبة)
 * - تكلفة المبيعات (COGS) من سعر التكلفة المسجل لحظة البيع في بنود الفاتورة
 * - مرتجعات المبيعات تُخصم بنفس المنطق
 * - صافي الربح = إجمالي الربح − المصروفات
 */
export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const now = new Date();
    const from = parseDate(u.searchParams.get("from")) ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = parseDate(u.searchParams.get("to")) ?? new Date(now.getTime() + 86400000);
    const limit = Math.min(200, Math.max(5, num(u.searchParams.get("limit"), 30)));

    // 1) إجمالي المبيعات والمرتجعات والتكلفة
    const totals = async (type: string) => {
      const [row] = await db
        .select({
          net: n(sql`sum(${invoices.total})`),
          gross: n(sql`sum(${invoices.subtotal})`),
          discount: n(sql`sum(${invoices.discount}) + sum(${invoices.extraDiscount})`),
          tax: n(sql`sum(${invoices.tax})`),
          cost: n(sql`sum(${invoices.cost})`),
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(invoices)
        .where(and(eq(invoices.type, type), gte(invoices.date, from), lt(invoices.date, to)));
      return {
        net: Number(row?.net ?? 0),
        gross: Number(row?.gross ?? 0),
        discount: Number(row?.discount ?? 0),
        tax: Number(row?.tax ?? 0),
        cost: Number(row?.cost ?? 0),
        count: Number(row?.count ?? 0),
      };
    };

    const [sales, returns, purchaseReturns] = await Promise.all([
      totals("sale"),
      totals("sale_return"),
      totals("purchase_return"),
    ]);

    const [exp] = await db
      .select({ total: n(sql`sum(${expenses.amount})`) })
      .from(expenses)
      .where(and(gte(expenses.date, from), lt(expenses.date, to)));
    const expensesTotal = Number(exp?.total ?? 0);

    // صافي الإيراد (بدون ضريبة لأنها أمانة)
    const revenue = sales.net - sales.tax - (returns.net - returns.tax);
    const cogs = sales.cost - returns.cost;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expensesTotal;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // 2) أرباح حسب الصنف
    const byProduct = await db
      .select({
        productId: invoiceItems.productId,
        name: invoiceItems.productName,
        qty: n(sql`sum(${invoiceItems.qty})`),
        revenue: n(sql`sum(${invoiceItems.total})`),
        cost: n(sql`sum(${invoiceItems.qty} * ${invoiceItems.cost})`),
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.type, "sale"), gte(invoices.date, from), lt(invoices.date, to)))
      .groupBy(invoiceItems.productId, invoiceItems.productName)
      .orderBy(desc(sql`sum(${invoiceItems.total}) - sum(${invoiceItems.qty} * ${invoiceItems.cost})`))
      .limit(limit);

    // 3) أرباح حسب اليوم
    const byDay = await db
      .select({
        day: sql<string>`to_char(${invoices.date}, 'YYYY-MM-DD')`,
        revenue: n(sql`sum(${invoices.total}) - sum(${invoices.tax})`),
        cost: n(sql`sum(${invoices.cost})`),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(invoices)
      .where(and(eq(invoices.type, "sale"), gte(invoices.date, from), lt(invoices.date, to)))
      .groupBy(sql`to_char(${invoices.date}, 'YYYY-MM-DD')`)
      .orderBy(asc(sql`to_char(${invoices.date}, 'YYYY-MM-DD')`));

    // 4) الأصناف الأقل ربحية (خسارة محتملة)
    const lowMargin = await db
      .select({
        name: invoiceItems.productName,
        qty: n(sql`sum(${invoiceItems.qty})`),
        revenue: n(sql`sum(${invoiceItems.total})`),
        cost: n(sql`sum(${invoiceItems.qty} * ${invoiceItems.cost})`),
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.type, "sale"), gte(invoices.date, from), lt(invoices.date, to)))
      .groupBy(invoiceItems.productName)
      .having(sql`sum(${invoiceItems.total}) - sum(${invoiceItems.qty} * ${invoiceItems.cost}) < 0`)
      .orderBy(asc(sql`sum(${invoiceItems.total}) - sum(${invoiceItems.qty} * ${invoiceItems.cost})`))
      .limit(20);

    // 5) قيمة المخزون بالتكلفة وبسعر البيع
    const [stock] = await db
      .select({
        costValue: n(sql`sum(${products.stock} * ${products.costPrice})`),
        saleValue: n(sql`sum(${products.stock} * ${products.salePrice})`),
        items: sql<number>`count(*)`.mapWith(Number),
      })
      .from(products);

    const fmt = <T extends { revenue: number; cost: number }>(r: T) => ({
      ...r,
      profit: Number(r.revenue) - Number(r.cost),
      margin: Number(r.revenue) > 0 ? ((Number(r.revenue) - Number(r.cost)) / Number(r.revenue)) * 100 : 0,
    });

    return {
      range: { from, to },
      summary: {
        sales,
        returns,
        purchaseReturns,
        revenue,
        cogs,
        grossProfit,
        expenses: expensesTotal,
        netProfit,
        margin,
      },
      byProduct: byProduct.map(fmt),
      byDay: byDay.map((d) => ({
        ...d,
        profit: Number(d.revenue) - Number(d.cost),
      })),
      lowMargin: lowMargin.map(fmt),
      stock: {
        costValue: Number(stock?.costValue ?? 0),
        saleValue: Number(stock?.saleValue ?? 0),
        potentialProfit: Number(stock?.saleValue ?? 0) - Number(stock?.costValue ?? 0),
        items: Number(stock?.items ?? 0),
      },
    };
  });
}
