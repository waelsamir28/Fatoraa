import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/auth";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * التحقق من كلمة سر المستخدم الحالي — يُستخدم في شاشة القفل (Ctrl+L).
 * لا يُنشئ جلسة جديدة، فقط يتأكد أن كلمة السر صحيحة للمستخدم المسجّل حالياً.
 */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const password = str(b.password);
    if (!password) return { ok: false, error: "أدخل كلمة المرور" };

    const session = await getSession();
    const username = str(b.username).trim().toLowerCase() || session?.username || "";
    if (!username) return { ok: false, error: "لا توجد جلسة نشطة" };

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username}`)
      .limit(1);
    if (!user || !user.active) return { ok: false, error: "المستخدم غير موجود أو موقوف" };
    if (!verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: "كلمة المرور غير صحيحة" };
    }
    // تحديث وقت آخر تحقق (نفس المستخدم)
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return { ok: true, user: { id: user.id, fullName: user.fullName, username: user.username } };
  });
}
