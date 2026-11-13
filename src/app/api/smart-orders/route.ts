import { asc, desc, eq, getTableColumns, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { parties, products, purchaseOrderItems, purchaseOrders } from "@/db/schema";
import { HttpError, handle, num, readJson, round2, round3, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const mode = u.searchParams.get("mode");

    // توليد مقترح ذكي فوري بناءً على النواقص والحد الأدنى
    if (mode === "suggest") {
      const lowItems = await db
        .select()
        .from(products)
        .where(lte(products.stock, products.minStock))
        .orderBy(asc(products.stock));

      const suggestions = lowItems.map((p) => {
        // الكمية المقترحة = تعويض العجز + هامش طلب 1.5 ضعف الحد الأدنى أو 10 قطع على الأقل
        const deficit = Math.max(0, p.minStock - p.stock);
        const suggestedQty = Math.max(10, Math.ceil(deficit + p.minStock * 1.5));
        return {
          productId: p.id,
          productName: p.name,
          currentStock: p.stock,
          minStock: p.minStock,
          suggestedQty,
          orderedQty: suggestedQty,
          unitCost: p.costPrice,
          total: round2(suggestedQty * p.costPrice),
        };
      });

      const totalCost = round2(suggestions.reduce((s, it) => s + it.total, 0));
      return { suggestions, totalCost, lowCount: lowItems.length };
    }

    const items = await db
      .select({
        ...getTableColumns(purchaseOrders),
        itemsCount: sql<number>`(select count(*) from ${purchaseOrderItems} where ${purchaseOrderItems.orderId} = ${purchaseOrders.id})`.mapWith(Number),
      })
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.id))
      .limit(100);

    return { items };
  });
}

/** إنشاء طلب شراء ذكي */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const rawItems = Array.isArray(b.items) ? (b.items as unknown[]) : [];

    const items = rawItems
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          productId: num(o.productId),
          productName: str(o.productName),
          currentStock: round3(num(o.currentStock)),
          minStock: round3(num(o.minStock)),
          suggestedQty: round3(num(o.suggestedQty)),
          orderedQty: round3(num(o.orderedQty)),
          unitCost: round2(num(o.unitCost)),
          total: round2(num(o.orderedQty) * num(o.unitCost)),
        };
      })
      .filter((it) => it.productName && it.orderedQty > 0);

    if (!items.length) {
      throw new HttpError(400, "يجب تحديد أصناف في طلب الشراء");
    }

    const [maxRow] = await db
      .select({ n: sql<number>`coalesce(max(${purchaseOrders.orderNumber}), 5000) + 1`.mapWith(Number) })
      .from(purchaseOrders);
    const orderNumber = maxRow?.n ?? 5001;

    const supplierId = num(b.supplierId) || null;
    let supplierName = str(b.supplierName) || "مورد عام";
    if (supplierId) {
      const [s] = await db.select().from(parties).where(eq(parties.id, supplierId));
      if (s) supplierName = s.name;
    }

    const totalAmount = round2(items.reduce((s, it) => s + it.total, 0));

    const id = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          orderNumber,
          date: new Date(),
          supplierId,
          supplierName,
          status: "draft",
          totalAmount,
          notes: str(b.notes),
        })
        .returning();

      await tx.insert(purchaseOrderItems).values(
        items.map((it) => ({
          orderId: order.id,
          ...it,
        })),
      );

      return order.id;
    });

    const [created] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return created;
  });
}
