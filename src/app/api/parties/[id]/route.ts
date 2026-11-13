import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties } from "@/db/schema";
import { HttpError, handle, num, parseId, readJson, round2 } from "@/lib/server/http";
import { parseParty } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const b = await readJson(req);
    const data = parseParty(b);
    const patch = b.balance === undefined || b.balance === null || b.balance === ""
      ? data
      : { ...data, balance: round2(num(b.balance)) };
    const [row] = await db.update(parties).set(patch).where(eq(parties.id, id)).returning();
    if (!row) throw new HttpError(404, "الحساب غير موجود");
    return row;
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    await db.transaction(async (tx) => {
      await tx.update(invoices).set({ partyId: null }).where(eq(invoices.partyId, id));
      const [row] = await tx.delete(parties).where(eq(parties.id, id)).returning({ id: parties.id });
      if (!row) throw new HttpError(404, "الحساب غير موجود");
    });
    return { ok: true };
  });
}
