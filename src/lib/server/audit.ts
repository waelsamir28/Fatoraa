import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getSession } from "./session";

/**
 * تسجيل عملية في سجل المراجعة.
 * لا يُعطّل أبداً العملية الأصلية لو فشل التسجيل.
 */
export async function audit(entry: {
  action: string;
  entity: string;
  entityId?: number | null;
  label?: string;
  details?: unknown;
}): Promise<void> {
  try {
    const session = await getSession();
    await db.insert(auditLog).values({
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      label: entry.label || "",
      details: entry.details === undefined ? "" : JSON.stringify(entry.details).slice(0, 4000),
      userId: session?.uid ?? null,
      userName: session?.name || "غير معروف",
      userRole: session?.role || "",
    });
  } catch {
    /* السجل مساعد — لا يعطّل العملية */
  }
}

/** أسماء العمليات بالعربي للعرض */
export const ACTION_LABELS: Record<string, string> = {
  delete_invoice: "حذف فاتورة",
  edit_invoice: "تعديل فاتورة",
  restore_invoice: "استرجاع فاتورة",
  delete_product: "حذف صنف",
  edit_product: "تعديل صنف",
  edit_price: "تغيير سعر",
  delete_party: "حذف حساب",
  delete_user: "حذف مستخدم",
  settings_change: "تغيير إعدادات",
  license_activate: "تفعيل البرنامج",
  backup_restore: "استعادة نسخة احتياطية",
  clear_data: "مسح البيانات",
  reset_demo: "إعادة بيانات تجريبية",
  add_expense: "إضافة مصروف",
  delete_expense: "حذف مصروف",
  shift_close: "تقفيل وردية",
  role_change: "تغيير صلاحيات",
};
