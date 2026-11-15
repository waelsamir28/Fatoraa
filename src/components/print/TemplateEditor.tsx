"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ImagePlus,
  Eye,
  LayoutTemplate,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  Type,
  X,
} from "lucide-react";
import { InvoiceSheet } from "./InvoiceSheet";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import {
  DEFAULT_LAYOUT,
  PAPER_LABELS,
  TEMPLATE_PRESETS,
  parseLayout,
  serializeLayout,
  type InvoiceLayout,
  type PaperSize,
} from "@/lib/invoiceLayout";
import type { Invoice, Settings } from "@/lib/types";
import { fmtDate } from "@/lib/format";

/** فاتورة نموذجية للمعاينة داخل المحرر */
function demoInvoice(s: Settings): Invoice {
  const items = [
    { productId: 1, productName: "كارت أفراح ليزر فاخر", unit: "كارت", qty: 3, price: 420, cost: 150, discount: 0, total: 1260 },
    { productId: 2, productName: "دفتر 60 ورقة سلك", unit: "دفتر", qty: 2, price: 28, cost: 10, discount: 2, total: 54 },
    { productId: 3, productName: "طبع صورة A4 ورق جلوضي", unit: "ورقة", qty: 5, price: 15, cost: 4, discount: 0, total: 75 },
    { productId: 4, productName: "شنطة مدرسية ظهر — مقاس وسط", unit: "قطعة", qty: 1, price: 195, cost: 120, discount: 5, total: 190 },
  ];
  const subtotal = items.reduce((a, b) => a + b.total + b.discount, 0);
  const taxRate = 14;
  const afterDisc = subtotal - items.reduce((a, b) => a + b.discount, 0);
  const tax = Math.round(afterDisc * taxRate) / 100;
  const total = afterDisc + tax;
  const paid = 1200;
  return {
    id: 1001,
    type: "sale",
    number: 1024,
    partyId: 12,
    partyName: "أ. محمد عبد الرحمن",
    date: new Date().toISOString(),
    paymentType: "credit",
    paymentMethod: "cash",
    priceLevel: "retail",
    subtotal,
    discount: 0,
    extraDiscount: 0,
    taxRate,
    tax,
    total,
    paid,
    cost: 0,
    notes: "تم التسليم بمعرفة العميل — البضاعة المباعة لا تُرد إلا بعيب صناعي",
    userName: s.userName || "الكاشير",
    items: items.map((it, i) => ({ ...it, id: i + 1 })),
  };
}

