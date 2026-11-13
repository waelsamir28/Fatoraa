"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Eye, FilePlus2, Printer, RefreshCw, Search, Trash2 } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconBox, IconSales } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { paymentMethodLabel, paymentTypeLabel } from "@/lib/constants";
import { daysAgoInput, fmt, fmtDate, fmtTime, monthStartInput, rangeToISO, todayInput } from "@/lib/format";
import type { Invoice, InvoiceType } from "@/lib/types";

interface ListResp {
  items: Invoice[];
  totals: { count: number; total: number; paid: number; tax: number; discount: number; profit: number };
}

const CFG: Record<InvoiceType, { title: string; partyLabel: string; editorHref: string; newLabel: string }> = {
  sale: { title: "سجل فواتير المبيعات", partyLabel: "العميل", editorHref: "/sales", newLabel: "فاتورة مبيعات جديدة" },
  purchase: { title: "سجل فواتير المشتريات", partyLabel: "المورد", editorHref: "/purchases", newLabel: "فاتورة مشتريات جديدة" },
  sale_return: { title: "سجل مرتجعات المبيعات", partyLabel: "العميل", editorHref: "/returns/sales", newLabel: "مرتجع مبيعات جديد" },
  purchase_return: { title: "سجل مرتجعات المشتريات", partyLabel: "المورد", editorHref: "/returns/purchases", newLabel: "مرتجع مشتريات جديد" },
};

