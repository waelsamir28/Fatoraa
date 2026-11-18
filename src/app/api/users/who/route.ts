import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle } from "@/lib/server/http";
import { ROLE_LABELS } from "@/lib/server/auth";
import { getAuthState } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * قائمة المستخدمين **قبل تسجيل الدخول** — شاشة البداية العائمة (Owner Users Gate).
 *
 * ⚠️ هذا الـendpoint عام (بدون جلسة) وعشان كده بيرجّع **أقل قدر ممكن** من البيانات:
 *   ✅ الاسم الظاهر · اسم الدخول · الدور · الصورة · الحالة · هل عنده PIN
 *   ❌ مفيش passwordHash · pinHash · صلاحيات · فرع · آخر دخول
 *
 * الصورة مصدرها إعدادات عامة (home.avatar) وليست بيانات مستخدم حساسة.
 * التحقق من كلمة المرور يحدث على الخادم في /api/auth/login فقط.
 */
export async function GET() {
  return handle(async () => {
    const state = await getAuthState();

    // قاعدة البيانات مش متاحة: الشاشة تعرض الحقول فقط بدون قائمة
    if (state.dbError) {
      return { items: [], total: 0, owners: 0, dbError: true };
    }

    // لسه مفيش مستخدمين (الإعداد الأول) — لا نعرض أسماء
    if (!state.enabled) {
      return { items: [], total: 0, owners: 0, dbError: false };
    }

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
      })
      .from(users)
      .orderBy(asc(users.id));

    let pinOwners = new Set<number>();
    try {
      // هل للمستخدم رمز PIN؟ (بدون كشف الرمز نفسه)
      const withPin = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.active, true));
      const pinRows = await db.select({ id: users.id, pinHash: users.pinHash }).from(users);
      pinOwners = new Set(pinRows.filter((r) => r.pinHash && r.pinHash.length > 0).map((r) => r.id));
      void withPin;
    } catch {
      /* لو العمود مش موجود نكمل بدون PIN */
    }

    return {
      items: rows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role] || u.role,
        active: u.active,
        hasPin: pinOwners.has(u.id),
      })),
      total: rows.length,
      owners: rows.filter((u) => u.role === "owner" && u.active).length,
      dbError: false,
    };
  });
}

/** منع أي محاولة كتابة — الـendpoint للقراءة فقط */
export function POST() {
  return NextResponse.json({ error: "غير مسموح" }, { status: 405 });
}
