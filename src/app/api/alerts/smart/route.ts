import { NextResponse } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { installments, products } from "@/db/schema";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * تنبيهات ذكية موحدة:
 * 1) نواقص المخزون (الأصناف التي وصلت أو اقتربت من الحد الأدنى minStock بنسبة هامش قابلة للتحديد)
 * 2) مواعيد تحصيل الآجل وأقساط العملاء/الموردين المستحقة أو المتأخرة
 */
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const marginPct = Math.min(100, Math.max(0, Number(url.searchParams.get("margin") ?? 20)));
    const factor = 1 + marginPct / 100;

    let lowStockItems: Array<{ id: number; name: string; stock: number; minStock: number }> = [];
    try {
      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          stock: products.stock,
          minStock: products.minStock,
        })
        .from(products)
        .where(sql`${products.minStock} > 0 AND ${products.stock} <= ${products.minStock} * ${factor}`)
        .limit(20);
      lowStockItems = rows;
    } catch {
      lowStockItems = [];
    }

    let dueInstallmentsCount = 0;
    try {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(installments)
        .where(and(eq(installments.status, "pending"), lte(installments.dueDate, new Date())));
      dueInstallmentsCount = Number(row?.count ?? 0);
    } catch {
      dueInstallmentsCount = 0;
    }

    return NextResponse.json({
      lowStockCount: lowStockItems.length,
      lowStockItems,
      dueInstallmentsCount,
      marginPct,
    });
  });
}
