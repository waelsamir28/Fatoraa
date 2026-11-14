import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, invoices, users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { requireSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** قائمة الفروع مع إحصائيات مبسطة (مبيعات / مستخدمين) */
export async function GET() {
  return handle(async () => {
    const rows = await db.select().from(branches).orderBy(asc(branches.id));

    const stats = await Promise.all(
      rows.map(async (b) => {
        const [sales] = await db
          .select({
            total: sql<number>`coalesce(sum(${invoices.total}), 0)::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(invoices)
          .where(sql`${invoices.type} = 'sale' and ${invoices.branchId} = ${b.id}`);

        const [{ count: staff }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.branchId, b.id));

        return {
          totalSales: Number(sales?.total ?? 0),
          invoiceCount: Number(sales?.count ?? 0),
          staff: Number(staff ?? 0),
        };
      }),
    );

    return { items: rows.map((b, i) => ({ ...b, ...stats[i] })) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireSession("owner", "manager");
    const b = await readJson(req);
    const name = str(b.name).trim();
    const code = str(b.code).trim() || `BR${Date.now().toString().slice(-4)}`;
    if (!name) return NextResponse.json({ error: "اسم الفرع مطلوب" }, { status: 400 });

    const [row] = await db
      .insert(branches)
      .values({ name, code, address: str(b.address), phone: str(b.phone), active: true })
      .returning();
    return NextResponse.json({ ok: true, branch: row });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    await requireSession("owner", "manager");
    const b = await readJson(req);
    const id = Number(b.id);
    if (!id) return NextResponse.json({ error: "معرّف الفرع مطلوب" }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = str(b.name);
    if (b.code !== undefined) patch.code = str(b.code);
    if (b.address !== undefined) patch.address = str(b.address);
    if (b.phone !== undefined) patch.phone = str(b.phone);
    if (b.active !== undefined) patch.active = Boolean(b.active);

    const [row] = await db.update(branches).set(patch).where(eq(branches.id, id)).returning();
    return { ok: true, branch: row };
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    await requireSession("owner");
    const u = new URL(req.url);
    const id = Number(u.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "معرّف الفرع مطلوب" }, { status: 400 });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.branchId, id));
    if (count > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف الفرع — عليه ${count} فاتورة. يمكنك إيقافه بدلاً من حذفه.` },
        { status: 400 },
      );
    }

    await db.delete(branches).where(eq(branches.id, id));
    return { ok: true };
  });
}
