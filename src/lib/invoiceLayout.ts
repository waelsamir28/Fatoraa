/**
 * إعدادات محرّر قوالب الفاتورة
 * تُحفظ كنص JSON في الحقل settings.invoiceLayout
 */

export type PaperSize = "a5" | "a4" | "thermal";

export interface InvoiceLayout {
  /** مقاس الورق */
  paper: PaperSize;
  /** اسم القالب المرئي (يُعرض في المحرر) */
  templateKey: string;
  /** اسم القالب الذي كتبه المستخدم */
  templateName: string;
  /** اللون الأساسي للفاتورة */
  accent: string;
  /** حجم الخط بالنسبة المئوية 70..140 */
  scale: number;
  /** نص الترويسة الإضافي فوق البيانات */
  headerText: string;
  /** نص التذييل */
  footerText: string;
  /** إظهار الشعار */
  showLogo: boolean;
  /** إظهار بيانات العميل والفرع */
  showCustomer: boolean;
  /** إظهار عمود العبوة */
  showUnit: boolean;
  /** إظهار عمود الخصم */
  showDiscount: boolean;
  /** إظهار ملخص الإجماليات */
  showTotals: boolean;
  /** إظهار المدفوع والمتبقي */
  showPaid: boolean;
  /** إظهار الملاحظات */
  showNotes: boolean;
  /** إظهار رمز QR */
  showQr: boolean;
  /** إظهار خط التوقيع */
  showSignature: boolean;
  /** موضع الترويسة: يمين / وسط / يسار */
  headerAlign: "right" | "center" | "left";
  /** إطار حول الورقة */
  showBorder: boolean;
  /** علامة مائية نصية */
  watermark: string;
  /** نص التوقيع */
  signatureText: string;
}

export const DEFAULT_LAYOUT: InvoiceLayout = {
  paper: "a5",
  templateKey: "template-modern-a5",
  templateName: "القالب العصري",
  accent: "#1e3a6a",
  scale: 100,
  headerText: "",
  footerText: "",
  showLogo: true,
  showCustomer: true,
  showUnit: true,
  showDiscount: true,
  showTotals: true,
  showPaid: true,
  showNotes: true,
  showQr: true,
  showSignature: false,
  headerAlign: "right",
  showBorder: true,
  watermark: "",
  signatureText: "توقيع المستلم",
};

/** قوالب جاهزة يمكن البدء منها */
export const TEMPLATE_PRESETS: { key: string; label: string; hint: string; layout: Partial<InvoiceLayout> }[] = [
  {
    key: "template-modern-a5",
    label: "① عصري — إطار ملوّن",
    hint: "ترويسة ملوّنة ورقم فاتورة بارز",
    layout: { accent: "#1e3a6a", showBorder: true, headerAlign: "right", showDiscount: true },
  },
  {
    key: "template-classic-a5",
    label: "② كلاسيكي — خطوط رسمية",
    hint: "تصميم هادئ بخطوط رمادية",
    layout: { accent: "#334155", showBorder: true, headerAlign: "center", showDiscount: false },
  },
  {
    key: "template-lines-a5",
    label: "③ مسطّر — جدول بخطوط كاملة",
    hint: "كل خلية محددة بخط أسود",
    layout: { accent: "#0f2942", showBorder: true, headerAlign: "center", showDiscount: true },
  },
  {
    key: "template-minimal-a5",
    label: "④ بسيط — بدون إطارات",
    hint: "أنيق وخفيف على الحبر",
    layout: { accent: "#0f766e", showBorder: false, headerAlign: "right", showDiscount: true },
  },
  {
    key: "template-pos-thermal",
    label: "⑤ إيصال حراري 80mm",
    hint: "مناسب لطابعات الكاشير",
    layout: { paper: "thermal", accent: "#111827", showBorder: false, headerAlign: "center", showQr: true, showPaid: true },
  },
  {
    key: "template-a4-full",
    label: "⑥ A4 فاتورة كبيرة",
    hint: "ورق A4 كامل للفواتير الطويلة",
    layout: { paper: "a4", accent: "#0b3370", showBorder: true, headerAlign: "right", showDiscount: true },
  },
];

/** قراءة الإعدادات من نص JSON بحماية كاملة */
export function parseLayout(raw: string | null | undefined): InvoiceLayout {
  if (!raw) return { ...DEFAULT_LAYOUT };
  try {
    const o = JSON.parse(raw) as Partial<InvoiceLayout>;
    if (!o || typeof o !== "object") return { ...DEFAULT_LAYOUT };
    const merged: InvoiceLayout = { ...DEFAULT_LAYOUT, ...o };
    if (!["a5", "a4", "thermal"].includes(merged.paper)) merged.paper = "a5";
    if (!["right", "center", "left"].includes(merged.headerAlign)) merged.headerAlign = "right";
    merged.scale = Math.min(140, Math.max(70, Number(merged.scale) || 100));
    return merged;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function serializeLayout(l: InvoiceLayout): string {
  return JSON.stringify(l);
}

export const PAPER_LABELS: Record<PaperSize, string> = {
  a5: "A5 — نصف ورقة (14.8 × 21 سم)",
  a4: "A4 — ورقة كاملة (21 × 29.7 سم)",
  thermal: "إيصال حراري 80 مم",
};
