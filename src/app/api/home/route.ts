import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoices, parties, products } from "@/db/schema";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const n = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

/**
 * لوحة الشاشة الرئيسية — استعلام واحد خفيف بدل تقرير اليوم الكامل.
 * يرجّع الأرقام الستة اللي بتظهر في شريط الحالة فقط.
 * مع `?fresh=1` يستعلم من جديد، وإلا يخدّم من كاش داخلي 20 ثانية لتسريع التنقل.
 */
const CACHE_MS = 20_000;
let cache: { at: number; data: Summary } | null = null;

export interface Summary {
  salesTotal: number;
  salesCount: number;
  products: number;
  customers: number;
  lowStock: number;
  receivables: number;
  todayExpenses: number;
}

export function GET(req: Request) {
  return handle(async () => {
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) {
      return { ...cache.data, cached: true };
    }

    // بداية اليوم بتوقيت الخادم
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [[sales], [counts], [exp]] = await Promise.all([
      db
        .select({ total: n(sql`sum(${invoices.total})`), count: sql<number>`count(*)`.mapWith(Number) })
        .from(invoices)
        .where(
          and(
            eq(invoices.type, "sale"),
            isNull(invoices.deletedAt),
            eq(invoices.isDraft, false),
            sql`${invoices.date} >= ${start}`,
          ),
        ),
      db
        .select({
          products: sql<number>`(select count(*) from ${products})`.mapWith(Number),
          customers: sql<number>`(select count(*) from ${parties} where ${parties.type} = 'customer')`.mapWith(Number),
          lowStock: sql<number>`(select count(*) from ${products} where ${products.stock} <= ${products.minStock} and ${products.minStock} > 0)`.mapWith(Number),
          receivables: sql<number>`(select coalesce(sum(${parties.balance}), 0) from ${parties} where ${parties.type} = 'customer')`.mapWith(Number),
        })
        .from(sql`(select 1) as one`),
      db
        .select({ total: n(sql`sum(${expenses.amount})`) })
        .from(expenses)
        .where(and(sql`${expenses.date} >= ${start}`, lt(expenses.date, new Date(start.getTime() + 86_400_000)))),
    ]);

    const data: Summary = {
      salesTotal: sales?.total ?? 0,
      salesCount: sales?.count ?? 0,
      products: counts?.products ?? 0,
      customers: counts?.customers ?? 0,
      lowStock: counts?.lowStock ?? 0,
      receivables: counts?.receivables ?? 0,
      todayExpenses: exp?.total ?? 0,
    };
    cache = { at: Date.now(), data };
    return { ...data, cached: false };
  });
}
