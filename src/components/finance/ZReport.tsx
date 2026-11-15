"use client";

import { useEffect, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { api } from "@/lib/client";
import { fmt, fmtDate, fmtTime } from "@/lib/format";
import type { Shift, Settings } from "@/lib/types";
import type { ShiftCashSummary } from "@/components/finance/ShiftsView";

interface Resp {
  shift: Shift;
  summary: ShiftCashSummary;
  closed: { expectedCash: number; actualCash: number; difference: number } | null;
}

/**
 * تقرير تقفيل الوردية (Z-Report) — صفحة طباعة مستقلة 80mm.
 * تعرض كل حركة نقدية ومقارنة الكاش الفعلي بالمطلوب والفرق.
 */
export function ZReport({ id, auto }: { id: number; auto?: boolean }) {
  const [data, setData] = useState<Resp | null>(null);
  const [store, setStore] = useState<Settings | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api<Resp>(`/api/shifts/${id}`), api<Settings>("/api/settings")])
      .then(([r, s]) => {
        setData(r);
        setStore(s);
        document.title = `تقرير تقفيل وردية ${r.shift.shiftNumber}`;
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "تعذّر تحميل الوردية"));
  }, [id]);

  useEffect(() => {
    if (!data || !auto) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [data, auto]);

  if (err) return <div className="grid min-h-screen place-items-center bg-white text-red-700">{err}</div>;
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center bg-white text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );

  const { shift, summary: sum } = data;
  const expected = data.closed?.expectedCash ?? sum.expectedCash;
  const actual = data.closed?.actualCash;
  const diff = data.closed?.difference;

  const rows: Array<[string, number, "in" | "out" | "neutral"]> = [
    ["رصيد بداية الوردية", sum.startingCash, "neutral"],
    ["مبيعات نقدية", sum.cashSales, "in"],
    ["مبيعات آجلة مدفوعة", sum.creditPaid, "in"],
    ["تحصيلات من العملاء", sum.customerPayments, "in"],
    ["إيداعات / إضافات خزينة", sum.deposits, "in"],
    ["مرتجعات مشتريات (نقداً)", sum.purchaseReturns, "in"],
    ["مشتريات نقدية", sum.purchases, "out"],
    ["مرتجعات مبيعات", sum.salesReturns, "out"],
    ["مدفوعات للموردين", sum.supplierPayments, "out"],
    ["مصروفات", sum.expenses, "out"],
    ["سحوبات من الخزينة", sum.withdrawals, "out"],
  ];

  return (
    <div className="min-h-screen bg-[#e9edf3] py-4 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-3 flex w-full max-w-[420px] items-center gap-2">
        <button type="button" className="btn btn-blue h-10 flex-1" onClick={() => window.print()}>
          <Printer className="h-5 w-5" />
          طباعة تقرير Z
        </button>
        <button type="button" className="btn h-10 px-3" onClick={() => window.close()}>
          إغلاق
        </button>
      </div>

      <div className="mx-auto w-full max-w-[420px] bg-white p-4 text-[#0b2350] shadow print:max-w-none print:shadow-none">
        <div className="text-center">
          {store?.storeName && <div className="text-[16px] font-black">{store.storeName}</div>}
          {store?.phone && <div className="num text-[11px] font-bold text-slate-600">{store.phone}</div>}
          <div className="mt-1 inline-block rounded border-2 border-[#0b2350] px-3 py-0.5 text-[13px] font-black">
            تقرير تقفيل وردية (Z)
          </div>
        </div>

        <div className="mt-2 space-y-0.5 border-y border-dashed border-slate-400 py-1.5 text-[11.5px] font-bold">
          <Line label="رقم الوردية" value={`#${shift.shiftNumber}`} />
          <Line label="الكاشير" value={shift.cashierName} />
          <Line label="فتح" value={`${fmtDate(shift.openedAt)} — ${fmtTime(shift.openedAt)}`} />
          <Line
            label="إغلاق"
            value={shift.closedAt ? `${fmtDate(shift.closedAt)} — ${fmtTime(shift.closedAt)}` : "لم تُغلق بعد"}
          />
          <Line label="عدد الفواتير" value={String(sum.invoicesCount)} />
        </div>

        <table className="mt-2 w-full text-[11.5px]">
          <tbody>
            {rows.map(([label, value, kind]) => (
              <tr key={label} className="border-b border-dotted border-slate-300">
                <td className="py-0.5 font-bold">{label}</td>
                <td className={`num py-0.5 text-left font-black ${kind === "out" ? "text-red-700" : ""}`}>
                  {kind === "out" ? "-" : kind === "in" ? "+" : ""}
                  {fmt(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 rounded border-2 border-[#0b2350] p-2">
          <Line label="إجمالي داخل" value={fmt(sum.cashIn)} bold />
          <Line label="إجمالي خارج" value={fmt(sum.cashOut)} bold />
          <Line label="الكاش المتوقع في الدرج" value={fmt(expected)} bold />
          {actual !== undefined && actual !== null && (
            <>
              <Line label="الكاش الفعلي (المعدود)" value={fmt(actual)} bold />
              <div
                className={`mt-1 rounded px-2 py-1 text-center text-[13px] font-black ${
                  (diff ?? 0) === 0
                    ? "bg-emerald-100 text-emerald-900"
                    : (diff ?? 0) > 0
                      ? "bg-blue-100 text-blue-900"
                      : "bg-red-100 text-red-800"
                }`}
              >
                الفرق: {fmt(diff ?? 0)} ج.م
                {(diff ?? 0) === 0 ? " — مطابق ✓" : (diff ?? 0) > 0 ? " — زيادة" : " — عجز"}
              </div>
            </>
          )}
        </div>

        {shift.notes && (
          <div className="mt-2 rounded border border-slate-300 p-1.5 text-[11px] font-bold">
            ملاحظات: {shift.notes}
          </div>
        )}

        <div className="mt-3 flex items-end justify-between text-[10.5px] font-bold text-slate-600">
          <span>توقيع الكاشير: ....................</span>
          <span>توقيع المدير: ....................</span>
        </div>
        <div className="mt-1 border-t border-dashed border-slate-400 pt-1 text-center text-[9.5px] font-bold text-slate-500">
          طُبع في {new Date().toLocaleString("ar-EG")} — FATORA
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={bold ? "font-black" : "font-bold"}>{label}</span>
      <b className={`num ${bold ? "text-[12.5px]" : ""}`}>{value}</b>
    </div>
  );
}
