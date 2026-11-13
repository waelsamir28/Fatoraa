"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FilePlus2, HandCoins, Info, Pencil, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconCustomers, IconSuppliers } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate } from "@/lib/format";
import type { Party, PartyType, StatementRow } from "@/lib/types";

const CFG = {
  customer: {
    title: "العملاء",
    one: "عميل",
    balanceLabel: "مستحق على العملاء",
    payLabel: "تحصيل دفعة",
    payTitle: "تحصيل دفعة من العميل",
    invoiceHref: "/sales",
  },
  supplier: {
    title: "الموردين",
    one: "مورد",
    balanceLabel: "مستحق للموردين",
    payLabel: "سداد دفعة",
    payTitle: "سداد دفعة للمورد",
    invoiceHref: "/purchases",
  },
};

type Form = { id?: number; name: string; phone: string; address: string; notes: string; balance: string };
type Statement = { party: Party; opening: number; rows: StatementRow[] };

export function PartiesManager({ type }: { type: PartyType }) {
  const cfg = CFG[type];
  const router = useRouter();
  const { confirm, toast } = useDesktop();
  const [items, setItems] = useState<Party[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [payFor, setPayFor] = useState<Party | null>(null);
  const [pay, setPay] = useState({ amount: "", notes: "" });
  const [statement, setStatement] = useState<Statement | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Party[] }>(`/api/parties?type=${type}`);
      setItems(r.items);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [type, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useMemo(() => {
    const s = q.trim();
    return items.filter((p) => !s || p.name.includes(s) || p.phone.includes(s) || String(p.code).includes(s));
  }, [items, q]);
  const totalBalance = items.reduce((s, p) => s + p.balance, 0);
  const debtors = items.filter((p) => p.balance > 0).length;
  const selected = items.find((p) => p.id === sel) ?? null;

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast("يجب إدخال الاسم", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, type, balance: form.balance.trim() === "" ? undefined : Number(form.balance) || 0 };
      const p = form.id
        ? await api<Party>(`/api/parties/${form.id}`, { method: "PUT", json: payload })
        : await api<Party>("/api/parties", { method: "POST", json: payload });
      toast(form.id ? `تم تعديل بيانات "${p.name}"` : `تم إضافة ${cfg.one} "${p.name}" برقم ${p.code}`);
      setForm(null);
      setSel(p.id);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (p: Party) => {
    const ok = await confirm(`هل تريد حذف ${cfg.one} "${p.name}"؟\nسيتم حذف دفعاته وفصل فواتيره عن الحساب.`, {
      title: "حذف حساب",
      danger: true,
      okText: "حذف",
      cancelText: "إلغاء",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await api(`/api/parties/${p.id}`, { method: "DELETE" });
      toast("تم الحذف");
      setSel(null);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const submitPay = async () => {
    if (!payFor) return;
    const amount = Number(pay.amount);
    if (!(amount > 0)) {
      toast("أدخل مبلغاً صحيحاً", "error");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/parties/${payFor.id}/payments`, { method: "POST", json: { amount, notes: pay.notes } });
      toast(`تم تسجيل ${cfg.payLabel} بمبلغ ${fmt(amount)} ج.م`);
      setPayFor(null);
      setPay({ amount: "", notes: "" });
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const openStatement = async (p: Party) => {
    try {
      setStatement(await api<Statement>(`/api/parties/${p.id}/payments`));
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <Window
      title={type === "customer" ? "إدارة حسابات العملاء" : "إدارة حسابات الموردين"}
      icon={type === "customer" ? <IconCustomers className="h-9 w-9" /> : <IconSuppliers className="h-9 w-9" />}
      statusBar={
        <>
          <span>عدد {cfg.title}: {items.length}</span>
          <span className="sep" />
          <span>{cfg.balanceLabel}: {fmt(totalBalance)} ج.م</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "اضغط مرتين للتعديل"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="flex items-end gap-1 border-b-2 border-[#1a63db] px-2">
          {(["customer", "supplier"] as const).map((t) => (
            <Link
              key={t}
              href={t === "customer" ? "/customers" : "/suppliers"}
              className={`flex items-center gap-2 rounded-t-lg border border-b-0 px-6 py-2 text-[17px] font-black ${
                t === type ? "border-[#1a63db] bg-gradient-to-b from-[#3d8af0] to-[#0d55cf] text-white" : "border-[#b4c4dc] bg-gradient-to-b from-white to-[#e2e9f4] text-[#0b2350] hover:brightness-105"
              }`}
            >
              {t === "customer" ? <IconCustomers className="h-7 w-7" /> : <IconSuppliers className="h-7 w-7" />}
              {CFG[t].title}
            </Link>
          ))}
        </div>

        <div className="panel flex flex-wrap items-center gap-2 p-2">
          <button type="button" className="btn btn-green h-[40px] px-4 text-[15px]" onClick={() => setForm({ name: "", phone: "", address: "", notes: "", balance: "" })}>
            <Plus className="h-5 w-5" strokeWidth={3} />
            {cfg.one} جديد
          </button>
          <button
            type="button"
            className="btn h-[40px] px-4 text-[15px]"
            disabled={!selected}
            onClick={() => selected && setForm({ id: selected.id, name: selected.name, phone: selected.phone, address: selected.address, notes: selected.notes, balance: String(selected.balance) })}
          >
            <Pencil className="h-5 w-5 text-blue-700" />
            تعديل
          </button>
          <button type="button" className="btn btn-red h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && void del(selected)}>
            <Trash2 className="h-5 w-5" />
            حذف
          </button>
          <button type="button" className="btn btn-orange h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && setPayFor(selected)}>
            <HandCoins className="h-5 w-5" />
            {cfg.payLabel}
          </button>
          <button type="button" className="btn btn-blue h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && void openStatement(selected)}>
            <Info className="h-5 w-5" />
            كشف حساب
          </button>
          <button type="button" className="btn h-[40px] px-3" onClick={() => void load()} title="تحديث">
            <RefreshCw className={`h-5 w-5 text-blue-700 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative ms-auto">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="win-input h-[40px] w-[280px] pr-8" placeholder="بحث بالاسم أو الرقم أو الهاتف..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-3">
          <Kpi label={`عدد ${cfg.title}`} value={items.length} color="navy" />
          <Kpi label={cfg.balanceLabel} value={fmt(totalBalance)} color="red" sub="ج.م" />
          <Kpi label="حسابات عليها رصيد" value={debtors} color="orange" />
          <Kpi label={`رصيد ${cfg.one} المحدد`} value={selected ? fmt(selected.balance) : "-"} color="blue" sub={selected?.name ?? "اختر حساباً من الجدول"} />
        </div>

        <div className="panel min-h-0 flex-1 overflow-auto p-0">
          <table className="dgrid text-center text-[14.5px]">
            <thead>
              <tr>
                <th className="w-[90px]">الرقم</th>
                {/* اسم العميل أو المورد في رأس الجدول */}
                <th className="text-right">{type === "customer" ? "اسم العميل" : "اسم المورد"}</th>
                <th>الهاتف</th>
                <th>العنوان</th>
                <th>الرصيد الحالى</th>
                <th>ملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const s = sel === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`clickable ${s ? "sel" : ""}`}
                    onClick={() => setSel(p.id)}
                    onDoubleClick={() => setForm({ id: p.id, name: p.name, phone: p.phone, address: p.address, notes: p.notes, balance: String(p.balance) })}
                  >
                    <td className={`num font-black ${s ? "" : "text-blue-700"}`}>{p.code}</td>

                    {/* خانة اسم العميل بلون أصفر هادي ومريح في كل الجداول */}
                    <td className="text-right font-black">
                      <span className="inline-block rounded px-2 py-0.5 bg-[#fffbeb] border border-amber-200 text-amber-950 shadow-2xs">
                        {p.name}
                      </span>
                    </td>

                    <td className="num" dir="ltr">{p.phone}</td>
                    <td className="max-w-[220px] truncate">{p.address}</td>
                    <td className={`num font-black ${!s && p.balance > 0 ? "text-red-600" : ""}`}>{fmt(p.balance)}</td>
                    <td className="max-w-[180px] truncate">{p.notes}</td>
                    <td className="p-1">
                      <div className="flex justify-center gap-1">
                        <button type="button" className="btn h-7 px-2 text-[12px]" onClick={(e) => { e.stopPropagation(); void openStatement(p); }}>
                          كشف
                        </button>
                        <button type="button" className="btn h-7 px-2 text-[12px]" onClick={(e) => { e.stopPropagation(); setPayFor(p); }}>
                          {type === "customer" ? "تحصيل" : "سداد"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr className="empty">
                  <td colSpan={7} className="py-10 text-slate-500">
                    {loading ? "جاري التحميل..." : "لا توجد حسابات"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Dialog
          title={form.id ? `تعديل بيانات ${cfg.one}` : `إضافة ${cfg.one} جديد`}
          onClose={() => setForm(null)}
          width={560}
          footer={
            <>
              <button type="button" className="btn btn-green h-9 px-6 font-bold" onClick={() => void save()} disabled={busy}>
                <Save className="h-4 w-4" />
                حفظ
              </button>
              <button type="button" className="btn h-9 px-5 font-bold" onClick={() => setForm(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم *" className="col-span-2">
              <input autoFocus className="win-input w-full bg-[#fffbeb] border-amber-300 font-black text-amber-950 text-[16px]" value={form.name} onChange={set("name")} />
            </Field>
            <Field label="الهاتف">
              <input className="win-input num w-full" dir="ltr" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label={form.id ? "الرصيد (تسوية)" : "رصيد أول المدة"}>
              <input className="win-input num w-full" inputMode="decimal" value={form.balance} onChange={set("balance")} placeholder="0" />
            </Field>
            <Field label="العنوان" className="col-span-2">
              <input className="win-input w-full" value={form.address} onChange={set("address")} />
            </Field>
            <Field label="ملاحظات" className="col-span-2">
              <textarea className="win-input h-[70px] w-full" value={form.notes} onChange={set("notes")} />
            </Field>
          </div>
        </Dialog>
      )}

      {payFor && (
        <Dialog
          title={`${cfg.payTitle}: ${payFor.name}`}
          onClose={() => setPayFor(null)}
          width={460}
          footer={
            <>
              <button type="button" className="btn btn-green h-9 px-6 font-bold" onClick={() => void submitPay()} disabled={busy}>
                <Save className="h-4 w-4" />
                تسجيل الدفعة
              </button>
              <button type="button" className="btn h-9 px-5 font-bold" onClick={() => setPayFor(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="mb-3 rounded-lg border border-[#b4c4dc] bg-white p-3 text-center">
            <div className="text-[13px] font-bold text-slate-500">الرصيد الحالي</div>
            <div className="num text-[28px] font-black text-red-600">{fmt(payFor.balance)} ج.م</div>
          </div>
          <div className="grid gap-3">
            <Field label="المبلغ *">
              <input
                autoFocus
                className="win-input num w-full text-center text-[20px]"
                inputMode="decimal"
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitPay();
                }}
              />
            </Field>
            <Field label="البيان / ملاحظات">
              <input className="win-input w-full" value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} placeholder={type === "customer" ? "تحصيل نقدي" : "سداد نقدي"} />
            </Field>
          </div>
        </Dialog>
      )}

      {statement && (
        <Dialog
          title={`كشف حساب: ${statement.party.name}`}
          onClose={() => setStatement(null)}
          width={900}
          footer={
            <button type="button" className="btn h-9 px-5 font-bold" onClick={() => setStatement(null)}>
              إغلاق
            </button>
          }
        >
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Kpi label="رصيد أول المدة" value={fmt(statement.opening)} color="navy" />
            <Kpi label="عدد الحركات" value={statement.rows.length} color="teal" />
            <Kpi label="الرصيد الحالي" value={fmt(statement.party.balance)} color="red" />
          </div>
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-[#b4c4dc]">
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th className="text-right">البيان</th>
                  <th>مدين</th>
                  <th>دائن</th>
                  <th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.map((r) => (
                  <tr
                    key={`${r.kind}-${r.id}`}
                    className={r.kind === "invoice" ? "clickable" : ""}
                    onDoubleClick={() => r.kind === "invoice" && router.push(`${cfg.invoiceHref}?id=${r.id}`)}
                    title={r.kind === "invoice" ? "اضغط مرتين لفتح الفاتورة" : undefined}
                  >
                    <td className="num">{fmtDate(r.date)}</td>
                    <td className="text-right">{r.description}</td>
                    <td className="num text-red-600">{r.debit ? fmt(r.debit) : "-"}</td>
                    <td className="num text-green-700">{r.credit ? fmt(r.credit) : "-"}</td>
                    <td className="num font-black">{fmt(r.balance)}</td>
                  </tr>
                ))}
                {statement.rows.length === 0 && (
                  <tr className="empty">
                    <td colSpan={5} className="py-8 text-slate-500">
                      لا توجد حركات على هذا الحساب
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
