import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { GRANULAR_PERMISSIONS, hashPassword, ROLE_LABELS } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { requireSession, invalidateAuthCache } from "@/lib/server/session";
import { backupBeforeDestructive } from "@/lib/server/destructive-guard";

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
        permissions: users.permissions,
        allowedPages: users.allowedPages,
        hasPin: sql<boolean>`(${users.pinHash} <> '')`,
      })
      .from(users)
      .orderBy(asc(users.id));
    return {
      items: items.map((u) => ({
        ...u,
        roleLabel: ROLE_LABELS[u.role] || u.role,
        permissions: (() => {
          try {
            const v = JSON.parse(u.permissions || "[]");
            return Array.isArray(v) ? v : [];
          } catch {
            return [];
          }
        })(),
      })),
    };
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
        permissions: JSON.stringify(
          Array.isArray(b.permissions) ? b.permissions.filter((x: unknown) => typeof x === "string") : [],
        ),
        allowedPages: JSON.stringify(
          Array.isArray(b.allowedPages) ? b.allowedPages.filter((x: unknown) => typeof x === "string") : [],
        ),
      })
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        branchId: users.branchId,
        allowedPages: users.allowedPages,
        permissions: users.permissions,
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
    // رمز الدخول السريع PIN (4-6 أرقام) — أو "" لحذفه
    if (b.pin !== undefined) {
      const pin = str(b.pin).replace(/\s/g, "");
      if (pin && !/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: "الـ PIN يجب أن يكون من 4 إلى 6 أرقام" }, { status: 400 });
      }
      patch.pinHash = pin ? hashPassword(pin) : "";
    }
    // صلاحيات مخصصة (تُضاف فوق صلاحيات الدور)
    if (b.permissions !== undefined) {
      const list = Array.isArray(b.permissions)
        ? b.permissions.filter((x) => typeof x === "string" && GRANULAR_PERMISSIONS.some((g) => g.key === x))
        : [];
      patch.permissions = JSON.stringify(list);
    }
    // الصفحات المسموح بها (فاضي = كل صفحات دوره)
    if (b.allowedPages !== undefined) {
      patch.allowedPages = JSON.stringify(
        Array.isArray(b.allowedPages) ? b.allowedPages.filter((x: unknown) => typeof x === "string") : [],
      );
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
    if (b.pin !== undefined || b.permissions !== undefined || b.role !== undefined) {
      await audit({
        action: "role_change",
        entity: "user",
        entityId: id,
        label: `تعديل صلاحيات/رمز «${user?.username || id}»`,
        details: { pin: b.pin !== undefined ? "changed" : undefined, permissions: b.permissions, role: b.role },
      });
    }
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

    const guard = await backupBeforeDestructive(`حذف مستخدم «${target.username}»`);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 500 });

    await db.delete(users).where(eq(users.id, id));
    await audit({ action: "delete_user", entity: "user", entityId: id, label: `حذف مستخدم «${target.username}»` });
    invalidateAuthCache();
    return { ok: true, backup: guard.fileName || guard.where || "" };
  });
}
