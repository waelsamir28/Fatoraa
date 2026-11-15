"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Loader2, Printer, Save, TrendingDown } from "lucide-react";
import { Dialog, Field } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { PAYMENT_METHODS } from "@/lib/constants";
import { fmt, fmtDate, todayInput } from "@/lib/format";

interface PaymentRow {
  id: number;
  amount: number;
  date: string;
  notes: string;
}

interface PayData {
  invoice: {
    id: number;
    number: number;
    partyName: string;
    partyId: number | null;
    total: number;
    paid: number;
    initialPaid: number;
    extraPaid: number;
    remaining: number;
    date: string;
  };
  payments: PaymentRow[];
}

/** نافذة دفعات الفاتورة — تسجيل دفعات متعددة ومتابعة المتبقي */
export function InvoicePaymentsDialog({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const { toast } = useDesktop();
  const [data, setData] = useState<PayData | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    api<PayData>(`/api/invoices/${invoiceId}/payments`)
      .then((d) => {
        setData(d);
        setAmount(d.invoice.remaining > 0 ? String(d.invoice.remaining) : "");
      })
      .catch((e) => toast(errMsg(e), "error"));
  }, [invoiceId, toast]);

  useEffect(load, [load]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast("أدخل مبلغاً صحيحاً أكبر من صفر", "error");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        json: { amount: amt, date, method, notes },
      });
      toast(`تم تسجيل دفعة بمبلغ ${fmt(amt)} ج.م ✓`);
      setNotes("");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const inv = data?.invoice;

  return (
    <Dialog title={`دفعات الفاتورة رقم ${inv?.number ?? ""}`} onClose={onClose} width={720}>
      {!data || !inv ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[14px] font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> جاري التحميل...
        </div>
      ) : (
        <div className="space-y-3">
          {/* ملخص */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border-2 border-[#c9d8ee] bg-white px-2 py-2 text-center">
              <div className="text-[11.5px] font-bold text-slate-500">إجمالي الفاتورة</div>
              <div className="num text-[19px] font-black text-[#0f2942]">{fmt(inv.total)}</div>
            </div>
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 py-2 text-center">
              <div className="text-[11.5px] font-bold text-emerald-700">إجمالي المدفوع</div>
              <div className="num text-[19px] font-black text-emerald-800">{fmt(inv.paid)}</div>
            </div>
            <div className="rounded-lg border-2 border-red-200 bg-red-50 px-2 py-2 text-center">
              <div className="text-[11.5px] font-bold text-red-700">المتبقي</div>
              <div className="num text-[19px] font-black text-red-700">{fmt(inv.remaining)}</div>
            </div>
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 px-2 py-2 text-center">
              <div className="text-[11.5px] font-bold text-amber-800">عدد الدفعات</div>
              <div className="num text-[19px] font-black text-amber-900">{data.payments.length}</div>
            </div>
          </div>

          <div className="rounded-md bg-[#eef4fa] px-3 py-1.5 text-[12px] font-bold text-[#0f2942]">
            العميل: {inv.partyName} — تاريخ الفاتورة: {fmtDate(inv.date)}
          </div>

          {/* فورم دفعة جديدة */}
          {inv.remaining > 0 ? (
            <div className="rounded-lg border-2 border-[#c9d8ee] bg-white p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-black text-[#0f2942]">
                <Banknote className="h-4 w-4 text-emerald-600" /> تسجيل دفعة جديدة
              </div>
              <div className="grid grid-cols-4 items-end gap-2">
                <Field label="المبلغ (ج.م)">
                  <input
                    className="win-input num w-full font-black text-[16px]"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label="التاريخ">
                  <input type="date" className="win-input num w-full" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="طريقة الدفع">
                  <select className="win-input w-full font-bold" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ملاحظات (اختياري)">
                  <input className="win-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="دفعة..." />
                </Field>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  className="btn h-8 px-2 text-[11.5px] font-black"
                  onClick={() => setAmount(String(inv.remaining))}
                >
                  المتبقي كامل
                </button>
                <button
                  type="button"
                  className="btn h-8 px-2 text-[11.5px] font-black"
                  onClick={() => setAmount(String(Math.round(inv.remaining / 2)))}
                >
                  نصف المتبقي
                </button>
                <button
                  type="button"
                  className="btn btn-green ms-auto h-9 px-4 text-[14px] font-black"
                  onClick={() => void submit()}
                  disabled={busy}
                >
                  <Save className="h-4 w-4" />
                  {busy ? "جاري التسجيل..." : "تسجيل الدفعة"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 py-3 text-center text-[14px] font-black text-emerald-800">
              ✓ الفاتورة مسدّدة بالكامل
            </div>
          )}

          {/* سجل الدفعات */}
          <div className="overflow-hidden rounded-lg border border-[#c9d8ee]">
            <div className="bg-[#0f2942] px-3 py-1.5 text-[13px] font-black text-white">سجل الدفعات المسجّلة</div>
            <div className="max-h-[200px] overflow-auto">
              <table className="dgrid w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[50px]">#</th>
                    <th className="w-[130px]">المبلغ</th>
                    <th className="w-[110px]">التاريخ</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-[13px] font-bold text-slate-400">
                        لا توجد دفعات مسجّلة على هذه الفاتورة بعد
                        {inv.initialPaid > 0 && ` — المدفوع وقت الإنشاء: ${fmt(inv.initialPaid)} ج.م`}
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p, i) => (
                      <tr key={p.id}>
                        <td className="num text-center">{i + 1}</td>
                        <td className="num text-center font-black text-emerald-700">{fmt(p.amount)}</td>
                        <td className="num text-center">{fmtDate(p.date)}</td>
                        <td className="font-bold">{p.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {inv.initialPaid > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-1.5 text-[11.5px] font-bold text-amber-900">
              ملاحظة: مبلغ {fmt(inv.initialPaid)} ج.م سُجّل كمدفوع لحظة إنشاء الفاتورة، والدفعات أعلاه إضافية عليه.
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn h-9 px-3 text-[13px] font-bold" onClick={() => window.open(`/print/${invoiceId}`, "_blank")}>
              <Printer className="h-4 w-4" /> طباعة الفاتورة
            </button>
            <button type="button" className="btn btn-blue h-9 px-4 text-[13.5px] font-black" onClick={onClose}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** رصيد متابعة الدفعات — يُستخدم في سجل الفواتير لإظهار المتبقي */
export function RemainingBadge({ value }: { value: number }) {
  if (value <= 0.009) return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11.5px] font-black text-emerald-800">مسددة</span>;
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[11.5px] font-black text-red-700">
      <TrendingDown className="h-3 w-3" /> {fmt(value)}
    </span>
  );
}
