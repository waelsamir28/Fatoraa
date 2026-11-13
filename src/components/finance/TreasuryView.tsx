"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Printer, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconTreasury } from "@/components/icons/MoreIcons";
import { api, errMsg } from "@/lib/client";
import { INVOICE_LABELS } from "@/lib/constants";
import { daysAgoInput, fmt, fmtDate, fmtTime, monthStartInput, rangeToISO, todayInput } from "@/lib/format";

interface Move {
  src: string;
  id: number;
  date: string;
  kind: string;
  ref: string;
  party: string;
  notes: string;
  cashIn: number;
  cashOut: number;
  balance: number;
}
interface Resp {
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  summary: Record<string, { in: number; out: number }>;
  rows: Move[];
}

const EDITOR: Record<string, string> = { sale: "/sales", purchase: "/purchases", sale_return: "/returns/sales", purchase_return: "/returns/purchases" };

function describe(m: Move) {
  if (m.src === "invoice") return `${INVOICE_LABELS[m.kind] ?? "فاتورة"} رقم ${m.ref}${m.party ? ` - ${m.party}` : ""}`;
  if (m.src === "payment") return `${m.kind === "customer" ? "تحصيل من" : "سداد إلى"} ${m.party}${m.notes ? ` (${m.notes})` : ""}`;
  if (m.src === "expense") return `مصروف: ${m.kind}${m.notes ? ` - ${m.notes}` : ""}`;
  return `${m.kind === "in" ? "إيداع نقدية" : "سحب نقدية"}${m.notes ? ` - ${m.notes}` : ""}`;
}

const SUMMARY_LABELS: Array<[string, string, "in" | "out"]> = [
  ["sale", "مبيعات نقدية", "in"],
  ["payment_customer", "تحصيلات العملاء", "in"],
  ["purchase_return", "مرتجع مشتريات", "in"],
  ["manual_in", "إيداعات", "in"],
  ["purchase", "مشتريات نقدية", "out"],
  ["payment_supplier", "سداد الموردين", "out"],
  ["sale_return", "مرتجع مبيعات", "out"],
  ["expense", "المصروفات", "out"],
  ["manual_out", "مسحوبات", "out"],
];

