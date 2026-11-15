"use client";

import { useEffect, useState } from "react";
import { InvoiceSheet } from "./InvoiceSheet";
import { Printer, X } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { INVOICE_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { DEFAULT_LAYOUT, TEMPLATE_PRESETS, parseLayout, type InvoiceLayout } from "@/lib/invoiceLayout";
import type { Invoice, Settings } from "@/lib/types";

export function PrintView({
  id,
  auto,
  templateOverride,
}: {
  id: number;
  auto: boolean;
  templateOverride?: string;
}) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<InvoiceLayout>(DEFAULT_LAYOUT);
  const [currentTemplate, setCurrentTemplate] = useState<string>("template-modern-a5");

  useEffect(() => {
    Promise.all([api<Invoice>(`/api/invoices/${id}`), api<Settings>("/api/settings")])
      .then(([i, st]) => {
        setInv(i);
        setS(st);
        const saved = parseLayout(st.invoiceLayout);
        setLayout(saved);
        setCurrentTemplate(templateOverride || i.template || st.invoiceTemplate || saved.templateKey || "template-modern-a5");
        document.title = `${INVOICE_LABELS[i.type] || "فاتورة"} رقم ${i.number}`;
      })
      .catch((e) => setError(errMsg(e)));
  }, [id, templateOverride]);

  useEffect(() => {
    if (!inv || !s || !auto) return;
    let cancelled = false;
    const go = () => {
      if (!cancelled) window.print();
    };
    const t = setTimeout(() => {
      if (document.fonts?.ready) document.fonts.ready.then(go).catch(go);
      else go();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [inv, s, auto]);

  if (error) {
    return <div className="grid min-h-screen place-items-center bg-[#e9edf3] text-[20px] font-bold text-red-600">{error}</div>;
  }
  if (!inv || !s) {
    return <div className="grid min-h-screen place-items-center bg-[#e9edf3] text-[18px] font-bold text-slate-600">جاري تحميل الفاتورة...</div>;
  }

  return (
    <div className="min-h-screen bg-[#dce4ef] py-4 text-[#0f172a] print:bg-white print:py-0">
      {/* شريط أدوات الطباعة والقوالب */}
      <div className="no-print mx-auto mb-3 flex max-w-[860px] flex-wrap items-center justify-between gap-2 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-blue h-9 px-4 text-[14px] font-black" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            طباعة الفاتورة
          </button>

          {/* محدد القوالب */}
          <select
            className="win-input h-9 text-[13px] font-bold"
            value={currentTemplate}
            onChange={(e) => {
              const key = e.target.value;
              setCurrentTemplate(key);
              const preset = TEMPLATE_PRESETS.find((t) => t.key === key);
              if (preset) setLayout((p) => ({ ...p, ...preset.layout, templateKey: key }));
            }}
          >
            {TEMPLATE_PRESETS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <span className="rounded bg-white/70 px-2 py-1 text-[12px] font-bold text-slate-600">
            {fmtDate(inv.date)} — {INVOICE_LABELS[inv.type]} #{inv.number}
          </span>
        </div>

        <button
          type="button"
          className="btn h-9 px-4 text-[13px] font-bold"
          onClick={() => {
            window.close();
            setTimeout(() => history.back(), 150);
          }}
        >
          <X className="h-4 w-4" />
          إغلاق
        </button>
      </div>

      <div className="print-sheet-wrap">
        <InvoiceSheet inv={inv} s={s} layout={layout} />
      </div>
    </div>
  );
}
