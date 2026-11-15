"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { fmt } from "@/lib/format";
import { resolveLogo } from "@/lib/logo";
import type { Settings } from "@/lib/types";

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
  lowStock: { id: number; name: string; stock: number; minStock: number; unit?: string }[];
}

/** تقرير الأرباح الشامل — نسخة للطباعة/PDF */
export function ReportPrint({
  data,
  settings,
  from,
  to,
  auto,
}: {
  data: ReportData;
  settings: Settings | null;
  from: string;
  to: string;
  auto?: boolean;
}) {
  const [printed, setPrinted] = useState(false);
  useEffect(() => {
    if (!auto || printed) return;
    const t = setTimeout(() => {
      setPrinted(true);
      window.print();
    }, 500);
    return () => clearTimeout(t);
  }, [auto, printed]);

  const dayTotals = new Map<string, { sale: number; purchase: number }>();
  for (const d of data.daily || []) {
    const cur = dayTotals.get(d.day) || { sale: 0, purchase: 0 };
    if (d.type === "sale") cur.sale += d.total;
    if (d.type === "purchase") cur.purchase += d.total;
    dayTotals.set(d.day, cur);
  }
  const days = [...dayTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const row = (label: string, value: string, strong = false) => (
    <tr key={label} className={strong ? "font-black" : ""}>
      <td>{label}</td>
      <td className="num">{value}</td>
    </tr>
  );

  return (
    <div className="report-print" dir="rtl">
      <style>{`
        @page { size: A4; margin: 10mm; }
        .report-print { font-family: "Cairo", "Segoe UI", sans-serif; color: #111; font-size: 12px; }
        .report-print h1 { font-size: 19px; margin: 0; }
        .report-print .head { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #1e4b7a; padding-bottom: 8px; margin-bottom: 10px; }
        .report-print .head img { height: 46px; width: 46px; object-fit: contain; }
        .report-print .meta { margin-inline-start: auto; text-align: left; font-size: 11px; line-height: 1.6; }
        .report-print h2 { font-size: 13px; margin: 12px 0 4px; background: #eef3fa; border: 1px solid #c9d8ee; padding: 3px 7px; border-radius: 4px; }
        .report-print table { width: 100%; border-collapse: collapse; }
        .report-print td, .report-print th { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: right; }
        .report-print th { background: #f1f5f9; font-weight: 800; font-size: 11.5px; }
        .report-print .num { font-variant-numeric: tabular-nums; }
        .report-print .totals td { background: #f8fafc; }
        .report-print .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px; }
        .report-print .kpi div { border: 1px solid #c9d8ee; border-radius: 6px; padding: 5px 7px; background: #f7fbff; }
        .report-print .kpi b { display: block; font-size: 14px; }
        .report-print .kpi span { font-size: 10.5px; color: #475569; }
        .report-print .foot { margin-top: 14px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 10.5px; color: #475569; display: flex; justify-content: space-between; }
        .report-print .noprint button { border: 0; background: #1e4b7a; color: #fff; padding: 7px 14px; border-radius: 6px; font-family: inherit; font-weight: 800; cursor: pointer; }
        @media print { .report-print .noprint { display: none !important; } }
      `}</style>

      <div className="head">
        <img src={resolveLogo(settings?.customLogoUrl)} alt="" />
        <div>
          <h1>{settings?.storeName || "FATORA"}</h1>
          <div style={{ fontSize: 11 }}>
            تقرير الأرباح الشامل — من {from} إلى {to}
          </div>
        </div>
        <div className="meta">
          {settings?.phone ? <div dir="ltr">{settings.phone}</div> : null}
          <div>تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</div>
        </div>
      </div>

      <div className="noprint" style={{ marginBottom: 8, textAlign: "left" }}>
        <button type="button" onClick={() => window.print()}>
          طباعة / حفظ PDF
        </button>
      </div>

      <div className="kpi">
        <div>
          <span>إجمالي المبيعات</span>
          <b className="num">{fmt(data.sales.total)}</b>
        </div>
        <div>
          <span>صافي الربح</span>
          <b className="num">{fmt(data.netProfit)}</b>
        </div>
        <div>
          <span>إجمالي المشتريات</span>
          <b className="num">{fmt(data.purchases.total)}</b>
        </div>
        <div>
          <span>المصروفات</span>
          <b className="num">{fmt(data.expenses)}</b>
        </div>
      </div>

      <h2>ملخص الفترة</h2>
      <table className="totals">
        <tbody>
          {row("عدد فواتير البيع", String(data.sales.count || 0))}
          {row("إجمالي المبيعات", fmt(data.sales.total) + " ج.م", true)}
          {row("مرتجعات البيع", fmt(data.salesReturns.total) + " ج.م")}
          {row("خصومات المبيعات", fmt(data.sales.discount) + " ج.م")}
          {row("الضريبة المحصلة", fmt(data.sales.tax) + " ج.م")}
          {row("تكلفة المبيعات", fmt(data.sales.cost) + " ج.م")}
          {row("مجمل الربح", fmt(data.profit) + " ج.م", true)}
          {row("المصروفات", fmt(data.expenses) + " ج.م")}
          {row("صافي الربح", fmt(data.netProfit) + " ج.م", true)}
          {row("عدد فواتير الشراء", String(data.purchases.count || 0))}
          {row("إجمالي المشتريات", fmt(data.purchases.total) + " ج.م")}
          {row("مرتجعات الشراء", fmt(data.purchaseReturns.total) + " ج.م")}
        </tbody>
      </table>

      {days.length > 0 && (
        <>
          <h2>الحركة اليومية</h2>
          <table>
            <thead>
              <tr>
                <th>اليوم</th>
                <th>مبيعات</th>
                <th>مشتريات</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([day, v]) => (
                <tr key={day}>
                  <td className="num">{day}</td>
                  <td className="num">{fmt(v.sale)}</td>
                  <td className="num">{fmt(v.purchase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.topProducts?.length > 0 && (
        <>
          <h2>الأكثر مبيعاً</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
                <th>الربح</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.slice(0, 25).map((p, i) => (
                <tr key={p.name + i}>
                  <td className="num">{i + 1}</td>
                  <td>{p.name}</td>
                  <td className="num">{fmt(p.qty)}</td>
                  <td className="num">{fmt(p.total)}</td>
                  <td className="num">{fmt(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.methods?.length > 0 && (
        <>
          <h2>طرق الدفع</h2>
          <table>
            <thead>
              <tr>
                <th>الطريقة</th>
                <th>عدد الفواتير</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.methods.map((m) => (
                <tr key={m.method}>
                  <td>{m.method}</td>
                  <td className="num">{m.count}</td>
                  <td className="num">{fmt(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.topCustomers?.length > 0 && (
        <>
          <h2>أكبر العملاء</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>العميل</th>
                <th>عدد الفواتير</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.slice(0, 20).map((c, i) => (
                <tr key={c.name + i}>
                  <td className="num">{i + 1}</td>
                  <td>{c.name}</td>
                  <td className="num">{c.count}</td>
                  <td className="num">{fmt(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.lowStock?.length > 0 && (
        <>
          <h2>أصناف تحت الحد الأدنى</h2>
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>المتاح</th>
                <th>الحد الأدنى</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.slice(0, 40).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="num">{fmt(p.stock)}</td>
                  <td className="num">{fmt(p.minStock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="foot">
        <span>
          برنامج FATORA — {settings?.phone || ""}
        </span>
        <span>
          <Printer className="h-3 w-3" style={{ display: "inline" }} /> تم الإنشاء آلياً
        </span>
      </div>
    </div>
  );
}
