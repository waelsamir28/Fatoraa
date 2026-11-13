"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";

/** ملصق باركود للصنف (اسم المحل + اسم الصنف + الباركود + السعر) */
export function BarcodeLabel({
  code,
  name,
  price,
  store,
  showPrice = true,
}: {
  code: string;
  name: string;
  price: number;
  store: string;
  showPrice?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, code || "0", {
        format: "CODE128",
        width: 1.5,
        height: 38,
        fontSize: 12,
        margin: 0,
        displayValue: true,
        textMargin: 1,
      });
    } catch {
      /* كود غير صالح */
    }
  }, [code]);

  return (
    <div className="flex h-[38mm] w-[58mm] flex-col items-center justify-between overflow-hidden rounded-[4px] border border-dashed border-slate-400 bg-white px-[2mm] py-[1.5mm] text-center text-black">
      <div className="w-full truncate text-[10px] font-bold text-slate-600">{store}</div>
      <div className="w-full truncate text-[12px] font-black leading-tight">{name}</div>
      <svg ref={ref} className="max-h-[20mm] max-w-full" />
      {showPrice && <div className="num text-[14px] font-black leading-none">{fmt(price)} ج.م</div>}
    </div>
  );
}
