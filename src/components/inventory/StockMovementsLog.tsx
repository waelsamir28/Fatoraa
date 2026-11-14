"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Boxes, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, fmtQty, fmtTime } from "@/lib/format";

interface Movement {
  id: number;
  productId: number;
  productName: string;
  kind: string;
  qty: number;
  balanceAfter: number;
  refId: number | null;
  refLabel: string;
  notes: string;
  userName: string;
  createdAt: string;
}

interface Resp {
  items: Movement[];
  totals: { count: number; inQty: number; outQty: number };
}

const KIND_LABEL: Record<string, string> = {
  sale: "بيع",
  purchase: "شراء",
  sale_return: "مرتجع بيع",
  purchase_return: "مرتجع شراء",
  adjust: "تسوية / جرد",
  sale_undo: "إلغاء بيع",
  purchase_undo: "إلغاء شراء",
  sale_return_undo: "إلغاء مرتجع بيع",
  purchase_return_undo: "إلغاء مرتجع شراء",
};

/**
 * سجل حركات المخزون: كل زيادة أو نقص في رصيد أي صنف، مع المصدر والسبب
 * واسم المستخدم — يخليك تعرف رصيد كل صنف اتغيّر ليه وإمتى.
 */
export function StockMovementsLog() {
  const { toast } = useDesktop();
  const [data, setData] = useState<Resp | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const res = await api<Resp>(
          `/api/stock-movements?q=${encodeURIComponent(query)}&limit=300`,
        );
        setData(res);
      } catch (e) {
        toast(errMsg(e), "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  return (
    <Window
      title="سجل حركات المخزون"
      icon={<Boxes className="h-8 w-8 text-blue-700" />}
      statusBar={
        <>
          <span>عدد الحركات: {data?.totals.count ?? 0}</span>
          <span className="sep" />
          <span>إجمالي الداخل: {fmtQty(data?.totals.inQty ?? 0)}</span>
          <span className="sep" />
          <span>إجمالي الخارج: {fmtQty(data?.totals.outQty ?? 0)}</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "جاهز"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="عدد الحركات" value={data?.totals.count ?? 0} color="navy" />
          <Kpi label="كميات داخلة" value={fmtQty(data?.totals.inQty ?? 0)} color="green" sub="قطعة" />
          <Kpi label="كميات خارجة" value={fmtQty(data?.totals.outQty ?? 0)} color="red" sub="قطعة" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="win-input w-full pr-8"
              placeholder="ابحث باسم الصنف أو رقم الفاتورة..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q);
              }}
            />
          </div>
          <button type="button" className="btn btn-blue h-9 px-3" onClick={() => void load(q)}>
            <Search className="h-4 w-4" />
            بحث
          </button>
          <button type="button" className="btn h-9 px-3" onClick={() => void load(q)} title="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="panel min-h-0 flex-1 overflow-auto p-0 shadow-inner">
          <table className="dgrid text-center text-[13px]">
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th className="text-right">الصنف</th>
                <th className="w-24">نوع الحركة</th>
                <th className="w-24">الكمية</th>
                <th className="w-24">الرصيد بعدها</th>
                <th>المرجع</th>
                <th className="text-right">ملاحظات</th>
                <th className="w-28">المستخدم</th>
                <th className="w-36">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((m) => {
                const isIn = m.qty > 0;
                return (
                  <tr key={m.id}>
                    <td className="num font-bold">{m.id}</td>
                    <td className="max-w-[240px] truncate text-right font-extrabold text-blue-900">
                      {m.productName}
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                          m.kind === "adjust"
                            ? "bg-amber-100 text-amber-800"
                            : isIn
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {KIND_LABEL[m.kind] ?? m.kind}
                      </span>
                    </td>
                    <td className={`num font-black ${isIn ? "text-emerald-700" : "text-red-600"}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {isIn ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        {fmtQty(Math.abs(m.qty))}
                      </span>
                    </td>
                    <td className="num font-bold text-slate-700">{fmtQty(m.balanceAfter)}</td>
                    <td className="num text-slate-600">{m.refLabel || "—"}</td>
                    <td className="max-w-[180px] truncate text-right text-slate-600">{m.notes || "—"}</td>
                    <td className="font-bold text-slate-700">{m.userName || "—"}</td>
                    <td className="num text-slate-600">
                      {fmtDate(m.createdAt)} {fmtTime(m.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {data && data.items.length === 0 && (
                <tr className="empty">
                  <td colSpan={9} className="py-12 text-center font-bold text-slate-500">
                    <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    لا توجد حركات مخزون مسجّلة بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-blue-900">
          كل تغيير في رصيد أي صنف بيتسجّل هنا تلقائياً: الفواتير، المرتجعات، والتسويات اليدوية (الجرد).
          لو الرصيد مش مطابق، ابحث باسم الصنف هنا وهتلاقي سبب كل فرق.
        </div>
      </div>
    </Window>
  );
}
