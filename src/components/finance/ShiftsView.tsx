"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, DoorClosed, DoorOpen, Plus, RefreshCw, Save, ShieldAlert, UserCheck } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, fmtTime } from "@/lib/format";
import type { Shift } from "@/lib/types";

export function ShiftsView() {
  const { toast } = useDesktop();
  const [current, setCurrent] = useState<Shift | null>(null);
  const [items, setItems] = useState<Shift[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [cashierName, setCashierName] = useState("كاشير 1");
  const [startingCash, setStartingCash] = useState("500");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api<{ current: Shift | null; items: Shift[] }>("/api/shifts");
      setCurrent(r.current);
      setItems(r.items);
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
      toast("تم إغلاق الوردية وحفظ تقرير الكاشير بنجاح");
      setCloseModal(false);
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
                  setActualCash(String(current.startingCash));
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
            </div>

            <Field label="النقدية الفعلية بعد الجرد بالدرج *">
              <input
                autoFocus
                className="win-input num w-full text-center text-[22px] font-black text-blue-900"
                inputMode="decimal"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
              />
            </Field>

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
