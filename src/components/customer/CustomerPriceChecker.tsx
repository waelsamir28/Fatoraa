"use client";

import { useMemo, useState } from "react";
import { PackageSearch, Search, Sparkles, Tag } from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

/** شاشة استعلام الأسعار — تصميم فاتح وواضح للعميل */
export function CustomerPriceChecker({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.code.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s),
      )
      .slice(0, 24);
  }, [products, q]);

  const p = selected ?? filtered[0] ?? null;
  const available = p ? p.stock > 0 : false;

  return (
    <Window
      title="استعلام عن أسعار الأصناف — شاشة الزبائن"
      icon={<PackageSearch className="h-8 w-8 text-[#0f2942]" />}
      statusBar={
        <>
          <span>اكتب اسم الصنف أو امسح الباركود</span>
          <span className="sep" />
          <span>عدد الأصناف: {products.length}</span>
          <span className="ms-auto">دعم فني: م/ وائل الجمال — 01222355769</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 overflow-auto bg-[#eef4fa] p-3">
        {/* الترويسة */}
        <div className="shrink-0 rounded-xl bg-gradient-to-l from-[#164066] to-[#0f2942] px-5 py-3 text-center text-white shadow-md">
          <div className="flex items-center justify-center gap-2 text-[13px] font-black text-[#8fd8d0]">
            <Sparkles className="h-4 w-4" />
            شاشة الاستعلام الفوري للزبائن
          </div>
          <div className="mt-0.5 text-[21px] font-black">امسح الباركود أو ابحث عن سعر الصنف</div>
          <div className="text-[12px] font-bold text-blue-200">
            أسعار المستلزمات والمطبوعات والأدوات — محدّثة لحظياً
          </div>
        </div>

        {/* حقل البحث */}
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#0f2942]" />
          <input
            autoFocus
            className="h-14 w-full rounded-xl border-2 border-[#8fb3e0] bg-white pe-14 ps-6 text-[20px] font-black text-[#0f2942] shadow-md outline-none transition placeholder:text-slate-400 focus:border-[#2fb3a6] focus:ring-4 focus:ring-[#2fb3a6]/20"
            placeholder="امسح باركود المنتج أو اكتب جزءاً من الاسم..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
            }}
          />
        </div>

        {/* كارت الصنف */}
        {p ? (
          <div className="grid shrink-0 grid-cols-[1fr_200px] gap-3 rounded-xl border-2 border-[#c9d8ee] bg-white p-4 shadow-md">
            <div className="flex flex-col justify-between gap-3">
              <div>
                <span className="inline-block rounded-md bg-[#0f2942] px-2.5 py-1 text-[12px] font-black text-white">
                  {p.category}
                </span>
                <h2 className="mt-2 text-[24px] font-black leading-snug text-[#0f2942]">{p.name}</h2>
                <div className="num mt-1 text-[13px] font-bold text-slate-500">
                  كود الصنف: {p.code} — العبوة: {p.unit}
                </div>
              </div>

              {/* السعر النهائي */}
              <div className="rounded-xl border-2 border-[#e6bf3a] bg-gradient-to-b from-[#ffe97a] to-[#ffd83d] px-4 py-3 text-center">
                <div className="text-[13px] font-black text-[#0f2942]">السعر النهائي للجمهور</div>
                <div className="num text-[48px] font-black leading-none text-[#0f2942]">
                  {fmt(p.salePrice)} <span className="text-[20px]">ج.م</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold text-slate-600">
                <span>
                  سعر الجملة: <b className="num text-[#0f2942]">{fmt(p.wholesalePrice)} ج.م</b>
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[12px] font-black ${
                    available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {available ? "متوفر ✓" : "غير متوفر حالياً"}
                </span>
              </div>
            </div>

            {/* صورة الصنف */}
            <div className="grid place-items-center rounded-xl border border-[#dbe7f5] bg-[#f7fafd] p-3">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="max-h-[170px] w-auto rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <Tag className="h-12 w-12" />
                  <span className="text-[12px] font-bold">لا توجد صورة</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid shrink-0 place-items-center rounded-xl border-2 border-dashed border-[#c9d8ee] bg-white py-10 text-center">
            <PackageSearch className="mb-2 h-12 w-12 text-slate-300" />
            <div className="text-[16px] font-black text-slate-500">
              لم نجد صنفاً بهذا الاسم أو الباركود
            </div>
            <div className="text-[12.5px] font-bold text-slate-400">جرّب البحث مرة أخرى أو امسح الباركود</div>
          </div>
        )}

        {/* إحصائيات سريعة */}
        <div className="grid shrink-0 grid-cols-3 gap-3">
          <Kpi label="عدد الأصناف" value={products.length} color="navy" />
          <Kpi label="أصناف متوفرة" value={products.filter((x) => x.stock > 0).length} color="green" />
          <Kpi label="نتائج البحث" value={filtered.length} color="blue" />
        </div>

        {/* نتائج سريعة */}
        <div className="min-h-0 flex-1">
          <div className="mb-1.5 text-[13px] font-black text-[#0f2942]">
            {q ? `نتائج البحث (${filtered.length})` : "أصناف مقترحة"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filtered.slice(0, 18).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-black transition ${
                  p?.id === item.id
                    ? "border-[#0f2942] bg-[#0f2942] text-white shadow-sm"
                    : "border-[#c9d8ee] bg-white text-[#0f2942] hover:border-[#2fb3a6] hover:bg-[#f0faf9]"
                }`}
                onClick={() => setSelected(item)}
              >
                {item.name} — <span className="num">{fmt(item.salePrice)} ج.م</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="w-full rounded-lg border border-dashed border-[#c9d8ee] bg-white py-6 text-center text-[13px] font-bold text-slate-400">
                لا نتائج مطابقة
              </div>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}
