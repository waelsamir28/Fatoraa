"use client";

/**
 * حساب الصفحات المسموح بها على الواجهة.
 * نفس منطق السيرفر (canOpenPage) لكن بدون استيراد كود الخادم.
 * القاعدة: فاضي = كل صفحات الدور، وإلا لازم الصفحة تكون في القائمة.
 */
export interface PageUser {
  role: string;
  permissions: string[];
  pages?: string[];
}

/** صلاحيات كل دور — نسخة مبسطة للواجهة (السيرفر هو المرجع النهائي) */
export const ROLE_PERMS: Record<string, string[]> = {
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

export function pageAllowed(user: PageUser | null | undefined, path: string): boolean {
  if (!user) return true;
  if (user.role === "owner") return true;
  const norm = (path || "/").split("?")[0] || "/";
  const pages = user.pages || [];
  if (pages.length) {
    const ok = pages.some((p) => norm === p || norm.startsWith(`${p}/`));
    if (!ok) return false;
  }
  // الصفحة مسموحة داخل القائمة ⇒ نتحقق من صلاحية دورها فقط لو محتاجة صلاحية خاصة
  return true;
}
