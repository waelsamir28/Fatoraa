import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices, products } from "@/db/schema";
import { HttpError, handle, num, round3 } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const IN_TYPES = ["purchase", "sale_return"];

/** كارت الصنف: كل حركات الصنف (وارد / منصرف) مع الرصيد بعد كل حركة */
export function GET(req: Request) {
  return handle(async () => {
    const productId = num(new URL(req.url).searchParams.get("productId"), 0);
    if (productId <= 0) throw new HttpError(400, "اختر الصنف");
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) throw new HttpError(404, "الصنف غير موجود");

    const moves = await db
      .select({
        invoiceId: invoices.id,
        type: invoices.type,
        number: invoices.number,
        date: invoices.date,
        party: invoices.partyName,
        qty: invoiceItems.qty,
        price: invoiceItems.price,
        total: invoiceItems.total,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(eq(invoiceItems.productId, productId))
      .orderBy(asc(invoices.date), asc(invoices.id));

    const net = moves.reduce((s, m) => s + (IN_TYPES.includes(m.type) ? m.qty : -m.qty), 0);
    const opening = round3(product.stock - net);
    let balance = opening;
    let totalIn = 0;
    let totalOut = 0;
    const rows = moves.map((m) => {
      const isIn = IN_TYPES.includes(m.type);
      if (isIn) totalIn += m.qty;
      else totalOut += m.qty;
      balance = round3(balance + (isIn ? m.qty : -m.qty));
      return { ...m, qtyIn: isIn ? m.qty : 0, qtyOut: isIn ? 0 : m.qty, balance };
    });
    return { product, opening, totalIn: round3(totalIn), totalOut: round3(totalOut), rows };
  });
}
