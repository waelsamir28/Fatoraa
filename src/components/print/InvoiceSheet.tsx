"use client";

import { InvoiceQr } from "./InvoiceQr";
import { APP_NAME, INVOICE_LABELS, SUPPORT_PHONE, paymentMethodLabel, paymentTypeLabel } from "@/lib/constants";
import { resolveLogo } from "@/lib/logo";
import { fmt, fmtDate, fmtQty, fmtTime } from "@/lib/format";
import type { InvoiceLayout } from "@/lib/invoiceLayout";
import type { Invoice, Settings } from "@/lib/types";

/** ورقة الفاتورة — تُستخدم في الطباعة وفي محرّر القوالب (معاينة حية) */
export function InvoiceSheet({
  inv,
  s,
  layout,
  qr = true,
}: {
  inv: Invoice;
  s: Settings;
  layout: InvoiceLayout;
  qr?: boolean;
}) {
  const isSale = inv.type === "sale" || inv.type === "sale_return";
  const remaining = Math.max(0, inv.total - inv.paid);
  const itemsDiscount = inv.items.reduce((a, b) => a + b.discount, 0);
  const thermal = layout.paper === "thermal";
  const accent = layout.accent || "#1e3a6a";
  const aligned =
    layout.headerAlign === "center" ? "text-center items-center" : layout.headerAlign === "left" ? "text-left items-start" : "text-right items-start";
  const cell = thermal
    ? "py-0.5"
    : layout.templateKey === "template-lines-a5"
      ? "border border-slate-400 px-1.5 py-1"
      : "border-b border-slate-200 px-1.5 py-1";

  return (
    <div
      dir="rtl"
      className={`invoice-sheet relative mx-auto bg-white text-[#0f172a] ${thermal ? "w-[80mm] p-3" : ""}`}
      style={{
        fontSize: `${(thermal ? 10 : 13) * (layout.scale / 100)}px`,
        ...(thermal
          ? {}
          : {
              width: layout.paper === "a4" ? "210mm" : "148mm",
              minHeight: layout.paper === "a4" ? "297mm" : "210mm",
              padding: `${(layout.paper === "a4" ? 12 : 8) * (layout.scale / 100)}mm`,
            }),
        border: layout.showBorder ? `2px solid ${accent}` : "1px solid #cbd5e1",
        borderRadius: layout.showBorder ? 10 : 4,
      }}
    >
      {/* علامة مائية */}
      {layout.watermark && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden select-none"
          aria-hidden
        >
          <span className="rotate-[-24deg] whitespace-nowrap font-black text-black/[0.05]" style={{ fontSize: "42px" }}>
            {layout.watermark}
          </span>
        </div>
      )}

      {/* نص ترويسة إضافي */}
      {layout.headerText && (
        <div className="mb-1.5 rounded px-2 py-1 text-center font-black text-white" style={{ background: accent }}>
          {layout.headerText}
        </div>
      )}

      {/* الترويسة */}
      <div
        className={`flex gap-3 border-b-2 pb-2 ${aligned} ${layout.headerAlign === "center" ? "flex-col" : "flex-row justify-between"}`}
        style={{ borderColor: accent }}
      >
        <div className={`flex gap-2 ${layout.headerAlign === "center" ? "flex-col items-center" : "items-start"}`}>
          {layout.showLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveLogo(s.customLogoUrl)}
              alt={APP_NAME}
              className="w-auto shrink-0 object-contain"
              style={{ height: thermal ? 40 : 56 }}
            />
          )}
          <div>
            <h1 className="font-black leading-tight" style={{ fontSize: thermal ? "13px" : "19px", color: accent }}>
              {s.storeName}
            </h1>
            {!thermal && (
              <div className="mt-0.5 text-[11px] font-bold text-slate-600">
                تجارة الأدوات المدرسية والمكتبية والخردوات وخدمات الطباعة والتصميم
              </div>
            )}
            {s.phone && (
              <div className="num text-[11px] font-bold text-slate-700">
                تليفون: {s.phone}
                {s.phone2 ? ` — ${s.phone2}` : ""}
              </div>
            )}
            {s.address && !thermal && <div className="text-[10.5px] text-slate-500">{s.address}</div>}
          </div>
        </div>

        <div className={`min-w-[150px] overflow-hidden rounded-lg border text-center ${thermal ? "" : "shadow-sm"}`} style={{ borderColor: accent }}>
          <div className="py-1 font-black text-white" style={{ background: accent, fontSize: thermal ? "12px" : "13px" }}>
            {INVOICE_LABELS[inv.type]}
          </div>
          <div className="grid grid-cols-2 gap-y-0.5 bg-slate-50 p-1.5 text-[11px] font-bold">
            <span className="text-slate-500">رقم:</span>
            <span className="num font-black text-red-600">#{inv.number}</span>
            <span className="text-slate-500">التاريخ:</span>
            <span className="num">{fmtDate(inv.date)}</span>
            {!thermal && (
              <>
                <span className="text-slate-500">الوقت:</span>
                <span className="num">{fmtTime(inv.date)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* بيانات العميل */}
      {layout.showCustomer && (
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded border border-slate-200 bg-[#f4f7fb] p-1.5 text-[11.5px] font-bold">
          <div>
            <span className="text-slate-500">{isSale ? "العميل" : "المورد"}: </span>
            <span className="font-black" style={{ color: accent }}>
              {inv.partyName}
            </span>
          </div>
          <div>
            <span className="text-slate-500">الدفع: </span>
            <span>
              {paymentTypeLabel(inv.paymentType)} ({paymentMethodLabel(inv.paymentMethod)})
            </span>
          </div>
          <div>
            <span className="text-slate-500">الكاشير: </span>
            <span>{inv.userName || s.userName}</span>
          </div>
          <div>
            <span className="text-slate-500">الفرع: </span>
            <span>{s.branchName}</span>
          </div>
        </div>
      )}

      {/* جدول الأصناف */}
      <table className="mt-2 w-full border-collapse text-center" style={{ fontSize: thermal ? "10px" : "11.5px" }}>
        <thead>
          <tr className="text-white" style={{ background: accent }}>
            <th className={`${cell} w-6`}>م</th>
            <th className={`${cell} text-right`}>الصنف والبيان</th>
            {layout.showUnit && !thermal && <th className={`${cell} w-12`}>العبوة</th>}
            <th className={`${cell} w-10`}>الكمية</th>
            <th className={`${cell} w-14`}>السعر</th>
            {layout.showDiscount && !thermal && <th className={`${cell} w-12`}>الخصم</th>}
            <th className={`${cell} w-16`}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id ?? i} className={layout.templateKey === "template-lines-a5" ? "" : "odd:bg-white even:bg-[#f8fafc]"}>
              <td className={`num ${cell}`}>{i + 1}</td>
              <td className={`${cell} text-right font-black text-slate-900`}>{it.productName}</td>
              {layout.showUnit && !thermal && <td className={cell}>{it.unit}</td>}
              <td className={`num ${cell} font-bold`}>{fmtQty(it.qty)}</td>
              <td className={`num ${cell}`}>{fmt(it.price)}</td>
              {layout.showDiscount && !thermal && <td className={`num ${cell} text-red-600`}>{fmt(it.discount)}</td>}
              <td className={`num ${cell} font-black`}>{fmt(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* الإجماليات */}
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1 text-[10.5px] font-bold text-slate-600">
          {layout.showNotes && inv.notes && (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-1.5 text-slate-700">
              <b>ملاحظات:</b> {inv.notes}
            </div>
          )}
          {!thermal && (
            <div>
              عدد البنود: <b>{inv.items.length}</b> أصناف
            </div>
          )}
          {layout.showSignature && (
            <div className="pt-3 text-center text-[10.5px] font-bold text-slate-500">
              <div className="mb-6 text-slate-400">................................</div>
              {layout.signatureText || "توقيع المستلم"}
            </div>
          )}
        </div>

        {layout.showTotals && (
          <div className="w-[190px] overflow-hidden rounded border border-slate-300 bg-white text-[11.5px] font-bold">
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
            <div className="flex justify-between px-2 py-1 text-[13px] font-black text-[#ffe600]" style={{ background: accent }}>
              <span className="text-white">الصافي المطلوب:</span>
              <span className="num">
                {fmt(inv.total)} {s.currency}
              </span>
            </div>
            {layout.showPaid && (
              <>
                <div className="flex justify-between border-b border-slate-200 px-2 py-0.5 text-green-800">
                  <span>المدفوع نقداً:</span>
                  <span className="num">{fmt(inv.paid)}</span>
                </div>
                <div className="flex justify-between px-2 py-0.5 text-red-600">
                  <span>المتبقي (آجل):</span>
                  <span className="num">{fmt(remaining)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* التذييل و QR */}
      <div className="mt-3 flex items-start justify-between gap-3 border-t border-slate-300 pt-1.5">
        <div className="flex-1 text-center text-[10px] font-bold text-slate-500">
          {layout.footerText && <div className="font-black text-slate-700">{layout.footerText}</div>}
          {s.invoiceFooter && layout.footerText !== s.invoiceFooter && (
            <div className="font-black text-slate-700">{s.invoiceFooter}</div>
          )}
          <div>
            نظام نقاط البيع وإدارة المحلات — {APP_NAME} — {SUPPORT_PHONE}
          </div>
        </div>
        {qr && layout.showQr && (
          <InvoiceQr
            invoiceId={inv.id}
            number={inv.number}
            size={thermal ? 60 : 80}
            thermal={thermal}
            label="امسح لعرض الفاتورة"
          />
        )}
      </div>
    </div>
  );
}
