import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { HttpError, handle, num, parseDate, parseId, readJson, round3, str } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** سجل حركات المخزون: كل تغيير في رصيد أي صنف */
export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const productId = num(u.searchParams.get("productId"), 0);
    const from = parseDate(u.searchParams.get("from"));
    const to = parseDate(u.searchParams.get("to"));
    const q = str(u.searchParams.get("q"));
    const limit = Math.min(500, Math.max(1, num(u.searchParams.get("limit"), 200)));

    const conds: SQL[] = [];
    if (productId > 0) conds.push(eq(stockMovements.productId, productId));
    if (from) conds.push(gte(stockMovements.createdAt, from));
    if (to) conds.push(lt(stockMovements.createdAt, to));
    if (q) {
      const c = or(ilike(stockMovements.productName, `%${q}%`), ilike(stockMovements.refLabel, `%${q}%`));
      if (c) conds.push(c);
    }
    const where = conds.length ? and(...conds) : undefined;

    const items = await db
      .select()
      .from(stockMovements)
      .where(where)
      .orderBy(desc(stockMovements.id))
      .limit(limit);

    const [totals] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        inQty: sql<number>`coalesce(sum(case when ${stockMovements.qty} > 0 then ${stockMovements.qty} else 0 end), 0)`.mapWith(Number),
        outQty: sql<number>`coalesce(sum(case when ${stockMovements.qty} < 0 then -${stockMovements.qty} else 0 end), 0)`.mapWith(Number),
      })
      .from(stockMovements)
      .where(where);

    return { items, totals };
  });
}

/**
 * تعديل رصيد صنف يدوياً (جرد / تسوية).
 * هذا هو المسار الوحيد المسموح لتغيير المخزون خارج الفواتير، ومقابل كل تعديل
 * يُسجَّل صف في stock_movements بسبب واسم المستخدم.
 */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const productId = parseId(str(b.productId) || String(num(b.productId, 0)));
    const newStock = round3(num(b.stock, 0));
    const reason = str(b.reason).trim() || "تعديل يدوي";
    if (!Number.isFinite(newStock) || newStock < 0) {
      throw new HttpError(400, "رصيد المخزون لا يمكن أن يكون سالباً");
    }

    const session = await getSession();
    const actor = session?.name || session?.username || str(b.userName) || "";

    const result = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(products).where(eq(products.id, productId)).for("update");
      if (!before) throw new HttpError(404, "الصنف غير موجود");
      const delta = round3(newStock - before.stock);
      if (delta === 0) return { product: before, delta: 0, movement: null };

      const [updated] = await tx
        .update(products)
        .set({ stock: newStock })
        .where(eq(products.id, productId))
        .returning();

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId,
          productName: before.name,
          kind: "adjust",
          qty: delta,
          balanceAfter: newStock,
          refLabel: `جرد / تسوية (${before.stock} → ${newStock})`,
          notes: reason,
          userName: actor,
        })
        .returning();

      return { product: updated, delta, movement };
    });

    return result;
  });
}
