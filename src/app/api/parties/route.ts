import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { parties } from "@/db/schema";
import { handle, num, readJson, round2, str } from "@/lib/server/http";
import { nextPartyCode, parseParty, parsePartyType } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const type = parsePartyType(u.searchParams.get("type"));
    const q = str(u.searchParams.get("q"));
    const code = num(u.searchParams.get("code"), 0);

    const conds: SQL[] = [eq(parties.type, type)];
    if (code > 0) conds.push(eq(parties.code, code));
    if (q) {
      const like = `%${q}%`;
      const c = or(ilike(parties.name, like), ilike(parties.phone, like), sql`${parties.code}::text ilike ${like}`);
      if (c) conds.push(c);
    }
    const items = await db
      .select()
      .from(parties)
      .where(and(...conds))
      .orderBy(asc(parties.code))
      .limit(1000);
    return { items, nextCode: await nextPartyCode(type) };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const type = parsePartyType(b.type);
    const data = parseParty(b);
    const balance = round2(num(b.balance));
    const code = await nextPartyCode(type);
    const [row] = await db.insert(parties).values({ ...data, type, code, balance }).returning();
    return row;
  });
}
