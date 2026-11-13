import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { cashMoves, expenses, invoiceItems, invoices, parties, payments, products, settings } from "@/db/schema";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { DEFAULT_SETTINGS, clearAllData, resetDemoData } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

const DATE_FIELDS = ["createdAt", "updatedAt", "date"];

function revive(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const o = { ...(r as Record<string, unknown>) };
    for (const f of DATE_FIELDS) {
      if (typeof o[f] === "string") o[f] = new Date(o[f] as string);
    }
    return o;
  });
}

function chunks<T>(arr: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** تحميل نسخة احتياطية كاملة */
export function GET() {
  return handle(async () => {
    const data = {
      settings: await db.select().from(settings),
      products: await db.select().from(products).orderBy(asc(products.id)),
      parties: await db.select().from(parties).orderBy(asc(parties.id)),
      invoices: await db.select().from(invoices).orderBy(asc(invoices.id)),
      invoiceItems: await db.select().from(invoiceItems).orderBy(asc(invoiceItems.id)),
      payments: await db.select().from(payments).orderBy(asc(payments.id)),
      expenses: await db.select().from(expenses).orderBy(asc(expenses.id)),
      cashMoves: await db.select().from(cashMoves).orderBy(asc(cashMoves.id)),
    };
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(
      JSON.stringify({ app: "برنامج FATORA", version: 1, exportedAt: new Date().toISOString(), data }, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="aljamal-backup-${stamp}.json"`,
        },
      },
    );
  });
}

/** استعادة نسخة / إعادة البيانات التجريبية / حذف كل البيانات */
export function POST(req: Request) {
  return handle(async () => {
    const action = new URL(req.url).searchParams.get("action") ?? "restore";
    if (action === "reset") {
      await resetDemoData();
      return { ok: true, message: "تمت استعادة البيانات التجريبية بنجاح" };
    }
    if (action === "clear") {
      await clearAllData();
      return { ok: true, message: "تم حذف جميع البيانات" };
    }

    const body = await readJson(req);
    const d = body.data as Record<string, unknown> | undefined;
    if (!d || typeof d !== "object" || !Array.isArray(d.products) || !Array.isArray(d.invoices)) {
      throw new HttpError(400, "ملف النسخة الاحتياطية غير صالح");
    }

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`TRUNCATE TABLE invoice_items, invoices, payments, parties, products, settings, expenses, cash_moves RESTART IDENTITY CASCADE`,
      );
      const s = revive(d.settings);
      if (s.length) await tx.insert(settings).values(s as (typeof settings.$inferInsert)[]);
      else await tx.insert(settings).values({ id: 1, ...DEFAULT_SETTINGS });
      for (const c of chunks(revive(d.products))) await tx.insert(products).values(c as (typeof products.$inferInsert)[]);
      for (const c of chunks(revive(d.parties))) await tx.insert(parties).values(c as (typeof parties.$inferInsert)[]);
      for (const c of chunks(revive(d.invoices))) await tx.insert(invoices).values(c as (typeof invoices.$inferInsert)[]);
      for (const c of chunks(revive(d.invoiceItems))) await tx.insert(invoiceItems).values(c as (typeof invoiceItems.$inferInsert)[]);
      for (const c of chunks(revive(d.payments))) await tx.insert(payments).values(c as (typeof payments.$inferInsert)[]);
      for (const c of chunks(revive(d.expenses))) await tx.insert(expenses).values(c as (typeof expenses.$inferInsert)[]);
      for (const c of chunks(revive(d.cashMoves))) await tx.insert(cashMoves).values(c as (typeof cashMoves.$inferInsert)[]);
      for (const t of ["products", "parties", "invoices", "invoice_items", "payments", "expenses", "cash_moves"]) {
        await tx.execute(
          sql.raw(
            `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 0) + 1, false)`,
          ),
        );
      }
    });
    return { ok: true, message: "تمت استعادة النسخة الاحتياطية بنجاح" };
  });
}
