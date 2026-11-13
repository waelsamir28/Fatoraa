import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { handle, parseDate, readJson, str } from "@/lib/server/http";
import { parseExpense } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const from = parseDate(u.searchParams.get("from"));
    const to = parseDate(u.searchParams.get("to"));
    const q = str(u.searchParams.get("q"));
    const category = str(u.searchParams.get("category"));
    const conds: SQL[] = [];
    if (from) conds.push(gte(expenses.date, from));
    if (to) conds.push(lt(expenses.date, to));
    if (category) conds.push(eq(expenses.category, category));
    if (q) {
      const c = or(ilike(expenses.notes, `%${q}%`), ilike(expenses.category, `%${q}%`));
      if (c) conds.push(c);
    }
    const where = conds.length ? and(...conds) : undefined;
    const items = await db.select().from(expenses).where(where).orderBy(desc(expenses.date)).limit(2000);
    const byCategory = await db
      .select({
        category: expenses.category,
        count: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number),
      })
      .from(expenses)
      .where(where)
      .groupBy(expenses.category)
      .orderBy(desc(sql`sum(${expenses.amount})`));
    const total = byCategory.reduce((s, c) => s + c.total, 0);
    return { items, byCategory, total };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const [row] = await db.insert(expenses).values(parseExpense(await readJson(req))).returning();
    return row;
  });
}
