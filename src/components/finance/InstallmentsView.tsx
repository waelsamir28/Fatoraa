"use client";

import { useEffect, useState } from "react";
import { Banknote, CalendarCheck, Check, Clock, Coins, Plus, RefreshCw, Save, User } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, todayInput } from "@/lib/format";
import type { Installment, Party } from "@/lib/types";

export function InstallmentsView() {
  const { toast } = useDesktop();
  const [items, setItems] = useState<Installment[]>([]);
  const [totals, setTotals] = useState({ totalAmount: 0, pendingAmount: 0, paidAmount: 0, count: 0 });
  const [customers, setCustomers] = useState<Party[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [newModal, setNewModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // نافذة دفع مبلغ مخصص
  const [customPayModal, setCustomPayModal] = useState<Installment | null>(null);
  const [customPayAmount, setCustomPayAmount] = useState("");

  // فورم إضافة أقساط
  const [partyId, setPartyId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [count, setCount] = useState("3");
  const [intervalDays, setIntervalDays] = useState("30");
  const [startDate, setStartDate] = useState(todayInput());
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const q = filterStatus ? `?status=${filterStatus}` : "";
      const r = await api<{ items: Installment[]; totals: typeof totals }>(`/api/installments${q}`);
      setItems(r.items);
      setTotals(r.totals);

      const custs = await api<{ items: Party[] }>("/api/parties?type=customer");
      setCustomers(custs.items);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  useEffect(() => {
    void load();
  }, [filterStatus]);

  const togglePay = async (inst: Installment) => {
    try {
      await api("/api/installments", {
        method: "PUT",
        json: { id: inst.id },
      });
      toast(inst.status === "paid" ? "تم إلغاء سداد القسط" : `تم سداد قسط بقيمة ${fmt(inst.amount)} ج.م بنجاح`);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const submitCustomPay = async () => {
    if (!customPayModal) return;
    const amt = Number(customPayAmount);
    if (!amt || amt <= 0) {
      toast("يرجى إدخال مبلغ صحيح للدفع", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/installments", {
        method: "PUT",
        json: { id: customPayModal.id, customAmount: amt },
      });
      toast(`تم دفع مبلغ ${fmt(amt)} ج.م من القسط بنجاح وتخصيمه من رصيد العميل`);
      setCustomPayModal(null);
      setCustomPayAmount("");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const createPlan = async () => {
    if (!partyId) {
      toast("يرجى اختيار العميل", "error");
      return;
    }
    if (!(Number(totalAmount) > 0)) {
      toast("يرجى إدخال مبلغ صحيح للأقساط", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/installments", {
        method: "POST",
        json: {
          partyId: Number(partyId),
          totalAmount: Number(totalAmount),
          count: Number(count) || 1,
          intervalDays: Number(intervalDays) || 30,
          startDate,
          notes,
        },
      });
      toast("تم إنشاء جدول الأقساط للعميل بنجاح");
      setNewModal(false);
      setTotalAmount("");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Window title="إدارة الأقساط والمستحقات المجدولة" icon={<CalendarCheck className="h-8 w-8 text-blue-700" />}>
      <div className="flex h-full w-full flex-col gap-3 p-3">
        {/* شريط التحكم */}
        <div className="panel flex shrink-0 items-center gap-2 p-2 shadow-sm">
          <button
            type="button"
            className="btn btn-green h-[38px] px-4 text-[15px] font-black"
            onClick={() => setNewModal(true)}
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            إنشاء جدول أقساط جديد
          </button>

          <span className="mx-1 h-6 w-px bg-[#c3d0e3]" />

          <span className="text-[14px] font-bold">تصفية حسب الحالة:</span>
          <select
            className="win-input h-[38px] w-44 font-bold"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">جميع الأقساط</option>
            <option value="pending">المستحقة (المتبقية)</option>
            <option value="paid">المسددة فقط</option>
          </select>

          <div className="ms-auto flex items-center gap-2">
            <button type="button" className="btn h-[38px] px-3" onClick={() => void load()} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-4 gap-3">
          <Kpi label="إجمالي مبالغ الأقساط" value={fmt(totals.totalAmount)} color="navy" sub="ج.م" />
          <Kpi label="الأقساط المتبقية للتحصيل" value={fmt(totals.pendingAmount)} color="red" sub="مستحقة على العملاء" />
          <Kpi label="الأقساط المسددة بالفعل" value={fmt(totals.paidAmount)} color="green" sub="تم تحصيلها" />
          <Kpi label="إجمالي عدد الأقساط" value={totals.count} color="purple" sub="قسط مجدول" />
        </div>

        {/* جدول الأقساط */}
        <div className="panel min-h-0 flex-1 overflow-auto p-0 shadow-inner">
          <table className="dgrid text-center text-[13.5px]">
            <thead>
              <tr>
                <th className="w-12">م</th>
                <th className="text-right">اسم العميل</th>
                <th>رقم القسط</th>
                <th>قيمة القسط</th>
                <th>تاريخ الاستحقاق</th>
                <th>تاريخ السداد</th>
                <th>الحالة</th>
                <th className="text-right">ملاحظات</th>
                <th className="w-48">إجراءات السداد والتحصيل</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td className="num font-bold">{i + 1}</td>
                  <td className="max-w-[220px] truncate text-right font-black">
                    <span className="inline-block rounded px-2 py-0.5 bg-[#fffbeb] border border-amber-200 text-amber-950 shadow-2xs">
                      {it.partyName}
                    </span>
                  </td>
                  <td className="num font-bold">
                    قسط {it.installmentNo} من {it.totalInstallments}
                  </td>
                  <td className="num font-black text-[15px] text-[#0b2350]">{fmt(it.amount)}</td>
                  <td className="num font-bold text-slate-700">{fmtDate(it.dueDate)}</td>
                  <td className="num text-slate-500">{it.paidDate ? fmtDate(it.paidDate) : "-"}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                        it.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {it.status === "paid" ? "تم السداد ✓" : "مستحق للتحصيل"}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-right text-slate-600">{it.notes}</td>
                  <td className="p-1">
                    <div className="flex gap-1 justify-center">
                      {/* زر سداد القسط بالكامل */}
                      <button
                        type="button"
                        className={`btn h-7 px-2 text-[12px] font-black ${
                          it.status === "paid" ? "btn-orange" : "btn-green"
                        }`}
                        onClick={() => void togglePay(it)}
                      >
                        {it.status === "paid" ? "تراجع" : "سداد كامل"}
                      </button>

                      {/* زر دفع مبلغ مخصص (مختلف عن قيمة القسط) */}
                      {it.status !== "paid" && (
                        <button
                          type="button"
                          className="btn btn-blue h-7 px-2 text-[12px] font-black"
                          title="دفع مبلغ حر من القسط"
                          onClick={() => {
                            setCustomPayModal(it);
                            setCustomPayAmount(String(it.amount));
                          }}
                        >
                          <Coins className="h-3.5 w-3.5" />
                          دفع مبلغ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr className="empty">
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-bold">
                    لا توجد أقساط مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة دفع مبلغ مخصص غير مبلغ القسط المتفق عليه */}
      {customPayModal && (
        <Dialog
          title={`دفع مبلغ مخصص من قسط: ${customPayModal.partyName}`}
          onClose={() => setCustomPayModal(null)}
          width={440}
        >
          <div className="space-y-3">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
              <div className="text-[13px] font-bold text-slate-600">القسط المستحق الحالي:</div>
              <div className="num text-[24px] font-black text-blue-900">{fmt(customPayModal.amount)} ج.م</div>
              <div className="text-[11.5px] font-bold text-slate-500 mt-0.5">
                قسط رقم {customPayModal.installmentNo} من {customPayModal.totalInstallments}
              </div>
            </div>

            <Field label="أدخل المبلغ المراد دفعه الآن (ج.م) *">
              <input
                autoFocus
                className="win-input num w-full text-center text-[22px] font-black text-green-700"
                inputMode="decimal"
                value={customPayAmount}
                onChange={(e) => setCustomPayAmount(e.target.value)}
                placeholder="0.00"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitCustomPay();
                }}
              />
            </Field>

            {Number(customPayAmount) > 0 && Number(customPayAmount) < customPayModal.amount && (
              <div className="rounded bg-amber-50 border border-amber-200 p-2 text-center text-[12px] font-bold text-amber-900">
                المبلغ المتبقي على هذا القسط بعد الدفع سيكون:{" "}
                <b className="num text-[14px]">{fmt(customPayModal.amount - Number(customPayAmount))} ج.م</b>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-green h-10 flex-1 font-black text-[15px]"
                onClick={() => void submitCustomPay()}
                disabled={busy}
              >
                تأكيد الدفع والخصم من الحساب
              </button>
              <button type="button" className="btn h-10 px-5" onClick={() => setCustomPayModal(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* نافذة إنشاء جدول أقساط جديد */}
      {newModal && (
        <Dialog title="جدولة أقساط جديدة لعميل" onClose={() => setNewModal(false)} width={480}>
          <div className="grid gap-3">
            <Field label="اختر العميل *">
              <select
                className="win-input w-full font-bold"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                <option value="">-- اضغط لاختيار العميل --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (رصيد حالي: {fmt(c.balance)})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="المبلغ الإجمالي للأقساط *">
                <input
                  className="win-input num w-full text-center text-[18px] font-black text-blue-900"
                  inputMode="decimal"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="عدد الأقساط (الأشهر)">
                <input
                  className="win-input num w-full text-center font-bold"
                  type="number"
                  min="1"
                  max="60"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ أول قسط">
                <input
                  type="date"
                  className="win-input num w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>

              <Field label="الفترة بين الأقساط (بالأيام)">
                <input
                  className="win-input num w-full text-center font-bold"
                  type="number"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  placeholder="30"
                />
              </Field>
            </div>

            <Field label="ملاحظات أو رقم المعاملة">
              <input
                className="win-input w-full"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: قسط مطبوعات كروت أفراح ومستلزمات"
              />
            </Field>

            {Number(totalAmount) > 0 && Number(count) > 0 && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center text-[13px] font-black text-green-900">
                قيمة القسط الواحد: {fmt(Number(totalAmount) / Number(count))} ج.م تقريباً
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-green h-9 flex-1 font-black"
                onClick={() => void createPlan()}
                disabled={busy}
              >
                توليد وحفظ جدول الأقساط
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setNewModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
