import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cashMoves } from "@/db/schema";
import { HttpError, handle, parseId } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = parseId((await params).id);
    const [row] = await db.delete(cashMoves).where(eq(cashMoves.id, id)).returning({ id: cashMoves.id });
    if (!row) throw new HttpError(404, "الحركة غير موجودة");
    return { ok: true };
  });
}
