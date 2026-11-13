"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductSearchModal({
  products,
  priceLevel,
  type,
  onClose,
  onSelectProduct,
}: {
  products: Product[];
  priceLevel: "retail" | "wholesale";
  type: string;
  onClose: () => void;
  onSelectProduct: (p: Product, qty: number) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");

  const getPrice = (p: Product) => {
    if (type === "purchase" || type === "purchase_return") return p.costPrice;
    return priceLevel === "wholesale" ? p.wholesalePrice || p.salePrice : p.salePrice;
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 15);
    return products
      .filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .slice(0, 30);
  }, [products, q]);

  const p = selected ?? filtered[0] ?? null;

  const handleAdd = () => {
    if (!p) return;
    const n = Number(qty) || 1;
    onSelectProduct(p, n > 0 ? n : 1);
    onClose();
  };

  return (
    <Dialog title="بحث عن صنف وإضافته للفاتورة (F3)" onClose={onClose} width={780}>
      <div className="space-y-3">
        {/* حقل البحث التفاعلي */}
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
          <input
            autoFocus
            className="win-input h-11 w-full pr-10 text-[17px] font-black text-blue-900 shadow-inner"
            placeholder="اكتب اسم الصنف أو الكود أو امسح الباركود..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filtered.length > 0) {
                  handleAdd();
                }
              }
            }}
          />
        </div>

        {/* كارت عرض الصنف المختار بحجم كبير وواضح */}
        {p ? (
          <div className="grid grid-cols-[1fr_210px] gap-3 rounded-xl border-2 border-blue-500 bg-gradient-to-b from-[#ffffff] to-[#eaf2fc] p-3.5 shadow-md">
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11.5px] font-black text-blue-800">
                    {p.category}
                  </span>
                  <span className="num text-[12px] font-bold text-slate-500">الباركود: {p.code} — الوحدة: {p.unit}</span>
                </div>

                <h2 className="mt-1 text-[23px] font-black text-[#0b2350] leading-snug">{p.name}</h2>

                <div className="mt-2.5 flex items-baseline gap-3">
                  <span className="text-[14px] font-black text-slate-700">السعر:</span>
                  <span className="num font-display text-[46px] font-black leading-none text-green-700 drop-shadow-xs">
                    {fmt(getPrice(p))} <span className="text-[20px] font-sans">ج.م</span>
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-5 border-t border-blue-200 pt-1.5 text-[12.5px] font-bold">
                  <div>سعر الجملة: <b className="num font-black text-orange-600">{fmt(p.wholesalePrice)} ج.م</b></div>
                  <div>الرصيد المتاح: <b className={`num font-black ${p.stock <= p.minStock ? "text-red-600" : "text-blue-800"}`}>{fmtQty(p.stock)} {p.unit}</b></div>
                </div>
              </div>

              {/* تحديد الكمية وزر الإضافة المباشرة */}
              <div className="mt-3 flex items-center gap-2 border-t border-blue-200 pt-2.5">
                <span className="text-[13px] font-black text-slate-700">الكمية المطلوبة:</span>
                <input
                  type="number"
                  min="1"
                  className="win-input num h-9 w-20 text-center text-[18px] font-black text-blue-900"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
                <button
                  type="button"
                  className="btn btn-green h-9 flex-1 text-[15px] font-black shadow-sm"
                  onClick={handleAdd}
                >
                  <Plus className="h-4.5 w-4.5" />
                  إضافة الصنف إلى الفاتورة الآن
                </button>
              </div>
            </div>

            {/* صورة الصنف */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-blue-200 bg-white p-2 text-center shadow-inner">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="max-h-[140px] max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-slate-400 py-6">
                  <Tag className="h-12 w-12 text-blue-300 mb-1" />
                  <span className="text-[11.5px] font-bold">لا توجد صورة</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 font-bold text-[14px]">
            لا توجد أصناف مطابقة لكلمة البحث
          </div>
        )}

        {/* قائمة الأصناف المطابقة للضغط السريع */}
        <div className="max-h-[190px] overflow-auto rounded-lg border border-[#b4c4dc] bg-white">
          <table className="dgrid text-center text-[13px]">
            <thead>
              <tr>
                <th className="text-right">اسم الصنف</th>
                <th>المجموعة</th>
                <th>الباركود</th>
                <th>سعر البيع</th>
                <th>الرصيد</th>
                <th className="w-20">إضافة</th>
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
                  <td className="num font-black text-green-700">{fmt(getPrice(item))}</td>
                  <td className="num font-bold">{fmtQty(item.stock)}</td>
                  <td className="p-0.5">
                    <button
                      type="button"
                      className="btn btn-green h-6 px-2 text-[11px] font-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(item, 1);
                        onClose();
                      }}
                    >
                      إضافة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
}
