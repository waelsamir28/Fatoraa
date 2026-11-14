import { and, desc, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { handle, num, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** سجل الفواتير المحذوفة (حذف آمن) — للتدقيق والاسترجاع */
export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const q = str(u.searchParams.get("q"));
    const limit = Math.min(500, Math.max(1, num(u.searchParams.get("limit"), 200)));

    const conds = [isNotNull(invoices.deletedAt)];
    if (q) {
      const c = or(ilike(invoices.partyName, `%${q}%`), sql`${invoices.number}::text ilike ${`%${q}%`}`);
      if (c) conds.push(c);
    }
    const where = and(...conds);

    const items = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.deletedAt))
      .limit(limit);

    const [totals] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
      })
      .from(invoices)
      .where(where);

    return { items, totals };
  });
}
