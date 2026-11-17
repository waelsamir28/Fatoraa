export const APP_NAME = "FATORA | لإدارة المحلات التجارية";
export const APP_BRAND = "FATORA";
export const APP_TITLE = "FATORA-POS 2027";
export const APP_TAGLINE = "مناسب لجميع الأنشطة التجارية";
export const APP_VERSION = "1.6.9";
export const DEFAULT_LOGO = "/images/logo-fatora.png";
export const SUPPORT_PHONE = "01222355769";
/** اسم المسؤول — يظهر مع رقم الدعم في كل أنحاء البرنامج */
export const SUPPORT_PERSON = "م/ وائل الجمال";
export const SUPPORT_LINE = `${SUPPORT_PERSON} — ${SUPPORT_PHONE}`;
export const SUPPORT_TEL = "tel:+201222355769";
export const WHATSAPP_URL = "https://wa.me/201222355769";

export const PAYMENT_METHODS = [
  { key: "cash", label: "نقدي" },
  { key: "installments", label: "أقساط" },
  { key: "wallet", label: "محفظة إلكترونية" },
  { key: "card", label: "بطاقة بنكية" },
  { key: "transfer", label: "تحويل بنكي" },
  { key: "cheque", label: "شيك" },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

export const paymentMethodLabel = (k: string) => PAYMENT_METHODS.find((m) => m.key === k)?.label ?? k;
export const paymentTypeLabel = (t: string) => (t === "credit" ? "آجل" : "نقدي");

export const UNITS = ["قطعة", "علبة", "كيس", "عبوة", "قنية", "زجاجة", "كرتونة", "طبق", "كيلو", "لتر", "دستة"];

export const INVOICE_LABELS: Record<string, string> = {
  sale: "فاتورة مبيعات",
  purchase: "فاتورة مشتريات",
  sale_return: "مرتجع مبيعات",
  purchase_return: "مرتجع مشتريات",
};
export const isCustomerSide = (t: string) => t === "sale" || t === "sale_return";

export const EXPENSE_CATEGORIES = ["إيجار", "كهرباء", "مياه", "رواتب", "نقل ومواصلات", "صيانة", "إنترنت وتليفون", "ضرائب ورسوم", "نثريات", "أخرى"];
