"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, Tag } from "lucide-react";
import { Window } from "@/components/win/Window";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

export function CustomerPriceChecker({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 12);
    return products
      .filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .slice(0, 24);
  }, [products, q]);

  const p = selected ?? filtered[0] ?? null;

  return (
    <Window title="شاشة العملاء والزبائن - الاستعلام عن أسعار الأصناف" icon={<Sparkles className="h-8 w-8 text-amber-400" />}>
      <div className="flex h-full w-full flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0b3370] via-[#082455] to-[#04122d] text-white">
        {/* الترويسة العلوية */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1 text-[14px] font-black text-blue-200 border border-blue-400/30">
            <Sparkles className="h-4 w-4 text-amber-400" />
            شاشة كشك الاستعلام الفوري للزبائن
          </div>
          <h1 className="text-[34px] font-black tracking-wide text-white drop-shadow">
            امسح الباركود أو ابحث عن سعر الصنف
          </h1>
          <p className="text-[15px] font-bold text-blue-200 opacity-90">
            يسعدنا خدمتكم دائماً - لمعرفة أسعار المستلزمات والمطبوعات والأدوات بدقة
          </p>
        </div>

        {/* حقل البحث الضخم البارز */}
        <div className="relative w-full max-w-2xl">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-7 w-7 -translate-y-1/2 text-blue-400" />
          <input
            autoFocus
            className="h-16 w-full rounded-2xl border-2 border-blue-400/50 bg-white/10 pr-14 pl-6 text-[24px] font-black text-white placeholder-blue-300/60 backdrop-blur-md shadow-2xl outline-none focus:border-amber-400 focus:bg-white/15 focus:ring-4 focus:ring-amber-400/30 transition text-right"
            placeholder="امسح باركود المنتج أو اكتب جزءاً من الاسم..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* كارت عرض السعر العملاق الموجه للزبون */}
        {p ? (
          <div className="grid w-full max-w-3xl grid-cols-[1fr_240px] gap-6 rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-white/15 to-white/5 p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col justify-between">
              <div>
                <span className="inline-block rounded-md bg-amber-400 px-3 py-1 text-[13px] font-black text-[#0c2340]">
                  {p.category}
                </span>
                <h2 className="mt-3 text-[30px] font-black leading-snug text-white drop-shadow">
                  {p.name}
                </h2>
                <div className="num mt-1 text-[14px] font-bold text-blue-200 opacity-80">
                  كود الصنف: {p.code} — العبوة: {p.unit}
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-black/30 p-4 border border-white/10">
                <div className="text-[15px] font-bold text-amber-300">السعر النهائي للجمهور:</div>
                <div className="num font-display text-[64px] font-black leading-none text-amber-400 drop-shadow-[0_4px_12px_rgba(251,191,36,0.4)]">
                  {fmt(p.salePrice)} <span className="text-[28px] font-sans text-white">ج.م</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[13.5px] font-bold text-blue-200">
                <span>سعر الجملة للكميات: <b className="num text-white">{fmt(p.wholesalePrice)} ج.م</b></span>
                <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-300">متوفر وجاهز للطلب ✓</span>
              </div>
            </div>

            {/* صورة المنتج */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3 shadow-inner">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="max-h-[200px] max-w-full rounded-xl object-contain drop-shadow-md" />
              ) : (
                <div className="flex flex-col items-center justify-center text-blue-300/60 p-6">
                  <Tag className="h-16 w-16 mb-2" />
                  <span className="text-[13px] font-bold">صورة المنتج</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-[18px] font-bold text-blue-200 backdrop-blur-md">
            لم نجد صنفاً بهذا الاسم أو الباركود، جرب البحث مرة أخرى
          </div>
        )}

        {/* نتائج سريعة بالأصناف */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {filtered.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-xl border px-3.5 py-1.5 text-[13px] font-black transition ${
                p?.id === item.id ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setSelected(item)}
            >
              {item.name} — <span className="num">{fmt(item.salePrice)} ج.م</span>
            </button>
          ))}
        </div>
      </div>
    </Window>
  );
}
