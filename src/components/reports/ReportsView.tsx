"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconReports } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { paymentMethodLabel } from "@/lib/constants";
import { daysAgoInput, fmt, fmtQty, monthStartInput, rangeToISO, toDateInput, todayInput, tzOffset } from "@/lib/format";
import type { Product } from "@/lib/types";

interface Agg {
  count: number;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  cost: number;
  paid: number;
}
interface ReportData {
  sales: Agg;
  purchases: Agg;
  profit: number;
  netProfit: number;
  expenses: number;
  salesReturns: Agg;
  purchaseReturns: Agg;
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    lowStock: number;
    receivables: number;
    payables: number;
    stockCost: number;
    stockSale: number;
  };
  daily: { day: string; type: string; total: number; count: number }[];
  topProducts: { name: string; qty: number; total: number; profit: number }[];
  methods: { method: string; count: number; total: number }[];
  topCustomers: { name: string; count: number; total: number }[];
  lowStock: Product[];
}

function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="navy-head flex h-[36px] shrink-0 items-center justify-between px-3 text-[15.5px]">
        <span>{title}</span>
        {extra}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

const Empty = ({ cols, text = "لا توجد بيانات" }: { cols: number; text?: string }) => (
  <tr className="empty">
    <td colSpan={cols} className="py-6 text-center text-slate-500">
      {text}
    </td>
  </tr>
);

