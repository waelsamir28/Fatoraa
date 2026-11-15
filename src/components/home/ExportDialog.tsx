"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Printer, Table2 } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { api, errMsg } from "@/lib/client";
import { useDesktop } from "@/components/win/DesktopProvider";
import { fmtDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

/**
 * تصدير سريع (F9 في الشاشة الرئيسية):
 * - نسخة CSV تفتح في إكسل (جداول الفواتير / الأصناف)
 * - نسخة JSON احتياطية
 * - ملف HTML للطباعة بـ A4 (يكفي أرشيف ورق للفترة)
 */
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useDesktop();
  const [busy, setBusy] = useState("");
  const [count, setCount] = useState(30);

  const stamp = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const download = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const csvCell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportInvoices = async () => {
    setBusy("invoices");
    try {
      const r = await api<{ items: Invoice[] }>(`/api/invoices?type=sale&limit=${count}`);
      if (!r.items.length) {
        toast("لا توجد فواتير للتصدير", "info");
        return;
      }
      const rows = [
        ["رقم الفاتورة", "التاريخ", "العميل", "الإجمالي", "المدفوع", "المتبقي", "طريقة الدفع", "الحالة"],
        ...r.items.map((i) => [
          i.number,
          fmtDate(i.date),
          i.partyName,
          i.total,
          i.paid,
          Math.max(0, i.total - i.paid),
          i.paymentType === "cash" ? "نقدي" : "آجل",
          i.paymentType === "cash" ? "مسددة" : Math.max(0, i.total - i.paid) > 0 ? "باقي" : "مسددة",
        ]),
      ];
      const csv = "\uFEFF" + rows.map((r2) => r2.map(csvCell).join(",")).join("\r\n");
      download(`فواتير-${stamp}.csv`, csv, "text/csv;charset=utf-8");
      toast(`تم تصدير ${r.items.length} فاتورة — افتح الملف بإكسل ✅`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  const exportProducts = async () => {
    setBusy("products");
    try {
      const r = await api<{ items: Array<Record<string, unknown>> }>("/api/products?limit=2000");
      if (!r.items.length) {
        toast("لا توجد أصناف للتصدير", "info");
        return;
      }
      const rows = [
        ["الكود", "الاسم", "المجموعة", "الوحدة", "سعر التكلفة", "سعر البيع", "سعر الجملة", "المخزون", "حد التنبيه"],
        ...r.items.map((p) => [
          p.code,
          p.name,
          p.category,
          p.unit,
          p.costPrice,
          p.salePrice,
          p.wholesalePrice,
          p.stock,
          p.minStock,
        ]),
      ];
      const csv = "\uFEFF" + rows.map((r2) => r2.map(csvCell).join(",")).join("\r\n");
      download(`أصناف-${stamp}.csv`, csv, "text/csv;charset=utf-8");
      toast(`تم تصدير ${r.items.length} صنف — افتح الملف بإكسل ✅`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  const exportPrint = async () => {
    setBusy("print");
    try {
      const r = await api<{ items: Invoice[] }>(`/api/invoices?type=sale&limit=${count}`);
      if (!r.items.length) {
        toast("لا توجد فواتير للطباعة", "info");
        return;
      }
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>فواتير ${stamp}</title>
<style>
body{font-family:"Segoe UI",Tahoma,sans-serif;padding:16px;color:#0f2942}
h1{font-size:18px;margin:0 0 10px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #9fb4d2;padding:4px 6px;text-align:center}
th{background:#0f2942;color:#fff}
tr:nth-child(even) td{background:#f4f8fd}
@media print{ @page{size:A4 landscape;margin:8mm} }
</style></head><body>
<h1>سجل فواتير المبيعات — ${stamp}</h1>
<table><thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>
${r.items
  .map(
    (i) =>
      `<tr><td>${i.number}</td><td>${fmtDate(i.date)}</td><td>${i.partyName}</td><td>${i.total}</td><td>${i.paid}</td><td>${Math.max(0, i.total - i.paid)}</td></tr>`,
  )
  .join("")}
</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        download(`فواتير-${stamp}.html`, html, "text/html;charset=utf-8");
      }
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <Dialog title="تصدير سريع" onClose={onClose} width={560}>
      <div className="space-y-2.5" dir="rtl">
        <div className="flex items-center gap-2 rounded-lg bg-[#eef4fa] px-3 py-2 text-[12px] font-bold text-[#0f2942]">
          <Download className="h-4 w-4 text-[#2fb3a6]" />
          صدّر بياناتك بضغطة — الملفات تفتح مباشرة على إكسل والطابعة بدون أي إعدادات.
        </div>

        <label className="flex items-center justify-between rounded-md border border-[#c9d8ee] bg-white px-3 py-1.5">
          <span className="text-[12.5px] font-black text-[#0f2942]">عدد الفواتير المصدَّرة (الأحدث أولاً)</span>
          <input
            type="number"
            min={5}
            max={2000}
            value={count}
            onChange={(e) => setCount(Math.min(2000, Math.max(5, Number(e.target.value) || 30)))}
            className="win-input num w-20 text-center font-black"
          />
        </label>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => void exportInvoices()}
            disabled={!!busy}
            className="flex items-center gap-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-right hover:border-emerald-400"
          >
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-700" />
            <span className="flex-1">
              <span className="block text-[13.5px] font-black text-emerald-900">سجل الفواتير → إكسل (CSV)</span>
              <span className="block text-[11px] font-bold text-emerald-800">رقم، تاريخ، عميل، إجمالي، مدفوع، متبقي</span>
            </span>
            {busy === "invoices" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => void exportProducts()}
            disabled={!!busy}
            className="flex items-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-right hover:border-blue-400"
          >
            <Table2 className="h-6 w-6 shrink-0 text-blue-700" />
            <span className="flex-1">
              <span className="block text-[13.5px] font-black text-blue-900">كل الأصناف → إكسل (CSV)</span>
              <span className="block text-[11px] font-bold text-blue-800">كود، اسم، مجموعة، تكلفة، بيع، جملة، مخزون</span>
            </span>
            {busy === "products" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => void exportPrint()}
            disabled={!!busy}
            className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-right hover:border-slate-400"
          >
            <FileText className="h-6 w-6 shrink-0 text-slate-700" />
            <span className="flex-1">
              <span className="block text-[13.5px] font-black text-slate-900">طباعة سجل الفواتير (A4 عرضي)</span>
              <span className="block text-[11px] font-bold text-slate-700">يفتح نافذة طباعة جاهزة أو يُحمَّل كـ PDF</span>
            </span>
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn h-9 px-4 text-[13px] font-black" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </Dialog>
  );
}
