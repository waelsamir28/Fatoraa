import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken, type SessionPayload, type Role } from "./auth";

/** قراءة الجلسة الحالية من الكوكيز (خادم فقط) */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    return verifyToken(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** هل تسجيل الدخول مُفعَّل؟ (يُفعّل تلقائياً لو فيه مستخدمون في قاعدة البيانات) */
let cachedEnabled: { value: boolean; at: number } | null = null;
export function invalidateAuthCache() {
  cachedEnabled = null;
}

export async function isAuthEnabled(): Promise<boolean> {
  if (process.env.AUTH_DISABLED === "1") return false;
  if (cachedEnabled && Date.now() - cachedEnabled.at < 5000) return cachedEnabled.value;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const value = (row?.count ?? 0) > 0;
    cachedEnabled = { value, at: Date.now() };
    return value;
  } catch {
    return false;
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** يضمن وجود جلسة صالحة، ويقبل أنماطاً من الصلاحيات */
export async function requireSession(...allowedRoles: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("يجب تسجيل الدخول أولاً", 401);
  if (allowedRoles.length && !allowedRoles.includes(session.role) && session.role !== "owner") {
    throw new AuthError("ليس لديك صلاحية لهذا الإجراء", 403);
  }
  return session;
}
