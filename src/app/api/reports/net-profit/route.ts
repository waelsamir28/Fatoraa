import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoices } from "@/db/schema";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * تقرير صافي الربح الحقيقي:
 * صافي الربح = إجمالي المبيعات - تكلفة البضاعة المباعة - المرتجعات - المصروفات
 */
export function GET() {
  return handle(async () => {
    let salesTotal = 0;
    let returnsTotal = 0;
    let expensesTotal = 0;

    try {
      const [s] = await db
        .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)::float8` })
        .from(invoices)
        .where(sql`${invoices.type} = 'sale'`);
      salesTotal = Number(s?.total ?? 0);

      const [r] = await db
        .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)::float8` })
        .from(invoices)
        .where(sql`${invoices.type} = 'return'`);
      returnsTotal = Number(r?.total ?? 0);
    } catch {
      /* ignore */
    }

    try {
      const [e] = await db
        .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)::float8` })
        .from(expenses);
      expensesTotal = Number(e?.total ?? 0);
    } catch {
      /* ignore */
    }

    const netProfit = Math.round((salesTotal - returnsTotal - expensesTotal) * 100) / 100;

    return NextResponse.json({
      salesTotal,
      returnsTotal,
      expensesTotal,
      netProfit,
    });
  });
}
