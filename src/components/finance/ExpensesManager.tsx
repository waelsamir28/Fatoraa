"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconExpense } from "@/components/icons/MoreIcons";
import { api, errMsg } from "@/lib/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { dateInputToISO, daysAgoInput, fmt, fmtDate, isoToDateInput, monthStartInput, rangeToISO, todayInput } from "@/lib/format";

interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  notes: string;
}
interface Resp {
  items: Expense[];
  byCategory: { category: string; count: number; total: number }[];
  total: number;
}
type Form = { id?: number; date: string; category: string; amount: string; notes: string };

export function ExpensesManager() {
  const { confirm, toast } = useDesktop();
  const [from, setFrom] = useState(monthStartInput);
  const [to, setTo] = useState(todayInput);
  const [category, setCategory] = useState("");
  const [data, setData] = useState<Resp | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (f: string, t: string, c: string) => {
      try {
        const r = rangeToISO(f, t);
        setData(await api<Resp>(`/api/expenses?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&category=${encodeURIComponent(c)}`));
      } catch (e) {
        toast(errMsg(e), "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(monthStartInput(), todayInput(), "");
  }, [load]);

  const reload = () => void load(from, to, category);

  const save = async () => {
    if (!form) return;
    if (!(Number(form.amount) > 0)) {
      toast("أدخل مبلغاً صحيحاً", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount), date: dateInputToISO(form.date) };
      if (form.id) await api(`/api/expenses/${form.id}`, { method: "PUT", json: payload });
      else await api("/api/expenses", { method: "POST", json: payload });
      toast(form.id ? "تم تعديل المصروف" : `تم تسجيل مصروف ${fmt(Number(form.amount))} ج.م`);
      setForm(null);
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (x: Expense) => {
    if (!(await confirm(`حذف مصروف "${x.category}" بمبلغ ${fmt(x.amount)}؟`, { danger: true, okText: "حذف", cancelText: "إلغاء", kind: "warning" }))) return;
    try {
      await api(`/api/expenses/${x.id}`, { method: "DELETE" });
      toast("تم حذف المصروف");
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const selected = data?.items.find((x) => x.id === sel) ?? null;
  const toForm = (x: Expense): Form => ({ id: x.id, date: isoToDateInput(x.date), category: x.category, amount: String(x.amount), notes: x.notes });
  const days = Math.max(1, Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1);

  return (
    <Window
      title="المصروفات"
      icon={<IconExpense className="h-9 w-9" />}
      statusBar={
        <>
          <span>عدد المصروفات: {data?.items.length ?? 0}</span>
          <span className="sep" />
          <span>الإجمالي: {fmt(data?.total)} ج.م</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="panel flex shrink-0 flex-wrap items-center gap-2 p-2">
          <button type="button" className="btn btn-green h-[40px] px-4 text-[15px]" onClick={() => setForm({ date: todayInput(), category: "أخرى", amount: "", notes: "" })}>
            <Plus className="h-5 w-5" strokeWidth={3} />
            مصروف جديد
          </button>
          <button type="button" className="btn h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && setForm(toForm(selected))}>
            <Pencil className="h-5 w-5 text-blue-700" />
            تعديل
          </button>
          <button type="button" className="btn btn-red h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && void del(selected)}>
            <Trash2 className="h-5 w-5" />
            حذف
          </button>
          <span className="mx-1 h-6 w-px bg-[#c3d0e3]" />
          <span className="text-[14px] font-extrabold">من</span>
          <input type="date" className="win-input num w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-[14px] font-extrabold">إلى</span>
          <input type="date" className="win-input num w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="win-input w-[160px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">كل البنود</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button type="button" className="btn btn-blue h-[34px] px-4" onClick={reload}>
            <Search className="h-4 w-4" />
            عرض
          </button>
          <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => { setFrom(todayInput()); setTo(todayInput()); void load(todayInput(), todayInput(), category); }}>
            اليوم
          </button>
          <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => { setFrom(daysAgoInput(29)); setTo(todayInput()); void load(daysAgoInput(29), todayInput(), category); }}>
            آخر 30 يوم
          </button>
          <button type="button" className="btn ms-auto h-[34px] px-3" onClick={reload} title="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-3">
          <Kpi label="إجمالي المصروفات" value={fmt(data?.total)} color="red" sub="ج.م" />
          <Kpi label="عدد المصروفات" value={data?.items.length ?? 0} color="navy" />
          <Kpi label="متوسط المصروف اليومي" value={fmt((data?.total ?? 0) / days)} color="orange" sub={`على ${days} يوم`} />
          <Kpi label="أكبر بند" value={data?.byCategory[0]?.category ?? "-"} color="purple" sub={data?.byCategory[0] ? fmt(data.byCategory[0].total) : ""} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px] gap-3">
          <div className="panel min-h-0 overflow-auto p-0">
            <table className="dgrid text-center text-[14.5px]">
              <thead>
                <tr>
                  <th>م</th>
                  <th>التاريخ</th>
                  <th>البند</th>
                  <th>المبلغ</th>
                  <th className="text-right">البيان</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((x, i) => (
                  <tr key={x.id} className={`clickable ${sel === x.id ? "sel" : ""}`} onClick={() => setSel(x.id)} onDoubleClick={() => setForm(toForm(x))}>
                    <td className="num">{i + 1}</td>
                    <td className="num">{fmtDate(x.date)}</td>
                    <td>{x.category}</td>
                    <td className="num font-black">{fmt(x.amount)}</td>
                    <td className="max-w-[300px] truncate text-right">{x.notes}</td>
                    <td className="p-1">
                      <div className="flex justify-center gap-1">
                        <button type="button" className="btn h-7 w-8 p-0" title="تعديل" onClick={(e) => { e.stopPropagation(); setForm(toForm(x)); }}>
                          <Pencil className="h-4 w-4 text-blue-700" />
                        </button>
                        <button type="button" className="btn h-7 w-8 p-0" title="حذف" onClick={(e) => { e.stopPropagation(); void del(x); }}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && !data.items.length && (
                  <tr className="empty">
                    <td colSpan={6} className="py-10 text-slate-500">لا توجد مصروفات في هذه الفترة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="panel flex min-h-0 flex-col overflow-hidden">
            <div className="navy-head px-3 py-2 text-[15px]">المصروفات حسب البند</div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
              {data?.byCategory.map((c) => {
                const pct = data.total ? (c.total / data.total) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="mb-1 flex justify-between text-[13.5px] font-extrabold">
                      <span>{c.category} ({c.count})</span>
                      <span className="num">{fmt(c.total)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e3e9f2]">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#f2554a] to-[#c0170e]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {data && !data.byCategory.length && <div className="py-8 text-center text-slate-500">لا توجد بيانات</div>}
            </div>
          </div>
        </div>
      </div>

      {form && (
        <Dialog
          title={form.id ? "تعديل مصروف" : "تسجيل مصروف جديد"}
          onClose={() => setForm(null)}
          width={480}
          footer={
            <>
              <button type="button" className="btn btn-green h-9 px-6" onClick={() => void save()} disabled={busy}>
                <Save className="h-4 w-4" />
                حفظ
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setForm(null)}>إلغاء</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ *">
              <input autoFocus className="win-input num w-full text-center text-[18px]" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
            </Field>
            <Field label="التاريخ">
              <input type="date" className="win-input num w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value || todayInput() })} />
            </Field>
            <Field label="البند" className="col-span-2">
              <input className="win-input w-full" list="exp-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="exp-cats">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="البيان / ملاحظات" className="col-span-2">
              <input className="win-input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
