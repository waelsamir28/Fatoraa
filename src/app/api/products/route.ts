import { and, asc, eq, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { handle, num, readJson, str } from "@/lib/server/http";
import { generateProductCode, parseProduct } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const q = str(u.searchParams.get("q"));
    const code = str(u.searchParams.get("code"));
    const category = str(u.searchParams.get("category"));
    const low = u.searchParams.get("low") === "1";
    const limit = Math.min(2000, Math.max(1, num(u.searchParams.get("limit"), 1000)));

    const conds: SQL[] = [];
    if (code) conds.push(eq(products.code, code));
    if (q) {
      const like = `%${q}%`;
      const c = or(ilike(products.name, like), ilike(products.code, like), ilike(products.category, like));
      if (c) conds.push(c);
    }
    if (category) conds.push(eq(products.category, category));
    if (low) conds.push(lte(products.stock, products.minStock));

    const items = await db
      .select()
      .from(products)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(products.name))
      .limit(limit);
    const cats = await db
      .selectDistinct({ c: products.category })
      .from(products)
      .orderBy(asc(products.category));
    return { items, categories: cats.map((c) => c.c).filter(Boolean) };
  });
}

/** إضافة صنف أو إدراج قائمة أصناف مجمعة (Excel Import) */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);

    // إذا كانت مصفوفة أصناف (استيراد إكسيل جماعي)
    if (Array.isArray(b.bulk)) {
      const inserted: Array<typeof products.$inferSelect> = [];
      for (const item of b.bulk) {
        if (!item || typeof item !== "object") continue;
        const raw = item as Record<string, unknown>;
        try {
          const parsed = parseProduct(raw);
          if (!parsed.code) parsed.code = await generateProductCode();
          const [row] = await db
            .insert(products)
            .values(parsed)
            .onConflictDoUpdate({
              target: products.code,
              set: {
                name: parsed.name,
                category: parsed.category,
                unit: parsed.unit,
                costPrice: parsed.costPrice,
                salePrice: parsed.salePrice,
                wholesalePrice: parsed.wholesalePrice,
                stock: parsed.stock,
                minStock: parsed.minStock,
              },
            })
            .returning();
          if (row) inserted.push(row);
        } catch (e) {
          console.warn("skip item during excel import:", e);
        }
      }
      return { count: inserted.length, items: inserted };
    }

    const data = parseProduct(b);
    if (!data.code) data.code = await generateProductCode();
    const [row] = await db.insert(products).values(data).returning();
    return row;
  });
}
