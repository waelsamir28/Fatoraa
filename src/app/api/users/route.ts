import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { hashPassword, ROLE_LABELS } from "@/lib/server/auth";
import { requireSession, invalidateAuthCache } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["owner", "manager", "cashier"];

export async function GET() {
  return handle(async () => {
    await requireSession("owner");
    const items = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        branchId: users.branchId,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(asc(users.id));
    return { items: items.map((u) => ({ ...u, roleLabel: ROLE_LABELS[u.role] || u.role })) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession("owner");
    const b = await readJson(req);
    const username = str(b.username).trim().toLowerCase();
    const password = str(b.password);
    const fullName = str(b.fullName).trim();
    const role = VALID_ROLES.includes(str(b.role)) ? str(b.role) : "cashier";

    if (username.length < 3) {
      return NextResponse.json({ error: "اسم المستخدم لازم يكون 3 حروف على الأقل" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    // منع أن يخفض المالك نفسه أو يحذف آخر مالك
    if (role === "owner" && session.role !== "owner") {
      return NextResponse.json({ error: "فقط المالك ينشئ حساب مالك آخر" }, { status: 403 });
    }

    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash: hashPassword(password),
        fullName: fullName || username,
        role,
        active: true,
        branchId: b.branchId ? Number(b.branchId) : null,
      })
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        branchId: users.branchId,
      });

    invalidateAuthCache();
    return NextResponse.json({ ok: true, user: { ...user, roleLabel: ROLE_LABELS[user.role] || user.role } });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    await requireSession("owner");
    const b = await readJson(req);
    const id = Number(b.id);
    if (!id) return NextResponse.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (b.fullName !== undefined) patch.fullName = str(b.fullName);
    if (b.role !== undefined && VALID_ROLES.includes(str(b.role))) patch.role = str(b.role);
    if (b.active !== undefined) patch.active = Boolean(b.active);
    if (b.branchId !== undefined) patch.branchId = b.branchId ? Number(b.branchId) : null;
    if (b.password !== undefined && str(b.password)) {
      if (str(b.password).length < 6) {
        return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل" }, { status: 400 });
      }
      patch.passwordHash = hashPassword(str(b.password));
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "لا يوجد تغييرات" }, { status: 400 });
    }

    // لا نسمح بتعطيل/تخفيض آخر مالك
    if (patch.role !== undefined || patch.active === false) {
      const [{ count: owners }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "owner"));
      const [target] = await db.select().from(users).where(eq(users.id, id));
      const isLastOwner =
        owners <= 1 && target?.role === "owner" && (patch.role !== "owner" || patch.active === false);
      if (isLastOwner) {
        return NextResponse.json({ error: "لا يمكن تعطيل أو تغيير دور آخر حساب مالك" }, { status: 400 });
      }
    }

    const [user] = await db.update(users).set(patch).where(eq(users.id, id)).returning({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      active: users.active,
      branchId: users.branchId,
    });
    invalidateAuthCache();
    return NextResponse.json({ ok: true, user: user ? { ...user, roleLabel: ROLE_LABELS[user.role] || user.role } : null });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const session = await requireSession("owner");
    const u = new URL(req.url);
    const id = Number(u.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
    if (id === session.uid) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    if (target.role === "owner") {
      const [{ count: owners }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "owner"));
      if (owners <= 1) {
        return NextResponse.json({ error: "لا يمكن حذف آخر حساب مالك" }, { status: 400 });
      }
    }

    await db.delete(users).where(eq(users.id, id));
    invalidateAuthCache();
    return { ok: true };
  });
}
