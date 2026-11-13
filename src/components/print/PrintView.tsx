"use client";

import { useEffect, useState } from "react";
import { Eye, Printer, X } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { APP_NAME, INVOICE_LABELS, SUPPORT_PHONE, paymentMethodLabel, paymentTypeLabel } from "@/lib/constants";
import { resolveLogo } from "@/lib/logo";
import { fmt, fmtDate, fmtQty, fmtTime } from "@/lib/format";
import type { Invoice, Settings } from "@/lib/types";

export function PrintView({
  id,
  auto,
  templateOverride,
}: {
  id: number;
  auto: boolean;
  templateOverride?: string;
}) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState<string>("template-modern-a5");

  useEffect(() => {
    Promise.all([api<Invoice>(`/api/invoices/${id}`), api<Settings>("/api/settings")])
      .then(([i, st]) => {
        setInv(i);
        setS(st);
        setCurrentTemplate(templateOverride || i.template || st.invoiceTemplate || "template-modern-a5");
        document.title = `${INVOICE_LABELS[i.type] || "فاتورة"} رقم ${i.number}`;
      })
      .catch((e) => setError(errMsg(e)));
  }, [id, templateOverride]);

  useEffect(() => {
    if (!inv || !s || !auto) return;
    let cancelled = false;
    const go = () => {
      if (!cancelled) window.print();
    };
    const t = setTimeout(() => {
      if (document.fonts?.ready) document.fonts.ready.then(go).catch(go);
      else go();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [inv, s, auto]);

  if (error) {
    return <div className="grid min-h-screen place-items-center bg-[#e9edf3] text-[20px] font-bold text-red-600">{error}</div>;
  }
  if (!inv || !s) {
    return <div className="grid min-h-screen place-items-center bg-[#e9edf3] text-[18px] font-bold text-slate-600">جاري تحميل الفاتورة...</div>;
  }

  const isSale = inv.type === "sale" || inv.type === "sale_return";
  const remaining = Math.max(0, inv.total - inv.paid);
  const itemsDiscount = inv.items.reduce((a, b) => a + b.discount, 0);

  return (
    <div className="min-h-screen bg-[#dce4ef] py-4 text-[#0f172a] print:bg-white print:py-0">
      {/* شريط أدوات الطباعة والقوالب */}
      <div className="no-print mx-auto mb-3 flex max-w-[760px] items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-blue h-9 px-4 text-[14px] font-black" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            طباعة الفاتورة A5
          </button>

          {/* محدد القوالب */}
          <select
            className="win-input h-9 font-bold text-[13px]"
            value={currentTemplate}
            onChange={(e) => setCurrentTemplate(e.target.value)}
          >
            <option value="template-modern-a5">قالب A5 عصري أنيق (Modern)</option>
            <option value="template-classic-a5">قالب A5 رسمي كلاسيكي (Classic)</option>
            <option value="template-pos-thermal">قالب إيصال حراري 80mm (Thermal POS)</option>
          </select>
        </div>

        <button
          type="button"
          className="btn h-9 px-4 text-[13px] font-bold"
          onClick={() => {
            window.close();
            setTimeout(() => history.back(), 150);
          }}
        >
          <X className="h-4 w-4" />
          إغلاق
        </button>
      </div>

      {/* ورقة الفاتورة بمقاس A5 الحقيقي المخصص للمحلات */}
      <div
        className={`print-sheet mx-auto bg-white shadow-2xl transition-all ${
          currentTemplate === "template-pos-thermal"
            ? "max-w-[80mm] p-4 text-[12px] border border-slate-300"
            : "max-w-[148mm] min-h-[210mm] p-6 text-[13px] border border-slate-300 rounded-lg"
        }`}
      >
        {/* الترويسة المصغرة والأنيقة */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-blue-600 pb-3">
          <div className="flex items-start gap-3">
            {/* شعار البرنامج في الفاتورة */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveLogo(s.customLogoUrl)} alt={APP_NAME} className="h-[62px] w-auto shrink-0 object-contain" />
            <div>
              <h1 className="text-[20px] font-black text-[#0b2350] leading-tight">{s.storeName}</h1>
              <div className="text-[12px] font-bold text-slate-600 mt-0.5">
                تجارة الأدوات المدرسية والمكتبية والخردوات وخدمات الطباعة والتصميم والدعاية
              </div>
              {s.phone && (
                <div className="num text-[12px] font-bold text-slate-700" dir="ltr" style={{ textAlign: "right" }}>
                  تليفون: {s.phone}{s.phone2 ? ` — ${s.phone2}` : ""}
                </div>
              )}
              {s.address && <div className="text-[11px] text-slate-500">{s.address}</div>}
            </div>
          </div>

          <div className="min-w-[160px] rounded-lg border border-blue-600 text-center overflow-hidden shadow-sm">
            <div className="bg-blue-600 py-1 text-[13.5px] font-black text-white">
              {INVOICE_LABELS[inv.type]}
            </div>
            <div className="grid grid-cols-2 gap-y-0.5 p-1.5 text-[11.5px] font-bold bg-blue-50/50">
              <span className="text-slate-500">رقم:</span>
              <span className="num font-black text-red-600 text-[13px]">#{inv.number}</span>
              <span className="text-slate-500">التاريخ:</span>
              <span className="num">{fmtDate(inv.date)}</span>
              <span className="text-slate-500">الوقت:</span>
              <span className="num">{fmtTime(inv.date)}</span>
            </div>
          </div>
        </div>

        {/* بيانات العميل ونوع الفاتورة */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-md bg-[#f4f7fb] p-2 text-[12px] font-bold border border-slate-200">
          <div>
            <span className="text-slate-500">{isSale ? "العميل" : "المورد"}: </span>
            <span className="font-black text-blue-900">{inv.partyName}</span>
          </div>
          <div>
            <span className="text-slate-500">طريقة الدفع: </span>
            <span>{paymentTypeLabel(inv.paymentType)} ({paymentMethodLabel(inv.paymentMethod)})</span>
          </div>
          <div>
            <span className="text-slate-500">المستخدم / الكاشير: </span>
            <span>{inv.userName || s.userName}</span>
          </div>
          <div>
            <span className="text-slate-500">الفرع: </span>
            <span>{s.branchName}</span>
          </div>
        </div>

        {/* جدول بنود وأصناف الفاتورة المتناسق */}
        <table className="mt-2.5 w-full border-collapse text-center text-[12px]">
          <thead>
            <tr className="bg-[#1e3a6a] text-white">
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-7">م</th>
              <th className="border border-[#1e3a6a] px-2 py-1 text-right">الصنف والبيان</th>
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-12">العبوة</th>
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-12">الكمية</th>
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-16">السعر</th>
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-12">الخصم</th>
              <th className="border border-[#1e3a6a] px-1.5 py-1 w-18">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={it.id ?? i} className="odd:bg-white even:bg-[#f8fafc]">
                <td className="num border border-slate-300 px-1 py-1">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-black text-slate-900">{it.productName}</td>
                <td className="border border-slate-300 px-1 py-1">{it.unit}</td>
                <td className="num border border-slate-300 px-1 py-1 font-bold">{fmtQty(it.qty)}</td>
                <td className="num border border-slate-300 px-1 py-1">{fmt(it.price)}</td>
                <td className="num border border-slate-300 px-1 py-1 text-red-600">{fmt(it.discount)}</td>
                <td className="num border border-slate-300 px-1 py-1 font-black">{fmt(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ملخص الحسابات والإجماليات */}
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <div className="flex-1 text-[11.5px] font-bold text-slate-600 space-y-1">
            {inv.notes && (
              <div className="rounded border border-dashed border-slate-300 p-1.5 text-slate-700 bg-slate-50">
                <b>ملاحظات:</b> {inv.notes}
              </div>
            )}
            <div>عدد البنود: <b>{inv.items.length}</b> أصناف</div>
          </div>

          <div className="w-[200px] overflow-hidden rounded-md border border-slate-300 text-[12px] font-bold bg-white">
            <div className="flex justify-between border-b border-slate-200 px-2 py-0.5">
              <span className="text-slate-600">إجمالي الأصناف:</span>
              <span className="num">{fmt(inv.subtotal)}</span>
            </div>
            {itemsDiscount > 0 && (
              <div className="flex justify-between border-b border-slate-200 px-2 py-0.5 text-red-600">
                <span>الخصومات:</span>
                <span className="num">-{fmt(itemsDiscount)}</span>
              </div>
            )}
            {inv.extraDiscount > 0 && (
              <div className="flex justify-between border-b border-slate-200 px-2 py-0.5 text-red-600">
                <span>خصم إضافي:</span>
                <span className="num">-{fmt(inv.extraDiscount)}</span>
              </div>
            )}
            {inv.tax > 0 && (
              <div className="flex justify-between border-b border-slate-200 px-2 py-0.5">
                <span className="text-slate-600">ضريبة ({inv.taxRate}%):</span>
                <span className="num">+{fmt(inv.tax)}</span>
              </div>
            )}
            <div className="flex justify-between bg-[#1e3a6a] px-2 py-1 text-[14px] font-black text-[#ffe600]">
              <span className="text-white">الصافي المطلوب:</span>
              <span className="num">{fmt(inv.total)} {s.currency}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 px-2 py-0.5 text-green-800">
              <span>المدفوع نقداً:</span>
              <span className="num">{fmt(inv.paid)}</span>
            </div>
            <div className="flex justify-between px-2 py-0.5 text-red-600">
              <span>المتبقي (آجل):</span>
              <span className="num">{fmt(remaining)}</span>
            </div>
          </div>
        </div>

        {/* فوتر مصغر ومختصر */}
        <div className="mt-4 border-t border-slate-300 pt-1.5 text-center text-[10.5px] font-bold text-slate-500">
          {s.invoiceFooter && <div className="text-slate-700 font-black">{s.invoiceFooter}</div>}
          <div>نظام نقاط البيع وإدارة المحلات - {APP_NAME} — {SUPPORT_PHONE}</div>
        </div>
      </div>
    </div>
  );
}
