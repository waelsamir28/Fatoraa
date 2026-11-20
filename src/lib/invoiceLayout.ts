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
  /** لون خلفية رأس الجدول */
  tableHeaderBg?: string;
  /** لون نص رأس الجدول */
  tableHeaderText?: string;
  /** لون حدود الجدول */
  tableBorderColor?: string;
  /** تظليل الصفوف المتبادل */
  zebraRows?: boolean;
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

  // ===== نصوص الترويسة القابلة للتعديل =====
  /** إظهار اسم المحل في الترويسة */
  showStoreName: boolean;
  /** نص بديل لاسم المحل (فاضي = يستخدم اسم المحل من الإعدادات) */
  storeNameText: string;
  /** الوصف تحت اسم المحل */
  storeDescText: string;
  /** إظهار سطر الهاتف */
  showPhone: boolean;
  /** بادئة سطر الهاتف */
  phoneLabel: string;
  /** إظهار العنوان */
  showAddress: boolean;
  /** بادئة سطر العنوان */
  addressLabel: string;
  /** إظهار رقم الفاتورة في المربع */
  showInvoiceNumber: boolean;
  /** إظهار التاريخ في المربع */
  showInvoiceDate: boolean;
  /** إظهار الوقت في المربع */
  showInvoiceTime: boolean;
  /** عنوان المربع (فاضي = اسم نوع الفاتورة) */
  invoiceTypeText: string;

  // ===== اللوجو =====
  /** موضع اللوجو داخل الترويسة */
  logoPosition: "start" | "center" | "end" | "above" | "hidden";
  /** حجم اللوجو بالمليمتر */
  logoSize: number;
  /** مساحة بيضاء حول اللوجو */
  logoPadding: number;
  /** إطار حول اللوجو */
  logoBorder: boolean;
  /** خلفية اللوجو */
  logoBg: string;
  /** صورة مخصصة للفاتورة فقط (data URL) — فاضي = شعار البرنامج */
  logoUrl: string;

  // ===== التذييل =====
  /** إظهار التذييل بالكامل */
  showFooter: boolean;
  /** السطر الأول (فاضي = نص تذييل الإعدادات) */
  footerLine1: string;
  /** السطر الثاني (فاضي = اسم البرنامج + الدعم) */
  footerLine2: string;
  /** إظهار اسم البرنامج والدعم */
  showSupportLine: boolean;
  /** إظهار خط «شكراً لتعاملكم» */
  showThanksLine: boolean;
  /** نص الشكر */
  thanksText: string;
  /** موضع التذييل */
  footerAlign: "right" | "center" | "left";
  /** نص أسفل جدول الإجماليات (بدل خط التوقيع القديم) */
  totalsNoteText: string;
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

  showStoreName: true,
  storeNameText: "",
  storeDescText: "تجارة الأدوات المدرسية والمكتبية والخردوات وخدمات الطباعة والتصميم",
  showPhone: true,
  phoneLabel: "تليفون",
  showAddress: true,
  addressLabel: "العنوان",
  showInvoiceNumber: true,
  showInvoiceDate: true,
  showInvoiceTime: true,
  invoiceTypeText: "",

  logoPosition: "start",
  logoSize: 18,
  logoPadding: 0,
  logoBorder: false,
  logoBg: "",
  logoUrl: "",

  showFooter: true,
  footerLine1: "",
  footerLine2: "",
  showSupportLine: true,
  showThanksLine: true,
  thanksText: "شكراً لتعاملكم معنا",
  footerAlign: "center",
  totalsNoteText: "",
};

/** قوالب جاهزة يمكن البدء منها */
export const TEMPLATE_PRESETS: { key: string; label: string; hint: string; layout: Partial<InvoiceLayout> }[] = [
  {
    key: "template-a5-bw-1",
    label: "A5 أبيض وأسود — رسمي",
    hint: "لوجو بالمنتصف، جدول وفواصل واضحة للطباعة الليزر",
    layout: { paper: "a5", accent: "#000000", tableHeaderBg: "#000000", tableHeaderText: "#ffffff", tableBorderColor: "#000000", showBorder: true, headerAlign: "center", zebraRows: false },
  },
  {
    key: "template-a5-bw-2",
    label: "A5 أبيض وأسود — مخطط",
    hint: "لوجو بالمنتصف مع تظليل رمادي خفيف للصفوف",
    layout: { paper: "a5", accent: "#111827", tableHeaderBg: "#1f2937", tableHeaderText: "#ffffff", tableBorderColor: "#374151", showBorder: true, headerAlign: "center", zebraRows: true },
  },
  {
    key: "template-a5-royal",
    label: "A5 أزرق ملكي — لوجو بالمنتصف",
    hint: "ترويسة زرقاء أنيقة وجدول بفواصل كاملة",
    layout: { paper: "a5", accent: "#0067c0", tableHeaderBg: "#0067c0", tableHeaderText: "#ffffff", tableBorderColor: "#93c5fd", showBorder: true, headerAlign: "center", zebraRows: true },
  },
  {
    key: "template-a5-emerald",
    label: "A5 أخضر زمردي — لوجو بالمنتصف",
    hint: "إطار أخضر هادئ وجدول منسق",
    layout: { paper: "a5", accent: "#0f7b0f", tableHeaderBg: "#0f7b0f", tableHeaderText: "#ffffff", tableBorderColor: "#86efac", showBorder: true, headerAlign: "center", zebraRows: true },
  },
  {
    key: "template-a5-navy",
    label: "A5 كحلي فخم — لوجو بالمنتصف",
    hint: "ترويسة كحلية رسمية مع حدود واضحة",
    layout: { paper: "a5", accent: "#0f2942", tableHeaderBg: "#0f2942", tableHeaderText: "#ffffff", tableBorderColor: "#94a3b8", showBorder: true, headerAlign: "center", zebraRows: false },
  },
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
    if (!["right", "center", "left"].includes(merged.footerAlign)) merged.footerAlign = "center";
    if (!["start", "center", "end", "above", "hidden"].includes(merged.logoPosition)) merged.logoPosition = "start";
    merged.scale = Math.min(140, Math.max(70, Number(merged.scale) || 100));
    merged.logoSize = Math.min(60, Math.max(6, Number(merged.logoSize) || 18));
    merged.logoPadding = Math.min(10, Math.max(0, Number(merged.logoPadding) || 0));
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