export function TreasuryView() {
  const router = useRouter();
  const { confirm, toast } = useDesktop();
  const [from, setFrom] = useState(todayInput);
  const [to, setTo] = useState(todayInput);
  const [data, setData] = useState<Resp | null>(null);
  const [move, setMove] = useState<{ kind: "in" | "out"; amount: string; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (f: string, t: string) => {
      try {
        const r = rangeToISO(f, t);
        setData(await api<Resp>(`/api/treasury?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`));
      } catch (e) {
        toast(errMsg(e), "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(todayInput(), todayInput());
  }, [load]);

  const quick = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    void load(f, t);
  };

  const saveMove = async () => {
    if (!move) return;
    if (!(Number(move.amount) > 0)) {
      toast("أدخل مبلغاً صحيحاً", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/treasury", { method: "POST", json: { ...move, amount: Number(move.amount) } });
      toast(move.kind === "in" ? "تم تسجيل الإيداع" : "تم تسجيل السحب");
      setMove(null);
      void load(from, to);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const delMove = async (m: Move) => {
    if (!(await confirm("حذف هذه الحركة اليدوية من الخزينة؟", { danger: true, okText: "حذف", cancelText: "إلغاء" }))) return;
    try {
      await api(`/api/treasury/${m.id}`, { method: "DELETE" });
      toast("تم حذف الحركة");
      void load(from, to);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const open = (m: Move) => {
    if (m.src === "invoice" && EDITOR[m.kind]) router.push(`${EDITOR[m.kind]}?id=${m.id}`);
    else if (m.src === "expense") router.push("/expenses");
    else if (m.src === "payment") router.push(m.kind === "customer" ? "/customers" : "/suppliers");
  };

  return (
    <Window
      title="الخزينة وحركة النقدية"
      icon={<IconTreasury className="h-9 w-9" />}
      statusBar={
        <>
          <span>رصيد أول المدة: {fmt(data?.opening)}</span>
          <span className="sep" />
          <span className="text-green-700">وارد: {fmt(data?.totalIn)}</span>
          <span className="sep" />
          <span className="text-red-600">منصرف: {fmt(data?.totalOut)}</span>
          <span className="sep" />
          <span>الرصيد الحالي: {fmt(data?.closing)} ج.م</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="panel flex shrink-0 flex-wrap items-center gap-2 p-2">
          <button type="button" className="btn btn-green h-[40px] px-4 text-[15px]" onClick={() => setMove({ kind: "in", amount: "", notes: "" })}>
            <ArrowDownCircle className="h-5 w-5" />
            إيداع نقدية
          </button>
          <button type="button" className="btn btn-red h-[40px] px-4 text-[15px]" onClick={() => setMove({ kind: "out", amount: "", notes: "" })}>
            <ArrowUpCircle className="h-5 w-5" />
            سحب نقدية
          </button>
          <button type="button" className="btn h-[40px] px-4 text-[15px]" onClick={() => window.print()}>
            <Printer className="h-5 w-5 text-blue-700" />
            طباعة
          </button>
          <span className="mx-1 h-6 w-px bg-[#c3d0e3]" />
          <span className="text-[14px] font-extrabold">من</span>
          <input type="date" className="win-input num w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-[14px] font-extrabold">إلى</span>
          <input type="date" className="win-input num w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="button" className="btn btn-blue h-[34px] px-4" onClick={() => void load(from, to)}>
            <Search className="h-4 w-4" />
            عرض
          </button>
          <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(todayInput(), todayInput())}>اليوم (اليومية)</button>
          <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(daysAgoInput(1), daysAgoInput(1))}>أمس</button>
          <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(monthStartInput(), todayInput())}>هذا الشهر</button>
          <button type="button" className="btn ms-auto h-[34px] px-3" onClick={() => void load(from, to)} title="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-3">
          <Kpi label="رصيد أول المدة" value={fmt(data?.opening)} color="navy" sub="ج.م" />
          <Kpi label="إجمالي الوارد" value={fmt(data?.totalIn)} color="green" sub="ج.م" />
          <Kpi label="إجمالي المنصرف" value={fmt(data?.totalOut)} color="red" sub="ج.م" />
          <Kpi label="رصيد الخزينة" value={fmt(data?.closing)} color="gold" sub="النقدية المتوفرة" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] gap-3">
          <div className="panel min-h-0 overflow-auto p-0">
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th className="text-right">البيان</th>
                  <th>وارد</th>
                  <th>منصرف</th>
                  <th>الرصيد</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr className="empty">
                  <td colSpan={3} className="text-right font-black text-blue-800">رصيد أول المدة</td>
                  <td />
                  <td />
                  <td className="num font-black">{fmt(data?.opening)}</td>
                  <td />
                </tr>
                {data?.rows.map((m) => (
                  <tr key={`${m.src}-${m.id}`} className="clickable" onDoubleClick={() => open(m)} title="اضغط مرتين لفتح المستند">
                    <td className="num">{fmtDate(m.date)}</td>
                    <td className="num">{fmtTime(m.date)}</td>
                    <td className="max-w-[420px] truncate text-right">{describe(m)}</td>
                    <td className="num font-black text-green-700">{m.cashIn ? fmt(m.cashIn) : "-"}</td>
                    <td className="num font-black text-red-600">{m.cashOut ? fmt(m.cashOut) : "-"}</td>
                    <td className="num font-black">{fmt(m.balance)}</td>
                    <td className="w-[40px] p-1">
                      {m.src === "manual" && (
                        <button type="button" className="btn h-7 w-8 p-0" title="حذف" onClick={() => void delMove(m)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data && !data.rows.length && (
                  <tr className="empty">
                    <td colSpan={7} className="py-10 text-slate-500">لا توجد حركات نقدية في هذه الفترة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="panel flex min-h-0 flex-col overflow-hidden">
            <div className="navy-head px-3 py-2 text-[15px]">ملخص اليومية</div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="dgrid text-[14px]">
                <tbody>
                  {SUMMARY_LABELS.map(([key, label, dir]) => {
                    const v = data?.summary[key]?.[dir] ?? 0;
                    return (
                      <tr key={key}>
                        <td>{label}</td>
                        <td className={`num text-left font-black ${dir === "in" ? "text-green-700" : "text-red-600"}`}>{fmt(v)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="due-box m-2 flex items-center justify-between px-3 py-2">
              <span className="text-[16px] font-black text-white">صافي الحركة</span>
              <span className="due-value num text-[26px]">{fmt((data?.totalIn ?? 0) - (data?.totalOut ?? 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {move && (
        <Dialog
          title={move.kind === "in" ? "إيداع نقدية في الخزينة" : "سحب نقدية من الخزينة"}
          onClose={() => setMove(null)}
          width={440}
          footer={
            <>
              <button type="button" className={`btn ${move.kind === "in" ? "btn-green" : "btn-red"} h-9 px-6`} onClick={() => void saveMove()} disabled={busy}>
                <Save className="h-4 w-4" />
                تسجيل
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setMove(null)}>إلغاء</button>
            </>
          }
        >
          <div className="grid gap-3">
            <Field label="المبلغ *">
              <input autoFocus className="win-input num w-full text-center text-[20px]" inputMode="decimal" value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void saveMove(); }} />
            </Field>
            <Field label="البيان">
              <input className="win-input w-full" value={move.notes} onChange={(e) => setMove({ ...move, notes: e.target.value })} placeholder={move.kind === "in" ? "رأس مال / إيداع" : "مسحوبات شخصية / توريد للبنك"} />
            </Field>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
