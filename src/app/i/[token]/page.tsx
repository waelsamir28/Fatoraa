import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices } from "@/db/schema";
import { verifyInvoiceToken } from "@/lib/qr";
import { getSettings } from "@/lib/server/seed";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  sale: "فاتورة مبيعات",
  purchase: "فاتورة مشتريات",
  sale_return: "مرتجع مبيعات",
  purchase_return: "مرتجع مشتريات",
};

const money = (v: number, currency = "ج.م") =>
  `${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

/**
 * صفحة الفاتورة العامة — يفتحها العميل بمسح QR من الفاتورة المطبوعة.
 * محمية بتوقيع HMAC حتى لا يمكن تخمين فواتير الآخرين.
 */
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parts = String(token || "").split("-");
  if (parts.length < 3) notFound();

  const id = Number(parts[0]);
  const number = Number(parts[1]);
  const sig = parts.slice(2).join("-");
  if (!Number.isFinite(id) || !Number.isFinite(number) || !verifyInvoiceToken(id, number, sig)) {
    notFound();
  }

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!inv) notFound();

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const s = await getSettings().catch(() => null);
  const currency = s?.currency || "ج.م";
  const remaining = Math.max(0, inv.total - inv.paid);

  return (
    <main className="mx-auto min-h-screen max-w-[520px] bg-[#eef3fa] p-3 text-[#0f172a]" dir="rtl">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* الترويسة */}
        <div className="bg-gradient-to-l from-[#0b4cc2] to-[#0b2350] px-4 py-4 text-white">
          <div className="text-[19px] font-black">{s?.storeName || "برنامج FATORA"}</div>
          <div className="mt-0.5 text-[12px] font-bold text-blue-100">{s?.address || ""}</div>
          <div className="num mt-0.5 text-[12px] font-bold text-blue-100" dir="ltr">
            {s?.phone || ""}
          </div>
        </div>

        {/* بيانات الفاتورة */}
        <div className="grid grid-cols-2 gap-y-1.5 border-b border-slate-200 bg-[#f7faff] px-4 py-3 text-[13px] font-bold">
          <span className="text-slate-500">النوع:</span>
          <span className="text-[#0b2350]">{LABELS[inv.type] || inv.type}</span>
          <span className="text-slate-500">رقم الفاتورة:</span>
          <span className="num font-black text-red-600">#{inv.number}</span>
          <span className="text-slate-500">التاريخ:</span>
          <span className="num">{fmtDate(inv.date)}</span>
          <span className="text-slate-500">الوقت:</span>
          <span className="num">{fmtTime(inv.date)}</span>
          {inv.partyName && (
            <>
              <span className="text-slate-500">العميل:</span>
              <span className="text-[#0b2350]">{inv.partyName}</span>
            </>
          )}
          <span className="text-slate-500">الكاشير:</span>
          <span>{inv.userName || "—"}</span>
        </div>

        {/* الأصناف */}
        <div className="px-3 py-2">
          <table className="w-full text-center text-[12.5px]">
            <thead>
              <tr className="bg-[#0b2350] text-white">
                <th className="py-1.5 font-black">الصنف</th>
                <th className="font-black">الكمية</th>
                <th className="font-black">السعر</th>
                <th className="font-black">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-slate-100 font-bold">
                  <td className="py-1.5 text-right">{it.productName}</td>
                  <td className="num">{it.qty}</td>
                  <td className="num">{Number(it.price).toFixed(2)}</td>
                  <td className="num font-black">{Number(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الإجماليات */}
        <div className="space-y-1 px-4 pb-3 text-[13.5px] font-bold">
          <Row label="إجمالي الأصناف" value={money(inv.subtotal, currency)} />
          {inv.discount > 0 && <Row label="الخصم" value={`-${money(inv.discount, currency)}`} red />}
          {inv.extraDiscount > 0 && <Row label="خصم إضافي" value={`-${money(inv.extraDiscount, currency)}`} red />}
          {inv.tax > 0 && <Row label={`ضريبة (${inv.taxRate}%)`} value={`+${money(inv.tax, currency)}`} />}
          <div className="mt-1 flex items-center justify-between rounded-lg bg-[#0b2350] px-3 py-2 text-[15px] font-black text-[#ffe600]">
            <span className="text-white">الصافي المطلوب</span>
            <span className="num">{money(inv.total, currency)}</span>
          </div>
          <Row label="المدفوع" value={money(inv.paid, currency)} />
          <Row label="المتبقي" value={money(remaining, currency)} red={remaining > 0} />
        </div>

        {s?.invoiceFooter && (
          <div className="border-t border-slate-200 px-4 py-3 text-center text-[12px] font-black text-slate-600">
            {s.invoiceFooter}
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-[11px] font-bold text-slate-500">
        هذه نسخة إلكترونية من فاتورتك — يمكنك حفظ الصفحة أو تصويرها للمراجعة.
      </div>
    </main>
  );
}

function Row({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${red ? "text-red-600" : "text-slate-700"}`}>
      <span>{label}</span>
      <span className="num font-black">{value}</span>
    </div>
  );
}
