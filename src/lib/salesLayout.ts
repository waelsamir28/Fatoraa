"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

/**
 * تخطيط شاشة المبيعات — أي جزء يظهر وأي جزء يُخفى.
 * يُحفظ في Settings.salesLayout كـ JSON ويُقرأ مرة واحدة للجلسة.
 */
export type SalesLayout = {
  toolbar: boolean; // شريط الأدوات العلوي
  numberBox: boolean; // رقم الفاتورة + البحث
  undo: boolean; // زر تراجع
  scanOriginal: boolean; // زر مسح الأصل (المرتجعات)
  delete: boolean; // زر حذف الفاتورة
  dateTime: boolean; // التاريخ والوقت
  print: boolean; // طباعة الفاتورة
  pdf: boolean; // تصدير PDF
  currency: boolean; // العملة
  partyBox: boolean; // بيانات العميل
  actions: boolean; // أزرار العمليات (جديدة/حفظ/قائمة/إلغاء)
  itemImage: boolean; // كارت صورة الصنف
  quickAdd: boolean; // سطر الإدخال السريع
  categories: boolean; // قائمة المجموعات
  addCategory: boolean; // زر إضافة مجموعة
  grid: boolean; // جدول الأصناف
  productCards: boolean; // كروت الأصناف السريعة
  notes: boolean; // الملاحظات
  totals: boolean; // الملاحظات والحسابات
  payment: boolean; // طرق الدفع
  grandTotal: boolean; // الإجماليات الكبيرة
  hints: boolean; // شريط الاختصارات
  cameraIcon: boolean; // أيقونة الكاميرا (ماسح بالموبايل)
};

export const DEFAULT_SALES_LAYOUT: SalesLayout = {
  toolbar: true,
  numberBox: true,
  undo: true,
  scanOriginal: true,
  delete: true,
  dateTime: true,
  print: true,
  pdf: true,
  currency: true,
  partyBox: true,
  actions: true,
  itemImage: true,
  quickAdd: true,
  categories: true,
  addCategory: true,
  grid: true,
  productCards: true,
  notes: true,
  totals: true,
  payment: true,
  grandTotal: true,
  hints: true,
  cameraIcon: true,
};

export const SALES_LABELS: Array<{ key: keyof SalesLayout; label: string; group: string }> = [
  { key: "toolbar", label: "شريط الأدوات العلوي بالكامل", group: "أعلى الشاشة" },
  { key: "undo", label: "زر تراجع", group: "أعلى الشاشة" },
  { key: "numberBox", label: "رقم الفاتورة والبحث", group: "أعلى الشاشة" },
  { key: "scanOriginal", label: "زر مسح الأصل (المرتجعات)", group: "أعلى الشاشة" },
  { key: "delete", label: "زر حذف الفاتورة", group: "أعلى الشاشة" },
  { key: "dateTime", label: "التاريخ والوقت", group: "أعلى الشاشة" },
  { key: "print", label: "طباعة الفاتورة", group: "أعلى الشاشة" },
  { key: "pdf", label: "تصدير PDF", group: "أعلى الشاشة" },
  { key: "partyBox", label: "بيانات العميل", group: "وسط الشاشة" },
  { key: "itemImage", label: "كارت صورة الصنف", group: "وسط الشاشة" },
  { key: "actions", label: "أزرار العمليات (جديدة/حفظ/إلغاء)", group: "أسفل الشاشة" },
  { key: "quickAdd", label: "سطر الإدخال السريع للأصناف", group: "أسفل الشاشة" },
  { key: "categories", label: "قائمة المجموعات", group: "أسفل الشاشة" },
  { key: "addCategory", label: "زر إضافة مجموعة", group: "أسفل الشاشة" },
  { key: "grid", label: "جدول الأصناف", group: "أسفل الشاشة" },
  { key: "productCards", label: "كروت الأصناف السريعة", group: "أسفل الشاشة" },
  { key: "notes", label: "ملاحظات الفاتورة", group: "أسفل الشاشة" },
  { key: "payment", label: "طرق الدفع", group: "أسفل الشاشة" },
  { key: "grandTotal", label: "الإجماليات الكبيرة", group: "أسفل الشاشة" },
  { key: "hints", label: "شريط الاختصارات أسفل النافذة", group: "عام" },
  { key: "cameraIcon", label: "أيقونة كاميرا الموبايل", group: "عام" },
];

let cache: SalesLayout | null = null;
let pending: Promise<SalesLayout> | null = null;

export function parseSalesLayout(raw: unknown): SalesLayout {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_SALES_LAYOUT;
  try {
    const parsed = JSON.parse(raw) as Partial<SalesLayout>;
    return { ...DEFAULT_SALES_LAYOUT, ...parsed };
  } catch {
    return DEFAULT_SALES_LAYOUT;
  }
}

export function useSalesLayout() {
  const [layout, setLayout] = useState<SalesLayout>(() => cache ?? DEFAULT_SALES_LAYOUT);

  useEffect(() => {
    let alive = true;
    if (cache) return;
    if (!pending) {
      pending = api<{ salesLayout?: string }>("/api/settings")
        .then((s) => {
          cache = parseSalesLayout(s.salesLayout);
          return cache;
        })
        .catch(() => DEFAULT_SALES_LAYOUT);
    }
    void pending.then((l) => {
      if (alive) setLayout(l);
    });
    return () => {
      alive = false;
    };
  }, []);

  return layout;
}

/** إبطال الكاش — يُنادى بعد حفظ الإعدادات حتى تظهر التغييرات فوراً */
export function resetSalesLayoutCache() {
  cache = null;
  pending = null;
}
