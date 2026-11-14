"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, Printer, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconReports } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";

interface Row {
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface Data {
  summary: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    margin: number;
    sales: { count: number; net: number; tax: number };
    returns: { count: number; net: number };
  };
  byProduct: Row[];
  byDay: Array<{ day: string; revenue: number; cost: number; profit: number; count: number }>;
  lowMargin: Row[];
  stock: { costValue: number; saleValue: number; potentialProfit: number; items: number };
}

const money = (v: number) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => `${Number(v || 0).toFixed(1)}%`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function ProfitView() {
  const { toast } = useDesktop();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [from, setFrom] = useState(isoDay(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(now));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Data>(`/api/reports/profit?from=${from}&to=${to}`);
      setData(r);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [from, to, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;

  return (
    <Window
      title="تقرير الأرباح"
      icon={<IconReports className="h-9 w-9" />}
      statusBar={<span>ربح صافي: {s ? money(s.netProfit) : "—"} — هامش: {s ? pct(s.margin) : "—"}</span>}
    >
      <div className="h-full overflow-auto p-3">
        {/* شريط الفلتر */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <label className="text-[12.5px] font-black text-slate-600">من</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded border-2 border-[#c9d8ee] px-2 text-[12.5px] font-bold focus:border-blue-600 focus:outline-none"
          />
          <label className="text-[12.5px] font-black text-slate-600">إلى</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded border-2 border-[#c9d8ee] px-2 text-[12.5px] font-bold focus:border-blue-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={load}
            className="btn btn-blue flex h-8 items-center gap-1 px-3 text-[12.5px]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn flex h-8 items-center gap-1 px-3 text-[12.5px]"
          >
            <Printer className="h-3.5 w-3.5" /> طباعة
          </button>
          <div className="mr-auto flex gap-1">
            {[
              { label: "اليوم", f: () => [isoDay(now), isoDay(now)] },
              { label: "الأسبوع", f: () => [isoDay(new Date(Date.now() - 6 * 86400000)), isoDay(now)] },
              { label: "الشهر", f: () => [isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), isoDay(now)] },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  const [f, t] = b.f();
                  setFrom(f);
                  setTo(t);
                }}
                className="rounded bg-slate-100 px-2 py-1 text-[11.5px] font-black text-slate-700 hover:bg-slate-200"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* بطاقات الملخص */}
            <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                icon={<Wallet className="h-5 w-5" />}
                label="صافي الإيراد (بدون ضريبة)"
                value={money(s!.revenue)}
                tone="from-[#0b4cc2] to-[#0b2350]"
              />
              <Kpi
                icon={<ArrowDownRight className="h-5 w-5" />}
                label="تكلفة المبيعات (COGS)"
                value={money(s!.cogs)}
                tone="from-[#b45309] to-[#7c2d12]"
              />
              <Kpi
                icon={<TrendingUp className="h-5 w-5" />}
                label="إجمالي الربح"
                value={money(s!.grossProfit)}
                sub={`هامش ${pct(s!.margin)}`}
                tone="from-[#047857] to-[#064e3b]"
              />
              <Kpi
                icon={s!.netProfit >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                label="الربح الصافي (بعد المصروفات)"
                value={money(s!.netProfit)}
                sub={`مصروفات: ${money(s!.expenses)}`}
                tone={s!.netProfit >= 0 ? "from-[#1d4ed8] to-[#1e3a8a]" : "from-[#b91c1c] to-[#7f1d1d]"}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {/* حسب الصنف */}
              <Panel title="أعلى الأصناف ربحية">
                <Table
                  head={["الصنف", "الكمية", "الإيراد", "التكلفة", "الربح", "الهامش"]}
                  rows={data.byProduct.slice(0, 20).map((r) => [
                    r.name,
                    String(r.qty),
                    money(r.revenue),
                    money(r.cost),
                    money(r.profit),
                    pct(r.margin),
                  ])}
                  profitCol={4}
                />
              </Panel>

              {/* حسب اليوم */}
              <Panel title="الأرباح يومياً">
                <Table
                  head={["اليوم", "فواتير", "الإيراد", "التكلفة", "الربح"]}
                  rows={data.byDay.map((r) => [r.day, String(r.count), money(r.revenue), money(r.cost), money(r.profit)])}
                  profitCol={4}
                />
              </Panel>

              {/* أصناف بالخسارة */}
              <Panel title="أصناف تُباع بخسارة">
                {data.lowMargin.length ? (
                  <Table
                    head={["الصنف", "الكمية", "الإيراد", "التكلفة", "الخسارة", "الهامش"]}
                    rows={data.lowMargin.map((r) => [
                      r.name,
                      String(r.qty),
                      money(r.revenue),
                      money(r.cost),
                      money(r.profit),
                      pct(r.margin),
                    ])}
                    profitCol={4}
                  />
                ) : (
                  <div className="py-6 text-center text-[13px] font-bold text-emerald-700">
                    لا توجد أصناف تُباع بخسارة في هذه الفترة ✓
                  </div>
                )}
              </Panel>

              {/* قيمة المخزون */}
              <Panel title="قيمة المخزون الحالي">
                <div className="space-y-2 p-1">
                  <Line label="عدد الأصناف" value={String(data.stock.items)} />
                  <Line label="قيمة المخزون بالتكلفة" value={money(data.stock.costValue)} />
                  <Line label="قيمة المخزون بسعر البيع" value={money(data.stock.saleValue)} />
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-[13px] font-black text-emerald-900">الربح المحتمل من المخزون</span>
                    <span className="num text-[15px] font-black text-emerald-700">
                      {money(data.stock.potentialProfit)}
                    </span>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="mt-3 rounded-lg bg-white p-3 text-[12px] font-bold leading-relaxed text-slate-600 shadow-sm ring-1 ring-slate-200">
              <b className="text-[#0b2350]">طريقة الحساب:</b> صافي الإيراد = صافي المبيعات − الضريبة − صافي المرتجعات.
              تكلفة المبيعات = سعر تكلفة الصنف <b>لحظة البيع</b> (المسجّل في بنود الفاتورة) − تكلفة المرتجعات.
              الربح الصافي = إجمالي الربح − المصروفات المسجلة في نفس الفترة. الضريبة لا تُحسب ربحاً.
            </div>
          </>
        )}
      </div>
    </Window>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl bg-gradient-to-l ${tone} p-3 text-white shadow-md`}>
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/85">
        {icon}
        <span>{label}</span>
      </div>
      <div className="num mt-1 text-[20px] font-black leading-tight">{value}</div>
      {sub && <div className="num mt-0.5 text-[11.5px] font-bold text-white/75">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-[#f7faff] px-3 py-2 text-[13.5px] font-black text-[#0b2350]">
        {title}
      </div>
      <div className="max-h-[320px] overflow-auto">{children}</div>
    </div>
  );
}

function Table({ head, rows, profitCol }: { head: string[]; rows: string[][]; profitCol?: number }) {
  if (!rows.length) {
    return <div className="py-6 text-center text-[13px] font-bold text-slate-500">لا توجد بيانات في هذه الفترة</div>;
  }
  return (
    <table className="w-full text-right text-[12px]">
      <thead className="sticky top-0 bg-white">
        <tr className="border-b border-slate-200 text-[11.5px] text-slate-500">
          {head.map((h, i) => (
            <th key={i} className="px-2 py-1.5 font-black">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-50 font-bold last:border-0 hover:bg-[#f7faff]">
            {r.map((c, j) => (
              <td
                key={j}
                className={`px-2 py-1.5 ${j === 0 ? "text-[#0b2350]" : "num text-center"} ${
                  j === profitCol ? (c.startsWith("-") ? "text-red-600" : "text-emerald-700") : ""
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-2 py-1.5 last:border-0">
      <span className="text-[12.5px] font-bold text-slate-600">{label}</span>
      <span className="num text-[13px] font-black text-[#0b2350]">{value}</span>
    </div>
  );
}
