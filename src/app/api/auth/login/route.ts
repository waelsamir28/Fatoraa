import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { verifyPassword, createToken, SESSION_COOKIE, SESSION_DAYS, ROLE_LABELS } from "@/lib/server/auth";
import { getAuthState } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** حالة تسجيل الدخول: هل النظام يحتاج دخول؟ وهل المستخدم مسجّل؟ */
export async function GET() {
  return handle(async () => {
    const state = await getAuthState();
    return { authEnabled: state.enabled, dbError: state.dbError, message: state.message ?? null };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const state = await getAuthState();
    // تعذّر قراءة قاعدة البيانات: رسالة واضحة بدل «دخول مباشر» كاذب
    if (state.dbError) {
      return NextResponse.json(
        { error: `تعذّر الاتصال بقاعدة البيانات: ${state.message}` },
        { status: 503 },
      );
    }
    const enabled = state.enabled;
    const b = await readJson(req);
    const username = str(b.username).trim().toLowerCase();
    const password = str(b.password);

    if (!enabled) {
      // لم يتم إنشاء مستخدمين بعد — نسمح بالدخول المباشر (وضع الإعداد الأولي)
      const res = NextResponse.json({ ok: true, authEnabled: false, setupRequired: true });
      return res;
    }

    // ===== الدخول السريع بـ PIN (بدون اسم مستخدم) =====
    const pin = str(b.pin).replace(/\s/g, "");
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: "الـ PIN يجب أن يكون من 4 إلى 6 أرقام" }, { status: 400 });
      }
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.active, true));
      const match = allUsers.find((u) => u.pinHash && verifyPassword(pin, u.pinHash));
      if (!match) {
        return NextResponse.json({ error: "رمز الدخول غير صحيح" }, { status: 401 });
      }
      return issueSession(match);
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

    return issueSession(user);
  });
}

/** إنشاء الجلسة وإرجاع بيانات المستخدم */
async function issueSession(user: {
  id: number;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
  permissions: string;
  allowedPages?: string;
}) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const perms = safePerms(user.permissions);
  // الصفحات المسموح بها لهذا الحساب (فاضي = كل صفحات دوره)
  const pages = (() => {
    try {
      const arr = JSON.parse(user.allowedPages || "[]");
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  })();
  const token = createToken({
    uid: user.id,
    username: user.username,
    name: user.fullName || user.username,
    role: user.role as "owner" | "manager" | "cashier",
    branchId: user.branchId ?? null,
    perms,
    pages,
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
      permissions: perms,
      pages,
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
}

function safePerms(raw: string): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
