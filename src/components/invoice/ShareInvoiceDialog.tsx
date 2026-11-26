"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, MessageCircle, Printer, Send, Share2, Sparkles } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate } from "@/lib/format";
import type { Invoice, Settings } from "@/lib/types";

interface QrData {
  url?: string;
  error?: string;
  needsCloudUrl?: boolean;
}

/** مشاركة الفاتورة: رابط إلكتروني + رسالة واتساب جاهزة + طباعة PDF */
export function ShareInvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { toast } = useDesktop();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [qr, setQr] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withImage, setWithImage] = useState(true);
  /** رسالة الشكر/العرض التلقائية بعد أول فاتورة للعميل */
  const [thanks, setThanks] = useState<{ enabled: boolean; text: string; whatsapp: string } | null>(null);

  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings).catch(() => undefined);
    api<{ isFirst: boolean; phone: string }>(`/api/invoices/${invoice.id}/first-visit`)
      .then((r) =>
        api<{ enabled: boolean; text: string; whatsapp: string }>("/api/thanks", {
          method: "POST",
          json: { name: invoice.partyName, phone: r.phone, total: invoice.total, isFirst: r.isFirst },
        }).then(setThanks),
      )
      .catch(() => undefined);
    api<QrData>(`/api/invoices/${invoice.id}/qr`)
      .then(setQr)
      .catch((e) => setQr({ error: errMsg(e) }))
      .finally(() => setLoading(false));
  }, [invoice.id]);

  const remaining = Math.max(0, invoice.total - invoice.paid);
  const excessDeducted = Math.max(0, Math.round((invoice.paid - invoice.total) * 100) / 100);
  const storeName = settings?.storeName || "FATORA";
  const currency = settings?.currency || "ج.م";

  /** نص الرسالة الجاهزة للعميل */
  const message = [
    `🧾 *${storeName}*`,
    `فاتورة رقم: ${invoice.number}`,
    `التاريخ: ${fmtDate(invoice.date)}`,
    `العميل: ${invoice.partyName}`,
    `عدد الأصناف: ${invoice.items?.length ?? 0}`,
    `الإجمالي: *${fmt(invoice.total)} ${currency}*`,
    `المدفوع: ${fmt(invoice.paid)} ${currency}`,
    remaining > 0
      ? `المتبقي: ${fmt(remaining)} ${currency}`
      : excessDeducted > 0
        ? `✅ مسددة + تم تنزيل ${fmt(excessDeducted)} ${currency} من الحساب`
        : "✅ مسددة بالكامل",
    "",
    qr?.url ? `رابط الفاتورة الإلكترونية:\n${qr.url}` : "",
    "",
    settings?.invoiceFooter || "",
    settings?.phone ? `للتواصل: ${settings.phone}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  /** رقم واتساب العميل: نأخذ أول رقم صالح من بياناته */
  const cleanPhone = (raw: string) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("0")) return `20${digits.slice(1)}`; // مصر
    if (digits.startsWith("20")) return digits;
    return digits;
  };

  const openWhatsApp = () => {
    const phone = cleanPhone(phoneFromInvoice(invoice));
    const text = encodeURIComponent(message);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    toast("تم فتح واتساب مع الرسالة الجاهزة — أرفق صورة الفاتورة من زر الطباعة لو أردت", "info");
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`تم نسخ ${label} ✓`);
    } catch {
      toast("تعذر النسخ — انسخ النص يدوياً", "error");
    }
  };

  return (
    <Dialog title={`مشاركة الفاتورة رقم ${invoice.number}`} onClose={onClose} width={620}>
      <div className="space-y-3">
        {/* ملخص */}
        <div className="rounded-lg border-2 border-[#c9d8ee] bg-[#f4f8fd] p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold text-[#0f2942]">
            <span>
              العميل: <b>{invoice.partyName}</b>
            </span>
            <span className="num">{fmtDate(invoice.date)}</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-white px-2 py-1">
              <div className="text-[11px] font-bold text-slate-500">الإجمالي</div>
              <div className="num text-[16px] font-black text-[#0f2942]">{fmt(invoice.total)}</div>
            </div>
            <div className="rounded bg-white px-2 py-1">
              <div className="text-[11px] font-bold text-slate-500">المدفوع</div>
              <div className="num text-[16px] font-black text-emerald-700">{fmt(invoice.paid)}</div>
            </div>
            <div className="rounded bg-white px-2 py-1">
              <div className="text-[11px] font-bold text-slate-500">المتبقي</div>
              <div className="num text-[16px] font-black text-red-600">{fmt(remaining)}</div>
            </div>
          </div>
        </div>

        {/* رابط الفاتورة الإلكترونية */}
        <div className="rounded-lg border border-[#c9d8ee] bg-white p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
            <Share2 className="h-4 w-4 text-[#2fb3a6]" /> رابط الفاتورة الإلكترونية
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-[12.5px] font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> جاري تجهيز الرابط...
            </div>
          ) : qr?.url ? (
            <div className="flex items-center gap-2">
              <input className="win-input num flex-1 text-[12px]" dir="ltr" readOnly value={qr.url} />
              <button type="button" className="btn h-8 px-2 text-[12px] font-black" onClick={() => void copy(qr.url!, "الرابط")}>
                <Copy className="h-3.5 w-3.5" /> نسخ
              </button>
              <button type="button" className="btn btn-blue h-8 px-2 text-[12px] font-black" onClick={() => window.open(qr.url, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" /> فتح
              </button>
            </div>
          ) : (
            <div className="rounded bg-amber-50 px-2.5 py-2 text-[11.5px] font-bold text-amber-900">
              {qr?.error ||
                "لا يوجد رابط سحابي مضبوط. اضبط رابط السحابة من شاشة «إعدادات الاتصال» ليستطيع العميل فتح الفاتورة من موبايله."}
              <div className="mt-1 text-[11px] text-amber-800">
                يمكنك إرسال صورة/ملف الفاتورة على واتساب بدلاً من الرابط من نفس النافذة.
              </div>
            </div>
          )}
        </div>

        {/* الرسالة الجاهزة */}
        <div className="rounded-lg border border-[#c9d8ee] bg-white p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
              <MessageCircle className="h-4 w-4 text-green-600" /> الرسالة الجاهزة
            </span>
            <button type="button" className="btn h-7 px-2 text-[11.5px] font-black" onClick={() => void copy(message, "الرسالة")}>
              <Copy className="h-3.5 w-3.5" /> نسخ الرسالة
            </button>
          </div>
          <pre className="max-h-[150px] overflow-auto whitespace-pre-wrap rounded bg-[#f7fafd] p-2 font-[inherit] text-[12px] font-bold leading-relaxed text-slate-700">
            {message}
          </pre>
        </div>

        {/* رسالة الشكر / العرض — تظهر تلقائياً بعد أول فاتورة للعميل */}
        {thanks?.enabled && (
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/70 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-black text-emerald-900">
                <Sparkles className="h-4 w-4 text-emerald-600" /> رسالة شكر وعرض ترحيبي (تلقائية)
              </span>
              <div className="flex items-center gap-1">
                <button type="button" className="btn h-7 px-2 text-[11.5px] font-black" onClick={() => void copy(thanks.text, "رسالة الشكر")}>
                  <Copy className="h-3.5 w-3.5" /> نسخ
                </button>
                <button
                  type="button"
                  className="btn btn-green h-7 px-2 text-[11.5px] font-black"
                  onClick={() => {
                    const phone = cleanPhone(phoneFromInvoice(invoice));
                    window.open(
                      phone
                        ? `https://wa.me/${phone}?text=${encodeURIComponent(thanks.text)}`
                        : `https://wa.me/?text=${encodeURIComponent(thanks.text)}`,
                      "_blank",
                    );
                  }}
                >
                  <Send className="h-3.5 w-3.5" /> إرسال
                </button>
              </div>
            </div>
            <pre className="max-h-[130px] overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-[inherit] text-[11.5px] font-bold leading-relaxed text-emerald-950">
              {thanks.text}
            </pre>
            <div className="mt-1 text-[10.5px] font-bold text-emerald-800">
              يمكنك تعديل نص الرسالة ونسبة العرض من شاشة الإعدادات — وتظهر فقط في أول تعامل للعميل.
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 rounded-md bg-[#eef4fa] px-2.5 py-1.5 text-[12px] font-bold text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-[#2fb3a6]" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} />
          إرفاق صورة الفاتورة (افتح الطباعة ← «حفظ كـ PDF» أو صوّر الشاشة وأرفقها في واتساب)
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-green h-10 flex-1 text-[14.5px] font-black" onClick={openWhatsApp}>
            <Send className="h-4 w-4" /> إرسال على واتساب
          </button>
          <button type="button" className="btn btn-blue h-10 px-4 text-[13.5px] font-black" onClick={() => window.open(`/print/${invoice.id}`, "_blank")}>
            <Printer className="h-4 w-4" /> فتح الفاتورة للطباعة / PDF
          </button>
          <button type="button" className="btn h-10 px-4 text-[13.5px] font-bold" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** نحاول استخراج رقم تليفون العميل من بياناته */
function phoneFromInvoice(inv: Invoice): string {
  const anyInv = inv as unknown as { partyPhone?: string; phone?: string };
  return anyInv.partyPhone || anyInv.phone || "";
}
