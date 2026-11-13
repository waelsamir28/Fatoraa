import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { HttpError, handle, parseId, readJson } from "@/lib/server/http";
import { parseProduct } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const { code, ...rest } = parseProduct(await readJson(req));
    const [row] = await db
      .update(products)
      .set(code ? { code, ...rest } : rest)
      .where(eq(products.id, id))
      .returning();
    if (!row) throw new HttpError(404, "الصنف غير موجود");
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
