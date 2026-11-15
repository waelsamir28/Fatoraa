"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { api } from "@/lib/client";
import { fmt } from "@/lib/format";
import type { Product, Settings } from "@/lib/types";

/**
 * ملصقات أرفف: اسم الصنف + السعر بخط كبير + الباركود + اسم المحل.
 * مصممة للقراءة من مسافة — تُلصق على رفّ العرض.
 */
export function ShelfLabels({
  items,
  widthMm = 70,
  heightMm = 45,
  showPrice = true,
  showStore = true,
  auto = false,
}: {
  items: Array<{ id: number; count: number }>;
  widthMm?: number;
  heightMm?: number;
  showPrice?: boolean;
  showStore?: boolean;
  auto?: boolean;
}) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [store, setStore] = useState("");

  useEffect(() => {
    Promise.all([api<{ items: Product[] }>("/api/products?limit=2000"), api<Settings>("/api/settings")])
      .then(([r, s]) => {
        setProducts(r.items);
        setStore(s.storeName);
        document.title = "ملصقات أرفف";
      })
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!products || !auto) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [products, auto]);

  if (!products) {
    return <div className="grid min-h-screen place-items-center bg-white text-[18px] font-bold">جاري التحميل...</div>;
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const labels = items.flatMap((x) => {
    const p = byId.get(x.id);
    return p ? Array.from({ length: x.count }, (_, i) => ({ key: `${x.id}-${i}`, p })) : [];
  });

  return (
    <div className="min-h-screen bg-white p-4 print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-blue h-10 px-5" onClick={() => window.print()}>
          <Printer className="h-5 w-5" />
          طباعة ({labels.length} ملصق رف)
        </button>
        <span className="text-[14px] font-bold text-slate-600">
          مقاس الملصق {widthMm}×{heightMm} مم — {showPrice ? "بالسعر" : "بدون سعر"}
        </span>
      </div>

      <div className="flex flex-wrap gap-[3mm]">
        {labels.map(({ key, p }) => (
          <div key={key} style={{ breakInside: "avoid" }}>
            <ShelfLabel
              code={p.code}
              name={p.name}
              price={p.salePrice}
              unit={p.unit}
              store={store}
              widthMm={widthMm}
              heightMm={heightMm}
              showPrice={showPrice}
              showStore={showStore}
            />
          </div>
        ))}
      </div>

      {labels.length === 0 && (
        <div className="py-20 text-center text-[16px] font-bold text-slate-500">
          لا توجد أصناف محددة — اختر الأصناف من شاشة المخزون ثم «ملصقات أرفف»
        </div>
      )}
    </div>
  );
}

function ShelfLabel({
  code,
  name,
  price,
  unit,
  store,
  widthMm,
  heightMm,
  showPrice,
  showStore,
}: {
  code: string;
  name: string;
  price: number;
  unit?: string;
  store: string;
  widthMm: number;
  heightMm: number;
  showPrice: boolean;
  showStore: boolean;
}) {
  const barcodeRef = useRef<{ el: SVGSVGElement | null }>({ el: null });

  useEffect(() => {
    if (!barcodeRef.current.el) return;
    try {
      JsBarcode(barcodeRef.current.el, code || "0", {
        format: "CODE128",
        width: 1.4,
        height: heightMm > 40 ? 30 : 22,
        fontSize: 10,
        margin: 0,
        displayValue: true,
        textMargin: 0,
      });
    } catch {
      /* كود غير صالح — نتركه فارغاً */
    }
  }, [code, heightMm]);

  const big = heightMm >= 45;

  return (
    <div
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
      className="flex flex-col items-center justify-between overflow-hidden border border-dashed border-slate-400 bg-white px-[1.5mm] py-[1mm] text-center text-[#0b2350]"
    >
      {showStore && store && (
        <div className="w-full truncate text-[8px] font-black leading-none text-slate-600">{store}</div>
      )}

      <div
        className={`w-full leading-tight ${big ? "text-[12px]" : "text-[10px]"} font-black`}
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {name}
      </div>

      {showPrice && (
        <div className="flex w-full items-baseline justify-center gap-1 leading-none">
          <span className={`num ${big ? "text-[25px]" : "text-[18px]"} font-black`}>{fmt(price)}</span>
          <span className="text-[9px] font-black text-slate-600">{unit || "ج.م"}</span>
        </div>
      )}

      <svg
        ref={(el) => {
          barcodeRef.current.el = el;
        }}
        className="max-h-[45%] w-full"
      />
    </div>
  );
}
