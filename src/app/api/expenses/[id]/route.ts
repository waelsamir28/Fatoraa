import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { HttpError, handle, parseId, readJson } from "@/lib/server/http";
import { parseExpense } from "@/lib/server/parsers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [row] = await db.update(expenses).set(parseExpense(await readJson(req))).where(eq(expenses.id, id)).returning();
    if (!row) throw new HttpError(404, "المصروف غير موجود");
    return row;
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [row] = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });
    if (!row) throw new HttpError(404, "المصروف غير موجود");
    return { ok: true };
  });
}
