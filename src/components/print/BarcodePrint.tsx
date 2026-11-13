"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { BarcodeLabel } from "@/components/inventory/BarcodeLabel";
import { api } from "@/lib/client";
import type { Product, Settings } from "@/lib/types";

export function BarcodePrint({ items, showPrice, auto }: { items: Array<{ id: number; count: number }>; showPrice: boolean; auto: boolean }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [store, setStore] = useState("");

  useEffect(() => {
    Promise.all([api<{ items: Product[] }>("/api/products?limit=2000"), api<Settings>("/api/settings")])
      .then(([r, s]) => {
        setProducts(r.items);
        setStore(s.storeName);
        document.title = "طباعة ملصقات الباركود";
      })
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!products || !auto) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [products, auto]);

  if (!products) return <div className="grid min-h-screen place-items-center bg-white text-[18px] font-bold">جاري التحميل...</div>;
  const byId = new Map(products.map((p) => [p.id, p]));
  const labels = items.flatMap((x) => {
    const p = byId.get(x.id);
    return p ? Array.from({ length: x.count }, (_, i) => ({ key: `${x.id}-${i}`, p })) : [];
  });

  return (
    <div className="min-h-screen bg-white p-4 print:p-0">
      <div className="no-print mb-4 flex items-center gap-3">
        <button type="button" className="btn btn-blue h-10 px-5" onClick={() => window.print()}>
          <Printer className="h-5 w-5" />
          طباعة ({labels.length} ملصق)
        </button>
        <span className="text-[14px] font-bold text-slate-600">مقاس الملصق 58×38 مم</span>
      </div>
      <div className="flex flex-wrap gap-[2mm]">
        {labels.map(({ key, p }) => (
          <div key={key} style={{ breakInside: "avoid" }}>
            <BarcodeLabel code={p.code} name={p.name} price={p.salePrice} store={store} showPrice={showPrice} />
          </div>
        ))}
      </div>
    </div>
  );
}
