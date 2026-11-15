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
  widthMm = 58,
  heightMm = 38,
}: {
  code: string;
  name: string;
  price: number;
  store: string;
  showPrice?: boolean;
  /** عرض الملصق بالمليمتر */
  widthMm?: number;
  /** ارتفاع الملصق بالمليمتر */
  heightMm?: number;
}) {
  const small = heightMm <= 25;
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
    <div
      className="flex flex-col items-center justify-between overflow-hidden rounded-[4px] border border-dashed border-slate-400 bg-white px-[2mm] py-[1mm] text-center text-black"
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      <div className={`w-full truncate font-bold text-slate-600 ${small ? "text-[8px]" : "text-[10px]"}`}>{store}</div>
      <div className={`w-full truncate font-black leading-tight ${small ? "text-[9px]" : "text-[12px]"}`}>{name}</div>
      <svg ref={ref} className="max-w-full" style={{ maxHeight: `${Math.max(8, heightMm - 16)}mm` }} />
      {showPrice && (
        <div className={`num font-black leading-none ${small ? "text-[11px]" : "text-[14px]"}`}>{fmt(price)} ج.م</div>
      )}
    </div>
  );
}