export function InvoiceList({ type }: { type: InvoiceType }) {
  const cfg = CFG[type];
  const router = useRouter();
  const { confirm, toast } = useDesktop();
  const [from, setFrom] = useState(monthStartInput);
  const [to, setTo] = useState(todayInput);
  const [q, setQ] = useState("");
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<number | null>(null);

  const load = useCallback(
    async (f: string, t: string, query: string) => {
      setLoading(true);
      try {
        const r = rangeToISO(f, t);
        const res = await api<ListResp>(
          `/api/invoices?type=${type}&from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&q=${encodeURIComponent(query)}`,
        );
        setData(res);
      } catch (e) {
        toast(errMsg(e), "error");
      } finally {
        setLoading(false);
      }
    },
    [type, toast],
  );

  useEffect(() => {
    void load(monthStartInput(), todayInput(), "");
  }, [load]);

  const quick = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    void load(f, t, q);
  };
  const open = (id: number) => router.push(`${cfg.editorHref}?id=${id}`);
  const print = (id: number) => window.open(`/print/${id}?auto=1`, "_blank");
  const del = async (inv: Invoice) => {
    const ok = await confirm(`هل تريد حذف الفاتورة رقم ${inv.number}؟\nسيتم عكس تأثيرها على المخزون والأرصدة.`, {
      title: "حذف فاتورة",
      danger: true,
      okText: "حذف",
      cancelText: "إلغاء",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await api(`/api/invoices/${inv.id}`, { method: "DELETE" });
      toast(`تم حذف الفاتورة رقم ${inv.number}`);
      void load(from, to, q);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const t = data?.totals;

  return (
    <Window
      title={cfg.title}
      icon={type === "sale" ? <IconSales className="h-9 w-9" /> : <IconBox className="h-9 w-9" />}
      statusBar={
        <>
          <span>عدد الفواتير: {t?.count ?? 0}</span>
          <span className="sep" />
          <span>الإجمالي: {fmt(t?.total)} ج.م</span>
          <span className="sep" />
          <span>اضغط مرتين على الفاتورة لفتحها</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "جاهز"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="flex shrink-0 items-end gap-1 border-b-2 border-[#1a63db] px-2">
          {(
            [
              ["sale", "/sales/list", "المبيعات"],
              ["purchase", "/purchases/list", "المشتريات"],
              ["sale_return", "/returns/sales/list", "مرتجع المبيعات"],
              ["purchase_return", "/returns/purchases/list", "مرتجع المشتريات"],
            ] as const
          ).map(([t, href, label]) => (
            <Link
              key={t}
              href={href}
              className={`rounded-t-lg border border-b-0 px-5 py-1.5 text-[15px] font-black ${
                t === type ? "border-[#1a63db] bg-gradient-to-b from-[#3d8af0] to-[#0d55cf] text-white" : "border-[#b4c4dc] bg-gradient-to-b from-white to-[#e2e9f4] text-[#0b2350]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="panel flex flex-wrap items-end gap-3 p-3">
          <label className="block">
            <span className="form-label">من تاريخ</span>
            <input type="date" className="win-input num w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">إلى تاريخ</span>
            <input type="date" className="win-input num w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">بحث (رقم الفاتورة / {cfg.partyLabel})</span>
            <input
              className="win-input w-[240px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(from, to, q);
              }}
            />
          </label>
          <button type="button" className="btn btn-blue h-[34px] px-5" onClick={() => void load(from, to, q)}>
            <Search className="h-4 w-4" />
            عرض
          </button>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(todayInput(), todayInput())}>اليوم</button>
            <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(daysAgoInput(6), todayInput())}>آخر 7 أيام</button>
            <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(monthStartInput(), todayInput())}>هذا الشهر</button>
            <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={() => quick(daysAgoInput(365), todayInput())}>آخر سنة</button>
          </div>
          <div className="ms-auto flex gap-2">
            <button type="button" className="btn h-[34px] px-3" onClick={() => void load(from, to, q)} title="تحديث">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" className="btn btn-green h-[34px] px-4" onClick={() => router.push(cfg.editorHref)}>
              <FilePlus2 className="h-4 w-4" />
              {cfg.newLabel}
            </button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-5 gap-3">
          <Kpi label="عدد الفواتير" value={t?.count ?? 0} color="navy" />
          <Kpi label="إجمالي الفواتير" value={fmt(t?.total)} color="blue" sub="ج.م" />
          <Kpi label="المدفوع" value={fmt(t?.paid)} color="green" sub="ج.م" />
          <Kpi label="المتبقي (آجل)" value={fmt((t?.total ?? 0) - (t?.paid ?? 0))} color="red" sub="ج.م" />
          {type === "sale" ? (
            <Kpi label="صافي الربح" value={fmt(t?.profit)} color="gold" sub="بعد الخصم وقبل الضريبة" />
          ) : (
            <Kpi label="الضريبة" value={fmt(t?.tax)} color="orange" sub="ج.م" />
          )}
        </div>

        <div className="panel min-h-0 flex-1 overflow-auto p-0">
          <table className="dgrid text-center text-[14px]">
            <thead>
              <tr>
                <th>م</th>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>الوقت</th>
                <th className="text-right">{cfg.partyLabel}</th>
                <th>نوع الدفع</th>
                <th>طريقة الدفع</th>
                <th>الأصناف</th>
                <th>الخصم</th>
                <th>الضريبة</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المستخدم</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((inv, i) => {
                const s = sel === inv.id;
                return (
                  <tr key={inv.id} className={`clickable ${s ? "sel" : ""}`} onClick={() => setSel(inv.id)} onDoubleClick={() => open(inv.id)}>
                    <td className="num">{i + 1}</td>
                    <td className={`num font-black ${s ? "" : "text-[#d0190f]"}`}>{inv.number}</td>
                    <td className="num">{fmtDate(inv.date)}</td>
                    <td className="num">{fmtTime(inv.date)}</td>
                    <td className="max-w-[220px] truncate text-right">
                      <span className="inline-block rounded px-2 py-0.5 bg-[#fffbeb] border border-amber-200 text-amber-950 font-black shadow-2xs">
                        {inv.partyName}
                      </span>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-black ${inv.paymentType === "credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                        {paymentTypeLabel(inv.paymentType)}
                      </span>
                    </td>
                    <td>{paymentMethodLabel(inv.paymentMethod)}</td>
                    <td className="num">{inv.itemsCount ?? 0}</td>
                    <td className="num">{fmt(inv.discount)}</td>
                    <td className="num">{fmt(inv.tax)}</td>
                    <td className="num font-black">{fmt(inv.total)}</td>
                    <td className="num">{fmt(inv.paid)}</td>
                    <td>{inv.userName}</td>
                    <td className="p-1">
                      <div className="flex justify-center gap-1">
                        <button type="button" className="btn h-7 w-8 p-0" title="فتح" onClick={(e) => { e.stopPropagation(); open(inv.id); }}>
                          <Eye className="h-4 w-4 text-blue-700" />
                        </button>
                        <button type="button" className="btn h-7 w-8 p-0" title="طباعة" onClick={(e) => { e.stopPropagation(); print(inv.id); }}>
                          <Printer className="h-4 w-4 text-slate-700" />
                        </button>
                        <button type="button" className="btn h-7 w-8 p-0" title="حذف" onClick={(e) => { e.stopPropagation(); void del(inv); }}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data && data.items.length === 0 && (
                <tr className="empty">
                  <td colSpan={14} className="py-10 text-center text-slate-500">
                    لا توجد فواتير في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
            {data && data.items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={8} className="text-right">الإجمالي ({t?.count} فاتورة)</td>
                  <td className="num">{fmt(t?.discount)}</td>
                  <td className="num">{fmt(t?.tax)}</td>
                  <td className="num text-blue-800">{fmt(t?.total)}</td>
                  <td className="num text-green-700">{fmt(t?.paid)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </Window>
  );
}
