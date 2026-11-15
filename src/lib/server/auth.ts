import crypto from "crypto";

/**
 * كلمات السر: scrypt من Node (بدون مكتبات خارجية) + salt عشوائي لكل مستخدم.
 * الصيغة المحفوظة: scrypt$N$salt$hash
 */

const N = 16384;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: 8, p: 1 }).toString("hex");
  return `scrypt$${N}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const n = parseInt(parts[1], 10) || N;
    const salt = parts[2];
    const expected = Buffer.from(parts[3], "hex");
    const actual = crypto.scryptSync(password, salt, expected.length || KEYLEN, { N: n, r: 8, p: 1 });
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export type Role = "owner" | "manager" | "cashier";

/** الصلاحيات المتاحة لكل دور */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ["*"],
  manager: [
    "sales",
    "purchases",
    "products",
    "inventory",
    "customers",
    "suppliers",
    "treasury",
    "expenses",
    "installments",
    "shifts",
    "reports",
    "backup",
    "barcode",
    "price-checker",
  ],
  cashier: ["sales", "price-checker", "customers", "shifts"],
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "المالك",
  manager: "مدير",
  cashier: "كاشير",
};

/**
 * صلاحيات تفصيلية قابلة للتخصيص لكل مستخدم فوق صلاحيات دوره.
 * مثلاً: كاشير يُسمح له بالتعديل على الأسعار، أو مدير يُمنع من تقرير الأرباح.
 */
export const GRANULAR_PERMISSIONS: Array<{ key: string; label: string; group: string }> = [
  { key: "view_cost", label: "رؤية سعر التكلفة", group: "الأسعار" },
  { key: "edit_price", label: "تعديل أسعار البيع", group: "الأسعار" },
  { key: "invoice_discount", label: "عمل خصم على الفاتورة", group: "المبيعات" },
  { key: "delete_invoice", label: "حذف فواتير", group: "المبيعات" },
  { key: "edit_saved_invoice", label: "تعديل فاتورة محفوظة", group: "المبيعات" },
  { key: "view_profit", label: "رؤية الأرباح", group: "التقارير" },
  { key: "view_reports", label: "فتح التقارير", group: "التقارير" },
  { key: "manage_products", label: "إضافة/تعديل الأصناف", group: "المخزون" },
  { key: "delete_product", label: "حذف الأصناف", group: "المخزون" },
  { key: "manage_users", label: "إدارة المستخدمين", group: "الإدارة" },
  { key: "manage_settings", label: "تغيير الإعدادات", group: "الإدارة" },
  { key: "manage_backup", label: "النسخ الاحتياطي والاستعادة", group: "الإدارة" },
  { key: "view_audit", label: "فتح سجل المراجعة", group: "الإدارة" },
  { key: "manage_treasury", label: "الخزينة والمصروفات", group: "المالية" },
  { key: "manage_shifts", label: "فتح/تقفيل الورديات", group: "المالية" },
];

export function can(role: string, permission: string): boolean {
  const list = ROLE_PERMISSIONS[(role as Role) || "cashier"] || [];
  return list.includes("*") || list.includes(permission);
}

/** الأقسام التي تحتاج صلاحية — تُستخدم في القائمة الجانبية والحماية */
export const PERMISSION_LABELS: Record<string, string> = {
  sales: "المبيعات",
  purchases: "المشتريات",
  products: "الأصناف",
  inventory: "المخازن",
  customers: "العملاء",
  suppliers: "الموردين",
  treasury: "الخزينة",
  expenses: "المصروفات",
  installments: "الأقساط",
  shifts: "الورديات",
  reports: "التقارير",
  backup: "النسخ الاحتياطي",
  barcode: "الباركود",
  "price-checker": "استعلام الأسعار",
  settings: "الإعدادات",
  users: "المستخدمون",
  branches: "الفروع",
};

// ==================== الجلسات (JWT موقّع HMAC) ====================

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "FATORA_SESSION_SECRET_CHANGE_ME_IN_ENV";

export const SESSION_COOKIE = "fatora_session";
export const SESSION_DAYS = 7;

export interface SessionPayload {
  uid: number;
  username: string;
  name: string;
  role: Role;
  branchId: number | null;
  /** صلاحيات إضافية مخصصة للمستخدم */
  perms?: string[];
  exp: number;
}

/** هل يملك المستخدم صلاحية معيّنة (مع مراعاة الصلاحيات المخصصة)؟ */
export function hasPermission(
  session: { role: string; perms?: string[] } | null | undefined,
  permission: string
): boolean {
  if (!session) return false;
  if (session.role === "owner") return true;
  if ((session.perms || []).includes(permission)) return true;
  return can(session.role, permission);
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}

export function createToken(payload: Omit<SessionPayload, "exp">, days = SESSION_DAYS): string {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  try {
    const expected = sign(body);
    if (expected.length !== sig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