export function ReportsView() {
  const { toast } = useDesktop();
  const [from, setFrom] = useState(monthStartInput);
  const [to, setTo] = useState(todayInput);
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (f: string, t: string) => {
      setLoading(true);
      try {
        const r = rangeToISO(f, t);
        const d = await api<ReportData>(
          `/api/reports?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&tz=${tzOffset()}`,
        );
        setData(d);
        setApplied({ from: f, to: t });
      } catch (e) {
        toast(errMsg(e), "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(monthStartInput(), todayInput());
  }, [load]);

  const quick = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    void load(f, t);
  };

  const days = useMemo(() => {
    if (!data || !applied) return [];
    const map = new Map<string, { sale: number; purchase: number }>();
    for (const d of data.daily) {
      const e = map.get(d.day) ?? { sale: 0, purchase: 0 };
      if (d.type === "sale") e.sale = d.total;
      else if (d.type === "purchase") e.purchase = d.total;
      map.set(d.day, e);
    }
    const start = new Date(`${applied.from}T00:00:00`);
    const end = new Date(`${applied.to}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    const out: { day: string; sale: number; purchase: number }[] = [];
    if (diff >= 0 && diff <= 62) {
      for (let i = 0; i <= diff; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const k = toDateInput(d);
        out.push({ day: k, ...(map.get(k) ?? { sale: 0, purchase: 0 }) });
      }
    } else {
      [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([k, v]) => out.push({ day: k, ...v }));
    }
    return out;
  }, [data, applied]);
  const maxDay = Math.max(1, ...days.map((d) => Math.max(d.sale, d.purchase)));
  const s = data?.sales;
  const year = new Date().getFullYear();

  const QUICK: Array<[string, () => void]> = [
    ["اليوم", () => quick(todayInput(), todayInput())],
    ["أمس", () => quick(daysAgoInput(1), daysAgoInput(1))],
    ["آخر 7 أيام", () => quick(daysAgoInput(6), todayInput())],
    ["آخر 30 يوم", () => quick(daysAgoInput(29), todayInput())],
    ["هذا الشهر", () => quick(monthStartInput(), todayInput())],
    ["هذا العام", () => quick(`${year}-01-01`, todayInput())],
  ];

  return (
    <Window
      title="التقارير والإحصائيات"
      icon={<IconReports className="h-9 w-9" />}
      statusBar={
        <>
          <span>الفترة: {applied ? `${applied.from} ← ${applied.to}` : "..."}</span>
          <span className="sep" />
          <span>فواتير المبيعات: {s?.count ?? 0}</span>
          <span className="sep" />
          <span>فواتير المشتريات: {data?.purchases.count ?? 0}</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "جاهز"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-2.5 p-3">
        {/* الفلاتر */}
        <div className="panel flex shrink-0 items-center gap-2 px-3 py-2">
          <span className="text-[14px] font-extrabold">من</span>
          <input type="date" className="win-input num w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-[14px] font-extrabold">إلى</span>
          <input type="date" className="win-input num w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="button" className="btn btn-blue h-[34px] px-4" onClick={() => void load(from, to)}>
            <Search className="h-4 w-4" />
            عرض التقرير
          </button>
          <span className="mx-1 h-6 w-px bg-[#c3d0e3]" />
          {QUICK.map(([label, fn]) => (
            <button key={label} type="button" className="btn h-[34px] px-3 text-[13px]" onClick={fn}>
              {label}
            </button>
          ))}
          <div className="ms-auto flex gap-2">
            <button type="button" className="btn h-[34px] px-3" onClick={() => void load(from, to)} title="تحديث">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/sales/list" className="btn h-[34px] px-3 text-[13px]">
              <FileText className="h-4 w-4 text-blue-700" />
              سجل المبيعات
            </Link>
            <Link href="/purchases/list" className="btn h-[34px] px-3 text-[13px]">
              <FileText className="h-4 w-4 text-orange-600" />
              سجل المشتريات
            </Link>
          </div>
        </div>

        {/* المؤشرات */}
        <div className="grid shrink-0 grid-cols-8 gap-2.5">
          <Kpi label="إجمالي المبيعات" value={fmt(s?.total)} color="blue" sub={`${s?.count ?? 0} فاتورة`} />
          <Kpi label="صافي الربح" value={fmt(data?.netProfit)} color="green" sub={`مجمل ${fmt(data?.profit)} - مصروفات`} />
          <Kpi label="إجمالي المشتريات" value={fmt(data?.purchases.total)} color="orange" sub={`${data?.purchases.count ?? 0} فاتورة`} />
          <Kpi label="المصروفات" value={fmt(data?.expenses)} color="purple" sub="ج.م" />
          <Kpi label="الضريبة المحصلة" value={fmt(s?.tax)} color="teal" sub="ج.م" />
          <Kpi label="مرتجع المبيعات" value={fmt(data?.salesReturns?.total)} color="red" sub={`${data?.salesReturns?.count ?? 0} فاتورة`} />
          <Kpi label="مستحقات العملاء" value={fmt(data?.counts.receivables)} color="navy" sub={`للموردين ${fmt(data?.counts.payables)}`} />
          <Kpi label="قيمة المخزون" value={fmt(data?.counts.stockCost)} color="gold" sub={`بالبيع ${fmt(data?.counts.stockSale)}`} />
        </div>

        {/* الرسم البياني + طرق الدفع */}
        <div className="grid h-[262px] shrink-0 grid-cols-[1.75fr_1fr] gap-2.5">
          <Section
            title="حركة المبيعات والمشتريات اليومية"
            extra={
              <span className="flex items-center gap-3 text-[13px]">
                <span className="flex items-center gap-1">
                  <i className="inline-block h-3 w-3 rounded-sm bg-[#2a74e6]" />
                  مبيعات
                </span>
                <span className="flex items-center gap-1">
                  <i className="inline-block h-3 w-3 rounded-sm bg-[#f08a1c]" />
                  مشتريات
                </span>
              </span>
            }
          >
            {days.length === 0 ? (
              <div className="grid h-full place-items-center font-bold text-slate-500">لا توجد بيانات في هذه الفترة</div>
            ) : (
              <div className="flex h-full flex-col px-3 pb-2 pt-3">
                <div className="flex min-h-0 flex-1 items-end gap-[3px] border-b-2 border-[#9fb3d1] px-1">
                  {days.map((d) => (
                    <div
                      key={d.day}
                      className="flex h-full min-w-[6px] flex-1 items-end justify-center gap-[1px] rounded-t hover:bg-blue-50"
                      title={`${d.day}\nمبيعات: ${fmt(d.sale)}\nمشتريات: ${fmt(d.purchase)}`}
                    >
                      <div className="w-1/2 rounded-t bg-gradient-to-t from-[#0b4fc0] to-[#5aa2ff]" style={{ height: `${d.sale ? Math.max(2, (d.sale / maxDay) * 100) : 0}%` }} />
                      <div className="w-1/2 rounded-t bg-gradient-to-t from-[#db6a06] to-[#ffb35c]" style={{ height: `${d.purchase ? Math.max(2, (d.purchase / maxDay) * 100) : 0}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-[3px] px-1 pt-1">
                  {days.map((d, i) => (
                    <div key={d.day} className="num min-w-[6px] flex-1 text-center text-[10px] font-bold text-slate-500">
                      {days.length <= 31 || i % Math.ceil(days.length / 31) === 0 ? `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="المبيعات حسب طريقة الدفع">
            <div className="space-y-2.5 p-3">
              {data?.methods.map((m) => {
                const pct = s && s.total ? (m.total / s.total) * 100 : 0;
                return (
                  <div key={m.method}>
                    <div className="mb-1 flex justify-between text-[13.5px] font-extrabold">
                      <span>
                        {paymentMethodLabel(m.method)} ({m.count})
                      </span>
                      <span className="num">
                        {fmt(m.total)} — {fmt(pct, 1)}%
                      </span>
                    </div>
                    <div className="h-3.5 overflow-hidden rounded-full bg-[#e3e9f2]">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#3cbb35] to-[#1f9a1f]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {data && !data.methods.length && <div className="py-6 text-center text-slate-500">لا توجد بيانات</div>}
            </div>
          </Section>
        </div>

        {/* الجداول */}
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5">
          <Section title="الأصناف الأكثر مبيعاً">
            <table className="dgrid text-center text-[13.5px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="text-right">الصنف</th>
                  <th>الكمية</th>
                  <th>المبيعات</th>
                  <th>الربح</th>
                </tr>
              </thead>
              <tbody>
                {data?.topProducts.map((p, i) => (
                  <tr key={p.name}>
                    <td className="num">{i + 1}</td>
                    <td className="max-w-[150px] truncate text-right">{p.name}</td>
                    <td className="num">{fmtQty(p.qty)}</td>
                    <td className="num font-black">{fmt(p.total)}</td>
                    <td className="num text-green-700">{fmt(p.profit)}</td>
                  </tr>
                ))}
                {data && !data.topProducts.length && <Empty cols={5} />}
              </tbody>
            </table>
          </Section>

          <Section title="أفضل العملاء">
            <table className="dgrid text-center text-[13.5px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="text-right">العميل</th>
                  <th>الفواتير</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data?.topCustomers.map((c, i) => (
                  <tr key={c.name}>
                    <td className="num">{i + 1}</td>
                    <td className="max-w-[170px] truncate text-right">{c.name}</td>
                    <td className="num">{c.count}</td>
                    <td className="num font-black">{fmt(c.total)}</td>
                  </tr>
                ))}
                {data && !data.topCustomers.length && <Empty cols={4} />}
              </tbody>
            </table>
          </Section>

          <Section
            title={`نواقص المخزون (${data?.counts.lowStock ?? 0})`}
            extra={
              <Link href="/inventory" className="text-[13px] underline">
                فتح المخازن
              </Link>
            }
          >
            <table className="dgrid text-center text-[13.5px]">
              <thead>
                <tr>
                  <th className="text-right">الصنف</th>
                  <th>الرصيد</th>
                  <th>الحد الأدنى</th>
                  <th>العجز</th>
                </tr>
              </thead>
              <tbody>
                {data?.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[170px] truncate text-right">{p.name}</td>
                    <td className="num font-black text-red-600">{fmtQty(p.stock)}</td>
                    <td className="num">{fmtQty(p.minStock)}</td>
                    <td className="num">{fmtQty(Math.max(0, p.minStock - p.stock))}</td>
                  </tr>
                ))}
                {data && !data.lowStock.length && <Empty cols={4} text="لا توجد نواقص 👍" />}
              </tbody>
            </table>
          </Section>
        </div>
      </div>
    </Window>
  );
}
