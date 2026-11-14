"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Receipt,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconHome } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { useDesktop } from "@/components/win/DesktopProvider";

interface DashData {
  today: { sales: number; invoices: number; profit: number; cash: number };
  yesterday: { sales: number; invoices: number };
  month: { sales: number; profit: number };
  alerts: { lowStock: number; dueInstallments: number; dueAmount: number };
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  openShift: { cashierName: string; openedAt: string; startingCash: number } | null;
  recent: Array<{ id: number; number: number; partyName: string; total: number; date: string; type: string }>;
}

const money = (v: number) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** لوحة تحكم المالك — مصممة للموبايل أولاً */
export function OwnerDashboard() {
  const { toast } = useDesktop();
  const [d, setD] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setD(await api<DashData>("/api/dashboard"));
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 60000); // تحديث تلقائي كل دقيقة
    return () => clearInterval(t);
  }, [load]);

  const growth =
    d && d.yesterday.sales > 0 ? ((d.today.sales - d.yesterday.sales) / d.yesterday.sales) * 100 : 0;

  return (
    <Window
      title="لوحة المالك"
      icon={<IconHome className="h-9 w-9" />}
      statusBar={<span>تحديث تلقائي كل دقيقة</span>}
    >
      <div className="h-full overflow-auto p-2.5">
        {loading || !d ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="mx-auto max-w-[900px] space-y-2.5">
            {/* بطاقة اليوم */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-l from-[#0b4cc2] to-[#061c46] p-4 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[12px] font-bold text-blue-200">مبيعات اليوم</div>
                  <div className="num mt-0.5 text-[30px] font-black leading-none">{money(d.today.sales)}</div>
                </div>
                <button
                  type="button"
                  onClick={load}
                  className="rounded-lg bg-white/15 p-2 hover:bg-white/25"
                  aria-label="تحديث"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="فواتير" value={String(d.today.invoices)} />
                <Mini label="أرباح" value={money(d.today.profit)} />
                <Mini label="نقدية" value={money(d.today.cash)} />
              </div>
              {d.yesterday.sales > 0 && (
                <div
                  className={`mt-2 flex items-center gap-1 text-[11.5px] font-black ${
                    growth >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {growth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(growth).toFixed(1)}% مقارنة بالأمس ({money(d.yesterday.sales)})
                </div>
              )}
            </div>

            {/* الشهر */}
            <div className="grid grid-cols-2 gap-2.5">
              <Card icon={<TrendingUp className="h-4 w-4" />} label="مبيعات الشهر" value={money(d.month.sales)} tone="text-blue-700" />
              <Card icon={<Wallet className="h-4 w-4" />} label="أرباح الشهر" value={money(d.month.profit)} tone="text-emerald-700" />
            </div>

            {/* تنبيهات */}
            {(d.alerts.lowStock > 0 || d.alerts.dueInstallments > 0) && (
              <div className="space-y-2">
                {d.alerts.lowStock > 0 && (
                  <Alert
                    icon={<Package className="h-4 w-4" />}
                    text={`${d.alerts.lowStock} صنف وصل للحد الأدنى — يحتاج شراء`}
                    tone="amber"
                  />
                )}
                {d.alerts.dueInstallments > 0 && (
                  <Alert
                    icon={<Clock className="h-4 w-4" />}
                    text={`${d.alerts.dueInstallments} قسط مستحق بقيمة ${money(d.alerts.dueAmount)}`}
                    tone="red"
                  />
                )}
              </div>
            )}

            {/* الوردية */}
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="text-[12px] font-black text-slate-500">الوردية الحالية</div>
              {d.openShift ? (
                <div className="mt-1 flex items-center justify-between text-[13.5px] font-bold">
                  <span className="text-[#0b2350]">{d.openShift.cashierName}</span>
                  <span className="num text-slate-500">
                    بدأت {new Date(d.openShift.openedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    نقدية بداية {money(d.openShift.startingCash)}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[13px] font-bold text-amber-700">لا توجد وردية مفتوحة</div>
              )}
            </div>

            {/* الأكثر مبيعاً */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 bg-[#f7faff] px-3 py-2 text-[13px] font-black text-[#0b2350]">
                الأكثر مبيعاً (هذا الشهر)
              </div>
              <div className="divide-y divide-slate-100">
                {d.topProducts.length ? (
                  d.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[12.5px] font-bold">
                      <span className="truncate text-[#0b2350]">{p.name}</span>
                      <span className="num shrink-0 text-slate-600">
                        {p.qty} × · {money(p.revenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-[12.5px] font-bold text-slate-500">لا توجد مبيعات بعد</div>
                )}
              </div>
            </div>

            {/* آخر الفواتير */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-1.5 border-b border-slate-200 bg-[#f7faff] px-3 py-2 text-[13px] font-black text-[#0b2350]">
                <Receipt className="h-4 w-4" /> آخر الفواتير
              </div>
              <div className="divide-y divide-slate-100">
                {d.recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-1.5 text-[12.5px] font-bold">
                    <span className="num text-slate-500">#{r.number}</span>
                    <span className="mx-2 flex-1 truncate text-[#0b2350]">{r.partyName || "عميل نقدي"}</span>
                    <span className="num shrink-0 font-black">{money(r.total)}</span>
                  </div>
                ))}
                {!d.recent.length && (
                  <div className="py-4 text-center text-[12.5px] font-bold text-slate-500">لا توجد فواتير</div>
                )}
              </div>
            </div>

            <div className="pb-2 text-center text-[10.5px] font-bold text-slate-400">
              اسحب من الأسفل للتحديث · تُحدّث تلقائياً كل دقيقة
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 py-1.5">
      <div className="text-[10.5px] font-bold text-blue-200">{label}</div>
      <div className="num text-[13.5px] font-black">{value}</div>
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-1 text-[11.5px] font-bold text-slate-500">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <div className="num mt-0.5 text-[16px] font-black text-[#0b2350]">{value}</div>
    </div>
  );
}

function Alert({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: "amber" | "red" }) {
  const cls =
    tone === "amber" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-red-50 text-red-800 ring-red-200";
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-black ring-1 ${cls}`}>
      <TriangleAlert className="h-4 w-4 shrink-0" />
      {icon}
      <span>{text}</span>
    </div>
  );
}