/** حقل نص مضغوط للوحة التحكم */
function EditorField({
  label,
  hint,
  value,
  placeholder,
  onChange,
  max = 100,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-center justify-between gap-1">
        <span className="text-[11.5px] font-black text-[#0f2942]">{label}</span>
        {hint && <span className="truncate text-[9.5px] font-bold text-slate-400">{hint}</span>}
      </span>
      <input
        className="win-input w-full text-[12px] font-bold"
        value={value}
        placeholder={placeholder}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** مفتاح تشغيل/إيقاف صغير */
function EditorToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 hover:border-[#2fb3a6]">
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-black text-[#0f2942]">{label}</span>
        {hint && <span className="block truncate text-[9.5px] font-bold text-slate-500">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-[#2fb3a6]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function TemplateEditor({ onClose }: { onClose: () => void }) {
  const { toast } = useDesktop();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [layout, setLayout] = useState<InvoiceLayout>(DEFAULT_LAYOUT);
  const [saved, setSaved] = useState<InvoiceLayout>(DEFAULT_LAYOUT);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(0.72);
  const previewRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Settings>("/api/settings")
      .then((st) => {
        setSettings(st);
        const l = parseLayout(st.invoiceLayout);
        setLayout(l);
        setSaved(l);
      })
      .catch((e) => toast(errMsg(e), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inv = useMemo(() => (settings ? demoInvoice(settings) : null), [settings]);

  const patch = (p: Partial<InvoiceLayout>) => setLayout((prev) => ({ ...prev, ...p }));

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      const st = await api<Settings>("/api/settings", {
        method: "PUT",
        json: {
          ...settings,
          invoiceTemplate: layout.templateKey,
          invoiceLayout: serializeLayout(layout),
        },
      });
      setSettings(st);
      setSaved(layout);
      toast("تم حفظ القالب بنجاح ✓ سيُطبع كل فاتورة جديدة بهذا الشكل");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);

  const tRow = (label: string, key: keyof InvoiceLayout, hint?: string) => (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:border-[#2fb3a6]">
      <span className="flex flex-col">
        <span className="text-[13px] font-black text-[#0f2942]">{label}</span>
        {hint && <span className="text-[10.5px] font-bold text-slate-500">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-[#2fb3a6]"
        checked={Boolean(layout[key])}
        onChange={(e) => patch({ [key]: e.target.checked } as Partial<InvoiceLayout>)}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#eaf1f9]">
      {/* شريط العنوان */}
      <div className="flex shrink-0 items-center gap-3 bg-gradient-to-l from-[#164066] to-[#0f2942] px-4 py-2.5 text-white shadow-lg">
        <LayoutTemplate className="h-6 w-6 text-[#f5c518]" />
        <div className="flex flex-col">
          <span className="text-[16px] font-black">محرّر قوالب الفواتير — معاينة حية</span>
          <span className="text-[11.5px] font-bold text-blue-200">
            اختر القالب ثم عدّل الحجم والترويسة والتذييل والبيانات الظاهرة — التغيير يظهر فوراً
          </span>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <button type="button" className="btn btn-green h-10 px-4 text-[14px] font-black" onClick={() => void save()} disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "جاري الحفظ..." : "حفظ القالب"}
          </button>
          <button type="button" className="btn h-10 px-3 text-[13px] font-black" onClick={() => { setLayout(saved); toast("تم استرجاع القالب المحفوظ", "info"); }}>
            <RotateCcw className="h-4 w-4 text-blue-700" />
            تراجع
          </button>
          <button type="button" className="btn btn-red h-10 px-3 text-[13px] font-black" onClick={onClose}>
            <X className="h-4 w-4" />
            إغلاق
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[340px_1fr]">
        {/* ======= لوحة التحكم ======= */}
        <div className="min-h-0 overflow-auto border-e-2 border-[#c9d8ee] bg-[#f6f9fd] p-3">
          {!inv && <div className="py-8 text-center text-[14px] font-bold text-slate-500">جاري تحميل الإعدادات...</div>}

          {inv && (
            <div className="space-y-3">
              {/* القوالب الجاهزة */}
              <section className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white">
                <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-1.5 text-[13.5px] font-black text-white">
                  <Sparkles className="h-4 w-4 text-[#f5c518]" /> ١ — اختر قالباً جاهزاً
                </div>
                <div className="grid grid-cols-1 gap-1.5 p-2">
                  {TEMPLATE_PRESETS.map((t) => {
                    const active = layout.templateKey === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => patch({ ...t.layout, templateKey: t.key, templateName: t.label })}
                        className={`flex items-center justify-between gap-2 rounded-lg border-2 px-2.5 py-1.5 text-right transition ${
                          active ? "border-[#2fb3a6] bg-[#eefaf8]" : "border-slate-200 hover:border-[#8fb3e0]"
                        }`}
                      >
                        <span>
                          <span className="block text-[12.5px] font-black text-[#0f2942]">{t.label}</span>
                          <span className="block text-[10.5px] font-bold text-slate-500">{t.hint}</span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-[#0f8f82]" strokeWidth={3.5} />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* مقاس الورق وحجم العناصر */}
              {/* ===== ٣) نصوص الترويسة — كل كلمة قابلة للتعديل ===== */}
              <section className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white">
                <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-1.5 text-[13.5px] font-black text-white">
                  <Type className="h-4 w-4 text-[#f5c518]" /> ٣ — كلام الترويسة (الجزء العلوي)
                </div>
                <div className="space-y-1.5 p-2">
                  <EditorToggle
                    label="إظهار اسم المحل"
                    checked={layout.showStoreName}
                    onChange={(v) => patch({ showStoreName: v })}
                  />
                  {layout.showStoreName && (
                    <EditorField
                      label="اسم المحل كما يظهر في الفاتورة"
                      hint="اتركه فارغاً لاستخدام اسم المحل من الإعدادات"
                      value={layout.storeNameText}
                      placeholder={settings?.storeName || "اسم المحل"}
                      onChange={(v) => patch({ storeNameText: v })}
                    />
                  )}
                  <EditorField
                    label="الوصف تحت اسم المحل"
                    value={layout.storeDescText}
                    placeholder="مثال: تجارة الأدوات المدرسية والمكتبية"
                    onChange={(v) => patch({ storeDescText: v })}
                    max={90}
                  />
                  <EditorToggle label="إظهار سطر التليفون" checked={layout.showPhone} onChange={(v) => patch({ showPhone: v })} />
                  {layout.showPhone && (
                    <EditorField
                      label="الكلمة قبل التليفون"
                      value={layout.phoneLabel}
                      placeholder="تليفون / موبايل / للطلب"
                      onChange={(v) => patch({ phoneLabel: v })}
                      max={16}
                    />
                  )}
                  <EditorToggle label="إظهار العنوان" checked={layout.showAddress} onChange={(v) => patch({ showAddress: v })} />
                  {layout.showAddress && (
                    <EditorField
                      label="الكلمة قبل العنوان"
                      value={layout.addressLabel}
                      placeholder="العنوان / الفرع"
                      onChange={(v) => patch({ addressLabel: v })}
                      max={16}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <EditorToggle label="رقم الفاتورة" checked={layout.showInvoiceNumber} onChange={(v) => patch({ showInvoiceNumber: v })} />
                    <EditorToggle label="التاريخ" checked={layout.showInvoiceDate} onChange={(v) => patch({ showInvoiceDate: v })} />
                    <EditorToggle label="الوقت" checked={layout.showInvoiceTime} onChange={(v) => patch({ showInvoiceTime: v })} />
                  </div>
                  <EditorField
                    label="عنوان مربع الفاتورة"
                    hint="فاضي = اسم نوع الفاتورة (فاتورة مبيعات...)"
                    value={layout.invoiceTypeText}
                    placeholder="فاتورة مبيعات"
                    onChange={(v) => patch({ invoiceTypeText: v })}
                    max={30}
                  />
                  <EditorField
                    label="شريط ملوّن فوق الترويسة"
                    value={layout.headerText}
                    placeholder="مثال: عرض خاص — خصم 10% على المطبوعات"
                    onChange={(v) => patch({ headerText: v })}
                    max={80}
                  />
                </div>
              </section>

              {/* ===== ٤) اللوجو ===== */}
              <section className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white">
                <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-1.5 text-[13.5px] font-black text-white">
                  <ImagePlus className="h-4 w-4 text-[#f5c518]" /> ٤ — مكان اللوجو وحجمه
                </div>
                <div className="space-y-1.5 p-2">
                  <div>
                    <div className="mb-1 text-[12px] font-black text-[#0f2942]">مكان اللوجو</div>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        ["start", "بجانب الاسم (يمين)"],
                        ["end", "بجانب الاسم (يسار)"],
                        ["center", "في الوسط"],
                        ["above", "فوق الاسم"],
                        ["hidden", "بدون لوجو"],
                      ] as const).map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => patch({ logoPosition: k, showLogo: k !== "hidden" })}
                          className={`rounded-lg border-2 px-2 py-1.5 text-[11.5px] font-black transition ${
                            layout.logoPosition === k
                              ? "border-[#2fb3a6] bg-[#eefaf8] text-[#0f6f66]"
                              : "border-slate-200 text-[#0f2942] hover:border-[#8fb3e0]"
                          } ${k === "hidden" ? "col-span-2" : ""}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {layout.logoPosition !== "hidden" && (
                    <>
                      <div className="rounded-lg border border-slate-200 p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-black text-[#0f2942]">حجم اللوجو</span>
                          <span className="num rounded bg-[#0f2942] px-1.5 py-0.5 text-[11px] font-black text-white">{layout.logoSize} مم</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => patch({ logoSize: Math.max(6, layout.logoSize - 2) })}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="range"
                            min={6}
                            max={60}
                            step={2}
                            value={layout.logoSize}
                            onChange={(e) => patch({ logoSize: Number(e.target.value) })}
                            className="h-2 flex-1 cursor-pointer"
                            style={{ accentColor: "#2fb3a6" }}
                          />
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => patch({ logoSize: Math.min(60, layout.logoSize + 2) })}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <EditorToggle label="إطار حول اللوجو" checked={layout.logoBorder} onChange={(v) => patch({ logoBorder: v })} />
                        <label className="block rounded-lg border border-slate-200 px-2 py-1">
                          <span className="mb-0.5 block text-[11px] font-black text-[#0f2942]">خلفية اللوجو</span>
                          <input
                            type="color"
                            value={layout.logoBg || "#ffffff"}
                            onChange={(e) => patch({ logoBg: e.target.value })}
                            className="h-6 w-full cursor-pointer rounded border border-slate-300"
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 900_000) {
                              toast("الصورة كبيرة — اختر صورة أقل من 900 كيلوبايت", "error");
                              return;
                            }
                            const r = new FileReader();
                            r.onload = () => patch({ logoUrl: r.result as string });
                            r.readAsDataURL(f);
                          }}
                        />
                        <button type="button" className="btn btn-blue h-8 flex-1 px-2 text-[11.5px] font-black" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5" /> لوجو خاص بالفاتورة
                        </button>
                        {layout.logoUrl && (
                          <button type="button" className="btn btn-red h-8 px-2 text-[11.5px] font-black" onClick={() => patch({ logoUrl: "" })}>
                            حذف
                          </button>
                        )}
                      </div>
                      <div className="rounded bg-[#eef4fa] px-2 py-1 text-center text-[10.5px] font-bold text-slate-600">
                        {layout.logoUrl ? "✓ يستخدم لوجو مخصص للفاتورة" : "يستخدم شعار البرنامج من الإعدادات"}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* ===== ٥) التذييل ===== */}
              <section className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white">
                <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-1.5 text-[13.5px] font-black text-white">
                  <AlignCenter className="h-4 w-4 text-[#f5c518]" /> ٥ — كلام الفوتر (الجزء السفلي)
                </div>
                <div className="space-y-1.5 p-2">
                  <EditorToggle label="إظهار التذييل" checked={layout.showFooter} onChange={(v) => patch({ showFooter: v })} />
                  {layout.showFooter && (
                    <>
                      <EditorToggle label="سطر «شكراً لتعاملكم»" checked={layout.showThanksLine} onChange={(v) => patch({ showThanksLine: v })} />
                      {layout.showThanksLine && (
                        <EditorField
                          label="نص الشكر"
                          value={layout.thanksText}
                          placeholder="شكراً لتعاملكم معنا"
                          onChange={(v) => patch({ thanksText: v })}
                          max={60}
                        />
                      )}
                      <EditorField
                        label="السطر الأول في الفوتر"
                        hint="فاضي = نص تذييل الفاتورة من الإعدادات"
                        value={layout.footerLine1}
                        placeholder={settings?.invoiceFooter || "الاستبدال خلال 3 أيام"}
                        onChange={(v) => patch({ footerLine1: v })}
                        max={100}
                      />
                      <EditorField
                        label="السطر الثاني في الفوتر"
                        value={layout.footerLine2}
                        placeholder="مثال: فاتورة إلكترونية — لا تحتاج ختم"
                        onChange={(v) => patch({ footerLine2: v })}
                        max={100}
                      />
                      <EditorToggle
                        label="سطر البرنامج والدعم"
                        hint="نظام نقاط البيع — FATORA — 01222355769"
                        checked={layout.showSupportLine}
                        onChange={(v) => patch({ showSupportLine: v })}
                      />
                      <div>
                        <div className="mb-1 text-[12px] font-black text-[#0f2942]">محاذاة الفوتر</div>
                        <div className="grid grid-cols-3 gap-1">
                          {([
                            { k: "right", Icon: AlignRight, l: "يمين" },
                            { k: "center", Icon: AlignCenter, l: "وسط" },
                            { k: "left", Icon: AlignLeft, l: "يسار" },
                          ] as const).map(({ k, Icon, l }) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => patch({ footerAlign: k })}
                              className={`flex items-center justify-center gap-1 rounded-lg border-2 py-1.5 text-[11.5px] font-black transition ${
                                layout.footerAlign === k
                                  ? "border-[#2fb3a6] bg-[#eefaf8] text-[#0f6f66]"
                                  : "border-slate-200 text-[#0f2942] hover:border-[#8fb3e0]"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" /> {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <EditorField
                        label="ملاحظة ثابتة تحت جدول الإجماليات"
                        value={layout.totalsNoteText}
                        placeholder="مثال: البضاعة المباعة لا تُرد بعد 3 أيام"
                        onChange={(v) => patch({ totalsNoteText: v })}
                        max={90}
                      />
                    </>
                  )}
                  <EditorField
                    label="علامة مائية في الخلف"
                    value={layout.watermark}
                    placeholder="مثال: FATORA"
                    onChange={(v) => patch({ watermark: v })}
                    max={20}
                  />
                </div>
              </section>

              {/* العناصر الظاهرة */}
              <section className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white">
                <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-1.5 text-[13.5px] font-black text-white">
                  <Eye className="h-4 w-4 text-[#f5c518]" /> ٦ — أجزاء الفاتورة الظاهرة
                </div>
                <div className="grid grid-cols-1 gap-1.5 p-2">
                  {tRow("إظهار الشعار", "showLogo")}
                  {tRow("بيانات العميل والفرع", "showCustomer")}
                  {tRow("عمود العبوة", "showUnit")}
                  {tRow("عمود الخصم", "showDiscount")}
                  {tRow("جدول الإجماليات", "showTotals")}
                  {tRow("المدفوع والمتبقي", "showPaid", "يظهر تحت جدول الإجماليات")}
                  {tRow("الملاحظات", "showNotes")}
                  {tRow("رمز QR", "showQr")}
                  {tRow("إطار حول الورقة", "showBorder")}
                  {tRow("خط التوقيع", "showSignature")}
                  {layout.showSignature && (
                    <input
                      className="win-input w-full text-[12.5px] font-bold"
                      value={layout.signatureText}
                      onChange={(e) => patch({ signatureText: e.target.value })}
                      placeholder="نص التوقيع — مثال: توقيع المستلم"
                      maxLength={40}
                    />
                  )}
                </div>
              </section>

              <button type="button" className="btn btn-green h-11 w-full text-[15px] font-black shadow" onClick={() => void save()} disabled={busy}>
                <Save className="h-5 w-5" />
                {busy ? "جاري الحفظ..." : dirty ? "حفظ القالب (توجد تعديلات)" : "حفظ القالب"}
              </button>
            </div>
          )}
        </div>

        {/* ======= المعاينة الحية ======= */}
        <div className="flex min-h-0 flex-col bg-[#dce4ef]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[#c9d8ee] bg-white/80 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
              <Eye className="h-4 w-4" /> معاينة حية — {layout.paper === "a4" ? "A4" : layout.paper === "a5" ? "A5" : "حراري 80mm"}
            </span>
            {dirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">تعديلات غير محفوظة</span>}
            <div className="ms-auto flex items-center gap-1">
              <button type="button" className="btn h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(0.35, Math.round((z - 0.05) * 100) / 100))} title="تصغير المعاينة">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="num w-12 text-center text-[12px] font-black text-[#0f2942]">{Math.round(zoom * 100)}%</span>
              <button type="button" className="btn h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(1.4, Math.round((z + 0.05) * 100) / 100))} title="تكبير المعاينة">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn h-7 px-2 text-[11.5px] font-black" onClick={() => setZoom(0.72)}>
                افتراضي
              </button>
              <button type="button" className="btn btn-blue h-7 px-2 text-[11.5px] font-black" onClick={() => window.print()} title="طباعة نموذج تجريبي">
                <Printer className="h-3.5 w-3.5" /> طباعة تجريبية
              </button>
            </div>
          </div>

          <div ref={previewRef} className="min-h-0 flex-1 overflow-auto p-4">
            {inv && settings && (
              <div className="mx-auto" style={{ width: layout.paper === "thermal" ? 340 : layout.paper === "a4" ? 760 : 620 }}>
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                    width: layout.paper === "a4" ? "210mm" : layout.paper === "a5" ? "148mm" : "80mm",
                    margin: "0 auto",
                  }}
                >
                  <div className="shadow-2xl">
                    <InvoiceSheet inv={inv} s={settings} layout={layout} qr={false} />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 text-center text-[11.5px] font-bold text-slate-500">
              بيانات الفاتورة في المعاينة تجريبية — عند الطباعة تظهر بيانات الفاتورة الحقيقية
            </div>
          </div>
        </div>
      </div>

      {/* شريط الحالة */}
      <div className="flex shrink-0 items-center gap-3 bg-[#0f2942] px-3 py-1 text-[11.5px] font-bold text-blue-100">
        <span>القالب: {layout.templateName || layout.templateKey}</span>
        <span className="text-blue-400">|</span>
        <span>الحجم: {layout.scale}%</span>
        <span className="text-blue-400">|</span>
        <span>آخر معاينة: {fmtDate(new Date().toISOString())}</span>
        <span className="ms-auto">دعم فني 01222355769</span>
      </div>
    </div>
  );
}
