"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconItemCard } from "@/components/icons/MoreIcons";
import { api, errMsg } from "@/lib/client";
import { INVOICE_LABELS } from "@/lib/constants";
import { fmt, fmtDate, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

interface CardRow {
  invoiceId: number;
  type: string;
  number: number;
  date: string;
  party: string;
  qty: number;
  price: number;
  total: number;
  qtyIn: number;
  qtyOut: number;
  balance: number;
}
interface Card {
  product: Product;
  opening: number;
  totalIn: number;
  totalOut: number;
  rows: CardRow[];
}

const EDITOR: Record<string, string> = { sale: "/sales", purchase: "/purchases", sale_return: "/returns/sales", purchase_return: "/returns/purchases" };

export function ItemCardView() {
  const router = useRouter();
  const { toast } = useDesktop();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [card, setCard] = useState<Card | null>(null);

  useEffect(() => {
    api<{ items: Product[] }>("/api/products?limit=2000")
      .then((r) => setProducts(r.items))
      .catch((e) => toast(errMsg(e), "error"));
  }, [toast]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || p.code.includes(s));
  }, [products, q]);

  const openCard = async (id: number) => {
    try {
      setCard(await api<Card>(`/api/item-card?productId=${id}`));
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const p = card?.product;

  return (
    <Window title="كارت الصنف - حركة الصنف" icon={<IconItemCard className="h-9 w-9" />} statusBar={<span>{p ? `${p.name} — الرصيد الحالي ${fmtQty(p.stock)} ${p.unit}` : "اختر صنفاً من القائمة لعرض حركته"}</span>}>
      <div className="grid h-full w-full grid-cols-[330px_1fr] gap-3 p-3">
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head px-3 py-2 text-[15px]">الأصناف</div>
          <div className="relative p-2">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus className="win-input w-full pr-8" placeholder="بحث بالاسم أو الباركود..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && list[0]) void openCard(list[0].id); }} />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="dgrid text-[14px]">
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} className={`clickable ${p?.id === x.id ? "sel" : ""}`} onClick={() => void openCard(x.id)}>
                    <td className="max-w-[210px] truncate font-extrabold">{x.name}</td>
                    <td className={`num text-center ${p?.id !== x.id && x.stock <= x.minStock ? "text-red-600" : ""}`}>{fmtQty(x.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="panel flex shrink-0 items-center gap-4 px-4 py-3">
            <IconItemCard className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[22px] font-black text-[#0b2350]">{p?.name ?? "اختر صنفاً"}</div>
              <div className="num text-[13px] font-bold text-slate-500">
                {p ? `الباركود: ${p.code} — المجموعة: ${p.category} — العبوة: ${p.unit}` : "سيظهر هنا كل حركات الصنف من فواتير المبيعات والمشتريات والمرتجعات"}
              </div>
            </div>
            {p && (
              <div className="flex gap-4 text-center text-[13px] font-bold">
                <div>شراء<div className="num text-[17px] font-black text-blue-700">{fmt(p.costPrice)}</div></div>
                <div>بيع<div className="num text-[17px] font-black text-green-700">{fmt(p.salePrice)}</div></div>
                <div>جملة<div className="num text-[17px] font-black text-orange-600">{fmt(p.wholesalePrice)}</div></div>
              </div>
            )}
          </div>
          <div className="grid shrink-0 grid-cols-4 gap-3">
            <Kpi label="رصيد أول المدة" value={card ? fmtQty(card.opening) : "-"} color="navy" />
            <Kpi label="إجمالي الوارد" value={card ? fmtQty(card.totalIn) : "-"} color="green" sub="مشتريات + مرتجع مبيعات" />
            <Kpi label="إجمالي المنصرف" value={card ? fmtQty(card.totalOut) : "-"} color="red" sub="مبيعات + مرتجع مشتريات" />
            <Kpi label="الرصيد الحالي" value={p ? fmtQty(p.stock) : "-"} color="gold" sub={p ? `قيمته ${fmt(p.stock * p.costPrice)}` : ""} />
          </div>
          <div className="panel min-h-0 flex-1 overflow-auto p-0">
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الحركة</th>
                  <th>رقم الفاتورة</th>
                  <th className="text-right">العميل / المورد</th>
                  <th>السعر</th>
                  <th>وارد</th>
                  <th>منصرف</th>
                  <th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {card && (
                  <tr className="empty">
                    <td colSpan={7} className="text-right font-black text-blue-800">رصيد أول المدة</td>
                    <td className="num font-black">{fmtQty(card.opening)}</td>
                  </tr>
                )}
                {card?.rows.map((r, i) => (
                  <tr key={`${r.invoiceId}-${i}`} className="clickable" onDoubleClick={() => router.push(`${EDITOR[r.type] ?? "/sales"}?id=${r.invoiceId}`)} title="اضغط مرتين لفتح الفاتورة">
                    <td className="num">{fmtDate(r.date)}</td>
                    <td>{INVOICE_LABELS[r.type] ?? r.type}</td>
                    <td className="num font-black text-[#d0190f]">{r.number}</td>
                    <td className="max-w-[220px] truncate text-right">{r.party}</td>
                    <td className="num">{fmt(r.price)}</td>
                    <td className="num font-black text-green-700">{r.qtyIn ? fmtQty(r.qtyIn) : "-"}</td>
                    <td className="num font-black text-red-600">{r.qtyOut ? fmtQty(r.qtyOut) : "-"}</td>
                    <td className="num font-black">{fmtQty(r.balance)}</td>
                  </tr>
                ))}
                {card && !card.rows.length && (
                  <tr className="empty"><td colSpan={8} className="py-10 text-slate-500">لا توجد حركات على هذا الصنف</td></tr>
                )}
                {!card && (
                  <tr className="empty"><td colSpan={8} className="py-16 text-slate-500">اختر صنفاً من القائمة على اليمين</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Window>
  );
}
