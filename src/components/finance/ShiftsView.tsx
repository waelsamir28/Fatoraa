"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, DoorClosed, DoorOpen, Plus, Printer, RefreshCw, Save, ShieldAlert, UserCheck } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, fmtTime } from "@/lib/format";
import type { Shift } from "@/lib/types";

export interface ShiftCashSummary {
  startingCash: number;
  cashSales: number;
  creditPaid: number;
  customerPayments: number;
  deposits: number;
  purchaseReturns: number;
  purchases: number;
  salesReturns: number;
  supplierPayments: number;
  expenses: number;
  withdrawals: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  invoicesCount: number;
}

export function ShiftsView() {
  const { toast } = useDesktop();
  const [current, setCurrent] = useState<Shift | null>(null);
  const [items, setItems] = useState<Shift[]>([]);
  const [live, setLive] = useState<ShiftCashSummary | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [cashierName, setCashierName] = useState("كاشير 1");
  const [startingCash, setStartingCash] = useState("500");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api<{ current: Shift | null; items: Shift[]; live: ShiftCashSummary | null }>("/api/shifts");
      setCurrent(r.current);
      setItems(r.items);
      setLive(r.live);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openShift = async () => {
    setBusy(true);
    try {
      await api("/api/shifts", {
        method: "POST",
        json: {
          action: "open",
          cashierName,
          startingCash: Number(startingCash) || 0,
          notes,
        },
      });
      toast("تم فتح وردية جديدة بنجاح");
      setOpenModal(false);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const closeShift = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api("/api/shifts", {
        method: "POST",
        json: {
          action: "close",
          shiftId: current.id,
          actualCash: Number(actualCash) || 0,
          notes,
        },
      });
      toast("تم إغلاق الوردية — جاري فتح تقرير Z للطباعة");
      setCloseModal(false);
      window.open(`/print/shift/${current.id}`, "_blank", "width=460,height=760");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Window title="الورديات ونقاط بيع الكاشير" icon={<Clock className="h-8 w-8 text-blue-700" />}>
      <div className="flex h-full w-full flex-col gap-3 p-3">
        {/* حالة الوردية الحالية */}
        <div className="panel flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-xl text-white ${current ? "bg-green-600" : "bg-amber-600"} shadow-md`}>
              {current ? <DoorOpen className="h-7 w-7" /> : <DoorClosed className="h-7 w-7" />}
            </div>
            <div>
              <div className="text-[18px] font-black text-[#0b2350]">
                {current ? `الوردية الحالية رقم #${current.shiftNumber} (مفتوحة)` : "لا توجد وردية مفتوحة حالياً"}
              </div>
              <div className="text-[13px] font-bold text-slate-600">
                {current
                  ? `الكاشير: ${current.cashierName} — وقت الفتح: ${fmtDate(current.openedAt)} ${fmtTime(current.openedAt)} — رصيد البداية: ${fmt(current.startingCash)} ج.م`
                  : "يرجى فتح وردية جديدة لبدء تسجيل مبيعات الكاشير وحركات الدرج"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {current ? (
              <button
                type="button"
                className="btn btn-red h-10 px-5 text-[15px] font-black"
                onClick={() => {
                  // نبدأ بالمبلغ المتوقع من حركات الوردية — الكاشير يعدّل لو الدرج مختلف
                  setActualCash(String(live?.expectedCash ?? current.startingCash));
                  setCloseModal(true);
                }}
              >
                <DoorClosed className="h-5 w-5" />
                تقفيل وإغلاق الوردية
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-green h-10 px-5 text-[15px] font-black"
                onClick={() => setOpenModal(true)}
              >
                <DoorOpen className="h-5 w-5" />
                فتح وردية جديدة
              </button>
            )}
            <button type="button" className="btn h-10 px-3" onClick={() => void load()} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* كروت إحصائيات */}
        <div className="grid grid-cols-4 gap-3">
          <Kpi label="إجمالي الورديات المسجلة" value={items.length} color="navy" />
          <Kpi label="حالة الكاشير" value={current ? "نشط - مفتوح" : "مغلق"} color={current ? "green" : "orange"} />
          <Kpi label="نقدية بداية الوردية" value={fmt(current?.startingCash ?? 0)} color="blue" sub="ج.م في الدرج" />
          <Kpi label="الورديات المغلقة" value={items.filter((s) => s.status === "closed").length} color="purple" />
        </div>

        {/* جدول سجل الورديات السابقة */}
        <div className="panel min-h-0 flex-1 overflow-auto p-0 shadow-inner">
          <table className="dgrid text-center text-[13.5px]">
            <thead>
              <tr>
                <th className="w-16">رقم</th>
                <th>الكاشير</th>
                <th>تاريخ الفتح</th>
                <th>تاريخ الإغلاق</th>
                <th>نقدية البداية</th>
                <th>النقدية الفعلية</th>
                <th>الفرق / العجز / الزيادة</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
                <th>تقرير Z</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="num font-black">#{s.shiftNumber}</td>
                  <td className="font-extrabold text-blue-900">{s.cashierName}</td>
                  <td className="num">{fmtDate(s.openedAt)} {fmtTime(s.openedAt)}</td>
                  <td className="num">{s.closedAt ? `${fmtDate(s.closedAt)} ${fmtTime(s.closedAt)}` : "-"}</td>
                  <td className="num">{fmt(s.startingCash)}</td>
                  <td className="num font-black">{s.actualCash !== null ? fmt(s.actualCash) : "-"}</td>
                  <td className={`num font-black ${(s.difference ?? 0) < 0 ? "text-red-600" : (s.difference ?? 0) > 0 ? "text-green-700" : ""}`}>
                    {s.difference !== null ? fmt(s.difference) : "-"}
                  </td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {s.status === "open" ? "مفتوحة" : "مغلقة"}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-right text-slate-600">{s.notes}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => window.open(`/print/shift/${s.id}`, "_blank", "width=460,height=760")}
                      className="flex items-center gap-1 rounded bg-[#0f2942] px-2 py-1 text-[11px] font-black text-white hover:bg-[#1b3f5f]"
                      title="طباعة تقرير تقفيل الوردية (Z)"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      تقرير Z
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة فتح وردية */}
      {openModal && (
        <Dialog title="فتح وردية كاشير جديدة" onClose={() => setOpenModal(false)} width={460}>
          <div className="grid gap-3">
            <Field label="اسم الكاشير المسئول *">
              <input
                autoFocus
                className="win-input w-full font-bold"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
              />
            </Field>

            <Field label="نقدية بداية الوردية (العهدة / الفكة بالدرج)">
              <input
                className="win-input num w-full text-center text-[18px] font-black text-green-700"
                inputMode="decimal"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
              />
            </Field>

            <Field label="ملاحظات افتتاحية">
              <input className="win-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-green h-9 flex-1 font-black"
                onClick={() => void openShift()}
                disabled={busy}
              >
                تأكيد فتح الوردية
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setOpenModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* نافذة تقفيل وردية */}
      {closeModal && current && (
        <Dialog title={`إغلاق وتقفيل الوردية #${current.shiftNumber}`} onClose={() => setCloseModal(false)} width={460}>
          <div className="grid gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-center text-[13px] font-bold text-blue-900">
              الكاشير: {current.cashierName} — نقدية البداية: {fmt(current.startingCash)} ج.م
              {live ? ` — عدد الفواتير: ${live.invoicesCount}` : ""}
            </div>

            {/* تفصيل حركة الدرج: من هنا الرقم المتوقع بيطلع صح */}
            {live && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="bg-[#0f2942] px-3 py-1.5 text-[12.5px] font-black text-white">حركة الدرج في الوردية</div>
                <div className="divide-y divide-slate-100">
                  <CashRow label="نقدية بداية الوردية" value={live.startingCash} plus />
                  <CashRow label="مبيعات نقدية" value={live.cashSales} plus />
                  {live.creditPaid > 0 && <CashRow label="مدفوع من فواتير آجلة" value={live.creditPaid} plus />}
                  {live.customerPayments > 0 && <CashRow label="تحصيلات من العملاء" value={live.customerPayments} plus />}
                  {live.deposits > 0 && <CashRow label="إيداعات خزينة" value={live.deposits} plus />}
                  {live.purchaseReturns > 0 && <CashRow label="مرتجعات مشتريات (نقدية راجعة)" value={live.purchaseReturns} plus />}
                  {live.purchases > 0 && <CashRow label="مشتريات نقدية" value={-live.purchases} />}
                  {live.salesReturns > 0 && <CashRow label="مرتجعات مبيعات (نقدية خارجة)" value={-live.salesReturns} />}
                  {live.supplierPayments > 0 && <CashRow label="سداد للموردين" value={-live.supplierPayments} />}
                  {live.expenses > 0 && <CashRow label="مصروفات" value={-live.expenses} />}
                  {live.withdrawals > 0 && <CashRow label="سحب من الخزينة" value={-live.withdrawals} />}
                  <div className="flex items-center justify-between bg-emerald-50 px-3 py-2">
                    <span className="text-[13px] font-black text-emerald-900">المتوقع في الدرج</span>
                    <span className="num text-[18px] font-black text-emerald-700">{fmt(live.expectedCash)}</span>
                  </div>
                </div>
              </div>
            )}

            <Field label="النقدية الفعلية بعد الجرد بالدرج *">
              <input
                autoFocus
                className="win-input num w-full text-center text-[22px] font-black text-blue-900"
                inputMode="decimal"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
              />
            </Field>

            {/* الفرق فوراً قبل التأكيد */}
            {live && (
              (() => {
                const diff = Math.round((Number(actualCash) || 0) - live.expectedCash);
                const cls = diff < 0 ? "bg-red-50 text-red-700 border-red-300" : diff > 0 ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-700 border-emerald-300";
                return (
                  <div className={`rounded-lg border px-3 py-2 text-center ${cls}`}>
                    <div className="text-[12px] font-bold">
                      {diff < 0 ? "عجز في الدرج" : diff > 0 ? "زيادة في الدرج" : "الدرج مطابق تماماً"}
                    </div>
                    <div className="num text-[20px] font-black">{fmt(Math.abs(diff))} ج.م</div>
                  </div>
                );
              })()
            )}

            <Field label="ملاحظات تقفيل الوردية">
              <input className="win-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-red h-9 flex-1 font-black"
                onClick={() => void closeShift()}
                disabled={busy}
              >
                تأكيد التقفيل والإغلاق
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setCloseModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Window>
  );
}

/** سطر في تفصيل حركة الدرج */
function CashRow({ label, value, plus }: { label: string; value: number; plus?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[12.5px] font-bold text-slate-600">
        {plus ? "+" : "−"} {label}
      </span>
      <span className={`num text-[13.5px] font-black ${plus ? "text-emerald-700" : "text-red-600"}`}>
        {fmt(Math.abs(value))}
      </span>
    </div>
  );
}
