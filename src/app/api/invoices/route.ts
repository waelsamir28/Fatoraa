import { and, desc, eq, getTableColumns, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices } from "@/db/schema";
import { handle, num, parseDate, readJson, str } from "@/lib/server/http";
import { createInvoice, parseInvoiceInput, parseType } from "@/lib/server/invoices";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const type = parseType(u.searchParams.get("type"));
    const from = parseDate(u.searchParams.get("from"));
    const to = parseDate(u.searchParams.get("to"));
    const q = str(u.searchParams.get("q"));
    const partyId = num(u.searchParams.get("partyId"), 0);
    const limit = Math.min(2000, Math.max(1, num(u.searchParams.get("limit"), 500)));

    const conds: SQL[] = [eq(invoices.type, type)];
    if (from) conds.push(gte(invoices.date, from));
    if (to) conds.push(lt(invoices.date, to));
    if (partyId > 0) conds.push(eq(invoices.partyId, partyId));
    if (q) {
      const like = `%${q}%`;
      const c = or(ilike(invoices.partyName, like), sql`${invoices.number}::text ilike ${like}`);
      if (c) conds.push(c);
    }
    const where = and(...conds);

    const items = await db
      .select({
        ...getTableColumns(invoices),
        itemsCount: sql<number>`(select count(*) from ${invoiceItems} where ${invoiceItems.invoiceId} = ${invoices.id})`.mapWith(Number),
      })
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.date), desc(invoices.number))
      .limit(limit);

    const [totals] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
        paid: sql<number>`coalesce(sum(${invoices.paid}), 0)`.mapWith(Number),
        tax: sql<number>`coalesce(sum(${invoices.tax}), 0)`.mapWith(Number),
        discount: sql<number>`coalesce(sum(${invoices.discount}), 0)`.mapWith(Number),
        profit: sql<number>`coalesce(sum(${invoices.subtotal} - ${invoices.discount} - ${invoices.cost}), 0)`.mapWith(Number),
      })
      .from(invoices)
      .where(where);

    return { items, totals };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const input = parseInvoiceInput(await readJson(req));
    return createInvoice(input);
  });
}
