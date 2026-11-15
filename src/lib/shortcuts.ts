/** خريطة اختصارات لوحة المفاتيح العامة — تظهر في نافذة المساعدة (F1 من أي شاشة) */

export interface Shortcut {
  keys: string[];
  label: string;
  group: string;
}

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: ["F1"], label: "شاشة الاختصارات / المساعدة", group: "عام" },
  { keys: ["F2"], label: "الشاشة الرئيسية", group: "عام" },
  { keys: ["F6"], label: "فاتورة مبيعات جديدة", group: "التنقل" },
  { keys: ["F7"], label: "سجل فواتير المبيعات", group: "التنقل" },
  { keys: ["F8"], label: "الأصناف والمجموعات", group: "التنقل" },
  { keys: ["Shift", "F9"], label: "التقارير الشاملة", group: "التنقل" },
  { keys: ["Ctrl", "K"], label: "بحث سريع في كل شاشات البرنامج", group: "عام" },
  { keys: ["Ctrl", "L"], label: "قفل الشاشة بكلمة السر", group: "أمان" },
  { keys: ["Ctrl", "B"], label: "إظهار/إخفاء القائمة الجانبية", group: "عام" },
  { keys: ["Esc"], label: "إغلاق أي نافذة مفتوحة", group: "عام" },
];

export const EDITOR_SHORTCUTS: Shortcut[] = [
  { keys: ["F1"], label: "استعلام سعر صنف", group: "الفاتورة" },
  { keys: ["F2"], label: "فاتورة جديدة", group: "الفاتورة" },
  { keys: ["F3"], label: "بحث صنف (نافذة عائمة)", group: "الفاتورة" },
  { keys: ["F4"], label: "بحث العميل / المورد", group: "الفاتورة" },
  { keys: ["F7"], label: "معاينة الفاتورة A5", group: "الفاتورة" },
  { keys: ["F8"], label: "إضافة صنف جديد سريع", group: "الفاتورة" },
  { keys: ["F9"], label: "حفظ الفاتورة", group: "الفاتورة" },
  { keys: ["F10"], label: "طباعة الفاتورة", group: "الفاتورة" },
  { keys: ["Ctrl", "D"], label: "تعليق الفاتورة كمسودة", group: "الفاتورة" },
  { keys: ["Ctrl", "W"], label: "إرسال الفاتورة على واتساب", group: "الفاتورة" },
  { keys: ["Delete"], label: "حذف السطر المحدد", group: "الفاتورة" },
  { keys: ["Enter"], label: "إضافة الصنف المكتوب للفاتورة", group: "الفاتورة" },
  { keys: ["+", "-"], label: "زيادة / تقليل الكمية في السطر", group: "الفاتورة" },
  { keys: ["Ctrl", "S"], label: "حفظ القالب (في محرّر القوالب)", group: "محرر القوالب" },
];
