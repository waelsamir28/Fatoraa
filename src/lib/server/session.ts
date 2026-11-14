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

/**
 * حالة نظام الدخول.
 *
 * لا يكفي سؤال "هل يوجد مستخدمون؟" لأن تعذّر قراءة قاعدة البيانات كان
 * يُرجِع false فيظهر البرنامج وكأنه جاهز للاستخدام بدون أي حساب — وهي
 * الحالة التي تسبب صفحة فارغة / دخول مباشر بدون إنشاء حساب المالك.
 *
 * - dbError = true  => لا نستطيع الحكم، وعلى الواجهة إظهار خطأ واضح.
 * - enabled = true  => يوجد مستخدمون (يجب تسجيل الدخول).
 * - enabled = false => لا يوجد مستخدمون (يجب إنشاء حساب المالك).
 */
export interface AuthState {
  enabled: boolean;
  dbError: boolean;
  users: number;
  message?: string;
}

let cachedState: { value: AuthState; at: number } | null = null;

export function invalidateAuthCache() {
  cachedState = null;
}

export async function getAuthState(): Promise<AuthState> {
  // تعطيل صريح للمصادقة (للتجربة فقط)
  if (process.env.AUTH_DISABLED === "1") {
    return { enabled: false, dbError: false, users: 0 };
  }

  if (cachedState && Date.now() - cachedState.at < 5000) return cachedState.value;

  try {
    // لازم ننشئ الجداول أولاً، وإلا فأول تشغيل على قاعدة بيانات جديدة
    // يفشل الجَدْول (users) ويظهر خطأ اتصال كاذب بدل شاشة إنشاء حساب المالك
    const { ensureSeeded } = await import("./seed");
    await ensureSeeded();

    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const count = Number(row?.count ?? 0);
    const value: AuthState = { enabled: count > 0, dbError: false, users: count };
    cachedState = { value, at: Date.now() };
    return value;
  } catch (e) {
    // فشل الاتصال بقاعدة البيانات: لا نعتبر البرنامج "مفتوحاً" — نُبلّغ عن الخطأ
    const value: AuthState = {
      enabled: true,
      dbError: true,
      users: 0,
      message: dbErrorMessage(e),
    };
    cachedState = { value, at: Date.now() };
    return value;
  }
}

/** رسالة عربية مفهومة لأخطاء قاعدة البيانات الشائعة */
export function dbErrorMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } } | null;
  const code = err?.code ?? err?.cause?.code ?? "";
  const msg = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;

  if (code === "ECONNREFUSED" || /ECONNREFUSED/.test(msg)) {
    return "تعذّر الاتصال بقاعدة البيانات (الخادم غير متاح). تحقّق من DATABASE_URL في إعدادات Vercel.";
  }
  if (code === "ENOTFOUND" || /ENOTFOUND|getaddrinfo/.test(msg)) {
    return "عنوان قاعدة البيانات غير صحيح. تحقّق من DATABASE_URL.";
  }
  if (code === "28P01" || /password authentication failed/i.test(msg)) {
    return "كلمة مرور قاعدة البيانات غير صحيحة. حدّث DATABASE_URL.";
  }
  if (code === "3D000" || /database .* does not exist/i.test(msg)) {
    return "قاعدة البيانات المطلوبة غير موجودة على الخادم.";
  }
  if (/timeout|ETIMEDOUT/i.test(msg)) {
    return "انتهت مهلة الاتصال بقاعدة البيانات.";
  }
  return "تعذّر الوصول إلى قاعدة البيانات. تحقّق من إعدادات الاتصال.";
}

/** متوافق مع الاستخدامات القديمة */
export async function isAuthEnabled(): Promise<boolean> {
  const state = await getAuthState();
  return state.enabled;
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
