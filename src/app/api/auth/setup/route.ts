import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { hashPassword, createToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/server/auth";
import { invalidateAuthCache } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** إنشاء حساب المالك واسم متجر أول مرة (يعمل فقط لو مفيش أي مستخدم) */
export function POST(req: Request) {
  return handle(async () => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    if (count > 0) {
      return NextResponse.json({ error: "تم إعداد البرنامج بالفعل — سجّل الدخول بحسابك" }, { status: 409 });
    }

    const b = await readJson(req);
    const username = str(b.username).trim().toLowerCase();
    const password = str(b.password);
    const fullName = str(b.fullName).trim() || "المالك";

    if (username.length < 3) {
      return NextResponse.json({ error: "اسم المستخدم لازم يكون 3 حروف على الأقل" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash: hashPassword(password),
        fullName,
        role: "owner",
        active: true,
      })
      .returning();

    invalidateAuthCache();

    const token = createToken({
      uid: user.id,
      username: user.username,
      name: user.fullName,
      role: "owner",
      branchId: null,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, name: user.fullName, role: "owner", roleLabel: "المالك" },
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
