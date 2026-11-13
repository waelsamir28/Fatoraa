"use client";

import { useMemo, useState } from "react";
import { Search, Tag } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

export function PriceInquiryDialog({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 15);
    return products
      .filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .slice(0, 30);
  }, [products, q]);

  const p = selected ?? filtered[0] ?? null;

  return (
    <Dialog title="شاشة الاستعلام السريع عن الأسعار للزبائن" onClose={onClose} width={760}>
      <div className="space-y-3">
        {/* حقل البحث */}
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
          <input
            autoFocus
            className="win-input h-12 w-full pr-10 text-[18px] font-black text-blue-900 shadow-inner"
            placeholder="اكتب اسم الصنف أو الكود أو امسح الباركود..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* كارت عرض السعر الضخم للزبون */}
        {p ? (
          <div className="grid grid-cols-[1fr_200px] gap-3 rounded-xl border-2 border-blue-500 bg-gradient-to-b from-[#ffffff] to-[#eaf2fc] p-4 shadow-md">
            <div>
              <div className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[12px] font-black text-blue-800">
                {p.category}
              </div>
              <h2 className="mt-1 text-[24px] font-black text-[#0b2350] leading-snug">{p.name}</h2>
              <div className="num mt-1 text-[13px] font-bold text-slate-500">الباركود: {p.code} — الوحدة: {p.unit}</div>

              <div className="mt-4 flex items-baseline gap-4">
                <div className="text-[15px] font-black text-slate-700">سعر البيع:</div>
                <div className="num font-display text-[52px] font-black leading-none text-green-700 drop-shadow-sm">
                  {fmt(p.salePrice)} <span className="text-[24px]">ج.م</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-6 border-t border-blue-200 pt-2 text-[13.5px] font-bold">
                <div>سعر الجملة: <b className="num font-black text-orange-600">{fmt(p.wholesalePrice)} ج.م</b></div>
                <div>الرصيد المتاح: <b className={`num font-black ${p.stock <= p.minStock ? "text-red-600" : "text-blue-800"}`}>{fmtQty(p.stock)} {p.unit}</b></div>
              </div>
            </div>

            {/* صورة الصنف */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-blue-200 bg-white p-2 text-center shadow-inner">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="max-h-[140px] max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Tag className="h-12 w-12 text-blue-300 mb-1" />
                  <span className="text-[12px] font-bold">لا توجد صورة</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 font-bold">
            لا توجد أصناف مطابقة للبحث
          </div>
        )}

        {/* قائمة الأصناف المطابقة للاختيار السريع */}
        <div className="max-h-[220px] overflow-auto rounded-lg border border-[#b4c4dc] bg-white">
          <table className="dgrid text-center text-[13.5px]">
            <thead>
              <tr>
                <th className="text-right">اسم الصنف</th>
                <th>المجموعة</th>
                <th>الباركود</th>
                <th>سعر البيع</th>
                <th>سعر الجملة</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={`clickable ${p?.id === item.id ? "sel" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  <td className="max-w-[240px] truncate text-right font-extrabold">{item.name}</td>
                  <td>{item.category}</td>
                  <td className="num">{item.code}</td>
                  <td className="num font-black text-green-700">{fmt(item.salePrice)}</td>
                  <td className="num font-bold text-orange-600">{fmt(item.wholesalePrice)}</td>
                  <td className="num font-bold">{fmtQty(item.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
}
