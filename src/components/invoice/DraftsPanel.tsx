"use client";

import { useCallback, useEffect, useState } from "react";
import { FileClock, Loader2, PlayCircle, RefreshCw, Trash2, X } from "lucide-react";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate } from "@/lib/format";
import type { Invoice, InvoiceType } from "@/lib/types";

/** لوحة الفواتير المعلقة (المسودات) — استكمال أو حذف */
export function DraftsPanel({
  type,
  onResume,
  onClose,
}: {
  type: InvoiceType;
  /** استكمال مسودة داخل شاشة الفاتورة */
  onResume: (draft: Invoice) => void;
  onClose: () => void;
}) {
  const { toast, confirm } = useDesktop();
  const [items, setItems] = useState<Invoice[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: Invoice[] }>(`/api/invoices?type=${type}&drafts=1&limit=200`)
      .then((r) => setItems(r.items))
      .catch((e) => {
        toast(errMsg(e), "error");
        setItems([]);
      });
  }, [toast, type]);

  useEffect(load, [load]);

  const remove = async (d: Invoice) => {
    const ok = await confirm(
      `سيتم حذف المسودة رقم ${d.number} نهائياً (لم تُخصم من المخزون ولن تتأثر أي أرصدة).\nهل تريد المتابعة؟`,
      { title: "حذف مسودة" },
    );
    if (!ok) return;
    setBusyId(d.id);
    try {
      await api(`/api/invoices/${d.id}`, { method: "DELETE", json: { reason: "حذف مسودة معلقة" } });
      toast("تم حذف المسودة");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const commit = async (d: Invoice) => {
    const ok = await confirm(
      `اعتماد المسودة رقم ${d.number} كفاتورة فعلية؟\nسيتم خصم الأصناف من المخزون وتحديث رصيد ${d.partyName}.`,
      { title: "اعتماد المسودة" },
    );
    if (!ok) return;
    setBusyId(d.id);
    try {
      await api(`/api/invoices/${d.id}`, { method: "POST", json: { action: "commit" } });
      toast(`تم اعتماد الفاتورة رقم ${d.number} بنجاح ✓`);
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 p-4 pt-10">
      <div className="flex max-h-[86vh] w-full max-w-[900px] flex-col overflow-hidden rounded-xl border-2 border-[#0f2942] bg-white shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 bg-[#0067c0] px-4 py-2.5 text-white">
          <FileClock className="h-5 w-5 text-[#f5c518]" />
          <div className="flex flex-col">
            <span className="text-[16px] font-black">الفواتير المعلقة (المسودات)</span>
            <span className="text-[11px] font-bold text-blue-200">
              محفوظة بدون أي تأثير على المخزون أو الأرصدة — استكملها أو اعتمدها أو احذفها
            </span>
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <button type="button" className="btn h-8 px-3 text-[12.5px] font-black" onClick={load} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" className="btn btn-red h-8 px-3 text-[12.5px] font-black" onClick={onClose}>
              <X className="h-4 w-4" />
              إغلاق
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {items === null ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[14px] font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> جاري التحميل...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <FileClock className="h-12 w-12 text-slate-300" />
              <div className="text-[15px] font-black text-slate-600">لا توجد فواتير معلقة</div>
              <div className="text-[12px] font-bold text-slate-400">
                اضغط «تعليق» في شاشة الفاتورة لحفظ فاتورة غير مكتملة واستكمالها لاحقاً
              </div>
            </div>
          ) : (
            <table className="dgrid w-full text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-[90px]">الرقم</th>
                  <th>العميل</th>
                  <th className="w-[110px]">التاريخ</th>
                  <th className="w-[70px]">الأصناف</th>
                  <th className="w-[120px]">الإجمالي</th>
                  <th className="w-[230px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="num text-center font-black text-[#0f2942]">{d.number}</td>
                    <td className="font-bold">{d.partyName}</td>
                    <td className="num text-center">{fmtDate(d.date)}</td>
                    <td className="num text-center">{d.itemsCount ?? d.items?.length ?? 0}</td>
                    <td className="num text-center font-black">{fmt(d.total)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="btn btn-blue h-7 px-2 text-[12px] font-black"
                          onClick={() => onResume(d)}
                          disabled={busyId === d.id}
                          title="استكمال الفاتورة داخل الشاشة"
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> استكمال
                        </button>
                        <button
                          type="button"
                          className="btn btn-green h-7 px-2 text-[12px] font-black"
                          onClick={() => void commit(d)}
                          disabled={busyId === d.id}
                          title="اعتماد كفاتورة فعلية"
                        >
                          اعتماد
                        </button>
                        <button
                          type="button"
                          className="btn btn-red h-7 px-2 text-[12px] font-black"
                          onClick={() => void remove(d)}
                          disabled={busyId === d.id}
                          title="حذف المسودة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0 border-t border-[#c9d8ee] bg-[#eef4fa] px-3 py-1.5 text-[11.5px] font-bold text-slate-600">
          عدد المسودات: {items?.length ?? 0} — المسودة لا تُحسب في التقارير ولا تخصم من المخزون حتى تُعتمد
        </div>
      </div>
    </div>
  );
}
