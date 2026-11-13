import { sql } from "drizzle-orm";
import { db } from "@/db";
import { cashMoves } from "@/db/schema";
import { HttpError, handle, num, parseDate, readJson, round2, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** كل الحركات النقدية: الفواتير المدفوعة + التحصيل/السداد + المصروفات + الإيداع/السحب اليدوي */
const MOVES = sql`(
  select 'invoice' as src, i.id as id, i.date as date, i.type as kind, i.number::text as ref, i.party_name as party,
    case when i.type in ('sale', 'purchase_return') then i.paid else 0 end as cash_in,
    case when i.type in ('purchase', 'sale_return') then i.paid else 0 end as cash_out,
    i.notes as notes
  from invoices i where i.paid <> 0
  union all
  select 'payment', p.id, p.date, pa.type, p.id::text, pa.name,
    case when pa.type = 'customer' then p.amount else 0 end,
    case when pa.type = 'supplier' then p.amount else 0 end,
    p.notes
  from payments p join parties pa on pa.id = p.party_id
  union all
  select 'expense', e.id, e.date, e.category, e.id::text, '', 0, e.amount, e.notes from expenses e
  union all
  select 'manual', m.id, m.date, m.kind, m.id::text, '',
    case when m.kind = 'in' then m.amount else 0 end,
    case when m.kind = 'out' then m.amount else 0 end,
    m.notes
  from cash_moves m
) t`;

type Row = {
  src: string;
  id: number;
  date: string | Date;
  kind: string;
  ref: string;
  party: string;
  cash_in: number | string;
  cash_out: number | string;
  notes: string;
};

const rowsOf = <T,>(res: unknown) => ((res as { rows?: T[] }).rows ?? []) as T[];

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const from = parseDate(u.searchParams.get("from")) ?? new Date(new Date().setHours(0, 0, 0, 0));
    const to = parseDate(u.searchParams.get("to")) ?? new Date(from.getTime() + 86400000);

    const openRes = await db.execute(
      sql`select coalesce(sum(cash_in - cash_out), 0) as v from ${MOVES} where date < ${from.toISOString()}::timestamptz`,
    );
    const opening = round2(Number(rowsOf<{ v: number | string }>(openRes)[0]?.v ?? 0));

    const res = await db.execute(
      sql`select * from ${MOVES} where date >= ${from.toISOString()}::timestamptz and date < ${to.toISOString()}::timestamptz order by date asc, id asc`,
    );
    let balance = opening;
    let totalIn = 0;
    let totalOut = 0;
    const summary: Record<string, { in: number; out: number }> = {};
    const rows = rowsOf<Row>(res).map((r) => {
      const cashIn = Number(r.cash_in) || 0;
      const cashOut = Number(r.cash_out) || 0;
      totalIn += cashIn;
      totalOut += cashOut;
      balance = round2(balance + cashIn - cashOut);
      const key = r.src === "invoice" ? r.kind : r.src === "payment" ? `payment_${r.kind}` : r.src === "manual" ? `manual_${r.kind}` : "expense";
      summary[key] = summary[key] ?? { in: 0, out: 0 };
      summary[key].in = round2(summary[key].in + cashIn);
      summary[key].out = round2(summary[key].out + cashOut);
      return {
        src: r.src,
        id: Number(r.id),
        date: new Date(r.date).toISOString(),
        kind: r.kind,
        ref: r.ref,
        party: r.party ?? "",
        notes: r.notes ?? "",
        cashIn,
        cashOut,
        balance,
      };
    });
    return {
      opening,
      totalIn: round2(totalIn),
      totalOut: round2(totalOut),
      closing: round2(opening + totalIn - totalOut),
      summary,
      rows,
    };
  });
}

/** إيداع أو سحب يدوي من الخزينة */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const kind = b.kind === "out" ? "out" : "in";
    const amount = round2(num(b.amount));
    if (amount <= 0) throw new HttpError(400, "يجب إدخال مبلغ صحيح أكبر من صفر");
    const [row] = await db
      .insert(cashMoves)
      .values({ kind, amount, notes: str(b.notes), date: parseDate(str(b.date)) ?? new Date() })
      .returning();
    return row;
  });
}
