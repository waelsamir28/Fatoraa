import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { verifyPassword, createToken, SESSION_COOKIE, SESSION_DAYS, ROLE_LABELS } from "@/lib/server/auth";
import { isAuthEnabled } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** حالة تسجيل الدخول: هل النظام يحتاج دخول؟ وهل المستخدم مسجّل؟ */
export async function GET() {
  return handle(async () => {
    const enabled = await isAuthEnabled();
    return { authEnabled: enabled };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const enabled = await isAuthEnabled();
    const b = await readJson(req);
    const username = str(b.username).trim().toLowerCase();
    const password = str(b.password);

    if (!enabled) {
      // لم يتم إنشاء مستخدمين بعد — نسمح بالدخول المباشر (وضع الإعداد الأولي)
      const res = NextResponse.json({ ok: true, authEnabled: false, setupRequired: true });
      return res;
    }

    if (!username || !password) {
      return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username}`)
      .limit(1);

    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const token = createToken({
      uid: user.id,
      username: user.username,
      name: user.fullName || user.username,
      role: user.role as "owner" | "manager" | "cashier",
      branchId: user.branchId ?? null,
    });

    const res = NextResponse.json({
      ok: true,
      authEnabled: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.fullName || user.username,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] || user.role,
        branchId: user.branchId ?? null,
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  });
}
