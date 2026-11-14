"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw, RotateCcw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, fmtTime } from "@/lib/format";
import type { Invoice } from "@/lib/types";

type DeletedInvoice = Invoice & {
  deletedAt: string | null;
  deletedBy: string;
  deleteReason: string;
};

interface Resp {
  items: DeletedInvoice[];
  totals: { count: number; total: number };
}

/**
 * سجل المحذوفات: كل فواتير اتحذفت (حذف آمن) مع سبب الحذف واسم المستخدم.
 * من هنا يمكن استرجاع أي فاتورة بضغطة — بيرجع تأثيرها على المخزون والأرصدة.
 */
export function DeletedInvoicesLog() {
  const { toast, confirm } = useDesktop();
  const [data, setData] = useState<Resp | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const res = await api<Resp>(`/api/invoices/deleted?q=${encodeURIComponent(query)}`);
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

  const restore = async (inv: DeletedInvoice) => {
    const ok = await confirm(
      `هل تريد استرجاع الفاتورة رقم ${inv.number}؟\nهيتم إرجاع تأثيرها على المخزون ورصيد العميل كما كانت.`,
      { title: "استرجاع فاتورة", okText: "استرجاع", cancelText: "إلغاء", kind: "question" },
    );
    if (!ok) return;
    setBusyId(inv.id);
    try {
      await api(`/api/invoices/${inv.id}`, { method: "POST", json: { action: "restore" } });
      toast(`تم استرجاع الفاتورة رقم ${inv.number} بنجاح`);
      void load(q);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Window
      title="سجل الفواتير المحذوفة (حذف آمن)"
      icon={<ShieldAlert className="h-8 w-8 text-red-600" />}
      statusBar={
        <>
          <span>عدد المحذوف: {data?.totals.count ?? 0}</span>
          <span className="sep" />
          <span>إجمالي القيمة: {fmt(data?.totals.total)} ج.م</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "جاهز"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="فواتير محذوفة" value={data?.totals.count ?? 0} color="red" />
          <Kpi label="قيمة الفواتير المحذوفة" value={fmt(data?.totals.total ?? 0)} color="orange" sub="ج.م" />
          <Kpi label="الحالة" value="قابلة للاسترجاع" color="green" sub="بياناتها كاملة" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="win-input w-full pr-8"
              placeholder="ابحث باسم العميل أو رقم الفاتورة..."
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
                <th className="w-16">رقم</th>
                <th>النوع</th>
                <th className="text-right">العميل / المورد</th>
                <th>تاريخ الفاتورة</th>
                <th>الإجمالي</th>
                <th>تاريخ الحذف</th>
                <th>حذفها</th>
                <th className="text-right">سبب الحذف</th>
                <th className="w-28">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((inv) => (
                <tr key={inv.id}>
                  <td className="num font-black">#{inv.number}</td>
                  <td>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700">
                      {TYPE_LABEL[inv.type] ?? inv.type}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-right font-extrabold text-blue-900">{inv.partyName}</td>
                  <td className="num">{fmtDate(inv.date)}</td>
                  <td className="num font-black text-red-600">{fmt(inv.total)}</td>
                  <td className="num">
                    {inv.deletedAt ? `${fmtDate(inv.deletedAt)} ${fmtTime(inv.deletedAt)}` : "-"}
                  </td>
                  <td className="font-bold text-slate-700">{inv.deletedBy || "—"}</td>
                  <td className="max-w-[220px] truncate text-right text-slate-600">{inv.deleteReason || "—"}</td>
                  <td className="p-1">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        className="btn h-7 w-8 p-0"
                        title="استرجاع الفاتورة"
                        disabled={busyId === inv.id}
                        onClick={() => void restore(inv)}
                      >
                        <RotateCcw className={`h-4 w-4 text-green-600 ${busyId === inv.id ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        type="button"
                        className="btn h-7 w-8 p-0"
                        title="عرض الفاتورة"
                        onClick={() => window.open(`/print/${inv.id}?auto=0`, "_blank")}
                      >
                        <Eye className="h-4 w-4 text-blue-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr className="empty">
                  <td colSpan={9} className="py-12 text-center font-bold text-slate-500">
                    <Trash2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    لا توجد فواتير محذوفة — كل الفواتير موجودة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-900">
          <b>ملاحظة:</b> الفواتير هنا لم تُمسح من قاعدة البيانات — بياناتها وأصنافها كاملة. الاسترجاع يرجّع
          تأثيرها على المخزون وأرصدة العملاء كما كانت بالظبط.
        </div>
      </div>
    </Window>
  );
}

const TYPE_LABEL: Record<string, string> = {
  sale: "مبيعات",
  purchase: "مشتريات",
  sale_return: "مرتجع مبيعات",
  purchase_return: "مرتجع مشتريات",
};
