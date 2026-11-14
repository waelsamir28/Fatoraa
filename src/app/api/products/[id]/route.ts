import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { HttpError, handle, parseId, readJson } from "@/lib/server/http";
import { parseProduct } from "@/lib/server/parsers";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * تعديل صنف.
 * لو الرصيد اتغيّر يدوياً من الشاشة، نسجّل حركة مخزون بسببها — عشان يفضل
 * فيه تفسير لكل فرق في الجرد.
 */
export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const { code, ...rest } = parseProduct(await readJson(req));
    const session = await getSession();
    const actor = session?.name || session?.username || "";

    const row = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(products).where(eq(products.id, id)).for("update");
      if (!before) throw new HttpError(404, "الصنف غير موجود");

      const [updated] = await tx
        .update(products)
        .set(code ? { code, ...rest } : rest)
        .where(eq(products.id, id))
        .returning();

      const newStock = typeof rest.stock === "number" ? rest.stock : before.stock;
      const delta = Math.round((newStock - before.stock) * 1000) / 1000;
      if (delta !== 0) {
        await tx.insert(stockMovements).values({
          productId: id,
          productName: updated?.name ?? before.name,
          kind: "adjust",
          qty: delta,
          balanceAfter: newStock,
          refLabel: `تعديل من شاشة الأصناف (${before.stock} → ${newStock})`,
          notes: "تعديل يدوي للرصيد",
          userName: actor,
        });
      }
      return updated;
    });

    return row;
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [row] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (!row) throw new HttpError(404, "الصنف غير موجود");
    return { ok: true };
  });
}
