"use client";

import { Eye } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { INVOICE_LABELS, paymentMethodLabel, paymentTypeLabel } from "@/lib/constants";
import { fmt, fmtDate, fmtQty, fmtTime } from "@/lib/format";
import type { InvoiceItem } from "@/lib/types";

export function InvoicePreviewModal({
  type,
  number,
  date,
  partyName,
  paymentType,
  paymentMethod,
  items,
  subtotal,
  discount,
  taxRate,
  tax,
  total,
  paid,
  notes,
  userName,
  storeName,
  phone,
  onClose,
  onPrint,
  logo,
}: {
  type: string;
  number: number;
  date: string;
  partyName: string;
  paymentType: string;
  paymentMethod: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  paid: number;
  notes: string;
  userName: string;
  storeName: string;
  phone: string;
  onClose: () => void;
  onPrint: () => void;
  logo?: string;
}) {
  const remaining = Math.max(0, total - paid);

  return (
    <Dialog title={`معاينة سريعة للفاتورة مقاس A5 - رقم #${number}`} onClose={onClose} width={620}>
      <div className="space-y-3">
        {/* الورقة المصغرة A5 */}
        <div className="rounded-lg border-2 border-blue-300 bg-white p-5 shadow-sm text-[12.5px] text-slate-800">
          {/* رأس الفاتورة A5 */}
          <div className="flex items-start justify-between border-b-2 border-blue-600 pb-2.5">
            <div>
              <div className="flex items-start gap-2">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="logo" className="h-[54px] w-auto shrink-0 object-contain" />
                ) : null}
                <div>
                  <div className="text-[18px] font-black text-blue-950">{storeName || "برنامج FATORA"}</div>
                  <div className="text-[11px] text-slate-500 font-bold">أدوات مدرسية • خردوات • طباعة وتصميم • كروت أفراح • دعاية</div>
                  {phone && <div className="num text-[11.5px] font-bold text-slate-700" dir="ltr" style={{ textAlign: "right" }}>تليفون: {phone}</div>}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-blue-600 overflow-hidden text-center min-w-[130px]">
              <div className="bg-blue-600 text-white font-black py-0.5 text-[12px]">{INVOICE_LABELS[type] || "فاتورة"}</div>
              <div className="p-1 bg-blue-50 text-[11px] font-bold">
                <div>رقم: <b className="num text-red-600">#{number}</b></div>
                <div className="num text-slate-600">{date}</div>
              </div>
            </div>
          </div>

          {/* معلومات العميل */}
          <div className="my-2 grid grid-cols-2 gap-1.5 rounded bg-slate-50 p-1.5 text-[11.5px] border border-slate-200 font-bold">
            <div>العميل / الحساب: <b className="text-blue-900">{partyName}</b></div>
            <div>الدفع: <span>{paymentTypeLabel(paymentType)} ({paymentMethodLabel(paymentMethod)})</span></div>
            <div>المستخدم: <span>{userName}</span></div>
            <div>مقاس المعاينة: <b className="text-green-700">A5 Portrait</b></div>
          </div>

          {/* جدول الأصناف */}
          <table className="w-full border-collapse text-center text-[11.5px] my-2">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="py-1 px-1 w-6">م</th>
                <th className="py-1 px-2 text-right">الصنف</th>
                <th className="py-1 px-1 w-10">الكمية</th>
                <th className="py-1 px-1 w-14">السعر</th>
                <th className="py-1 px-1 w-10">الخصم</th>
                <th className="py-1 px-1 w-16">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50 border-b border-slate-200">
                  <td className="num py-0.5">{i + 1}</td>
                  <td className="text-right py-0.5 font-bold text-slate-900">{it.productName}</td>
                  <td className="num py-0.5 font-bold">{fmtQty(it.qty)}</td>
                  <td className="num py-0.5">{fmt(it.price)}</td>
                  <td className="num py-0.5 text-red-600">{it.discount > 0 ? fmt(it.discount) : "-"}</td>
                  <td className="num py-0.5 font-black">{fmt(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* الإجماليات */}
          <div className="flex justify-between items-start gap-4 pt-1 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 max-w-[200px]">
              {notes && <div><b>ملاحظات:</b> {notes}</div>}
              <div>إجمالي عدد الأصناف: {items.length}</div>
            </div>

            <div className="w-[180px] text-[11.5px] font-bold space-y-0.5">
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span>الإجمالي:</span>
                <span className="num">{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم:</span>
                  <span className="num">-{fmt(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>الضريبة ({taxRate}%):</span>
                  <span className="num">+{fmt(tax)}</span>
                </div>
              )}
              <div className="flex justify-between bg-blue-900 text-yellow-300 p-1 rounded font-black text-[13px]">
                <span className="text-white">المطلوب:</span>
                <span className="num">{fmt(total)} ج.م</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>المدفوع:</span>
                <span className="num">{fmt(paid)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>المتبقي:</span>
                  <span className="num">{fmt(remaining)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-green h-10 flex-1 font-black text-[15px]"
            onClick={onPrint}
          >
            تأكيد والطباعة الفورية (A5)
          </button>
          <button type="button" className="btn h-10 px-5" onClick={onClose}>
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </Dialog>
  );
}
