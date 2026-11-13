"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconBarcode } from "@/components/icons/MoreIcons";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtQty } from "@/lib/format";
import type { Product, Settings } from "@/lib/types";
import { BarcodeLabel } from "./BarcodeLabel";

export function BarcodeView() {
  const { toast } = useDesktop();
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState("برنامج FATORA");
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<Array<{ id: number; count: number }>>([]);
  const [showPrice, setShowPrice] = useState(true);

  useEffect(() => {
    api<{ items: Product[] }>("/api/products?limit=2000")
      .then((r) => setProducts(r.items))
      .catch((e) => toast(errMsg(e), "error"));
    api<Settings>("/api/settings")
      .then((s) => setStore(s.storeName))
      .catch(() => undefined);
  }, [toast]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || p.code.includes(s));
  }, [products, q]);

  const add = (id: number, n = 1) =>
    setQueue((qq) => {
      const i = qq.findIndex((x) => x.id === id);
      if (i < 0) return [...qq, { id, count: Math.max(1, n) }];
      return qq.map((x, j) => (j === i ? { ...x, count: Math.max(1, x.count + n) } : x));
    });
  const total = queue.reduce((s, x) => s + x.count, 0);

  const print = () => {
    if (!queue.length) {
      toast("أضف أصنافاً لطباعة ملصقاتها", "info");
      return;
    }
    const items = queue.map((x) => `${x.id}:${x.count}`).join(",");
    window.open(`/print/barcodes?items=${items}&price=${showPrice ? 1 : 0}&auto=1`, "_blank");
  };

  const preview = queue.flatMap((x) => Array.from({ length: Math.min(x.count, 6) }, (_, i) => ({ key: `${x.id}-${i}`, p: byId.get(x.id) }))).slice(0, 12);

  return (
    <Window title="طباعة ملصقات الباركود" icon={<IconBarcode className="h-9 w-9" />} statusBar={<span>عدد الملصقات: {total} — مقاس الملصق 58×38 مم</span>}>
      <div className="grid h-full w-full grid-cols-[360px_1fr_380px] gap-3 p-3">
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head px-3 py-2 text-[15px]">اختر الأصناف</div>
          <div className="relative p-2">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus className="win-input w-full pr-8" placeholder="بحث أو امسح الباركود..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && list[0]) { add(list[0].id, 1); setQ(""); } }} />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="dgrid text-[14px]">
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => add(p.id, 1)} title="اضغط للإضافة">
                    <td className="max-w-[200px] truncate font-extrabold">{p.name}</td>
                    <td className="num text-center">{fmt(p.salePrice)}</td>
                    <td className="w-[44px] p-1">
                      <button type="button" className="btn h-7 w-8 p-0" onClick={(e) => { e.stopPropagation(); add(p.id, Math.max(1, Math.round(p.stock))); }} title="ملصقات بعدد الرصيد">
                        <Plus className="h-4 w-4 text-green-700" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head flex items-center justify-between px-3 py-2 text-[15px]">
            <span>قائمة الطباعة ({total} ملصق)</span>
            <button type="button" className="text-[13px] underline" onClick={() => setQueue([])}>مسح الكل</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th className="text-right">الصنف</th>
                  <th>الباركود</th>
                  <th>الرصيد</th>
                  <th>عدد الملصقات</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {queue.map((x) => {
                  const p = byId.get(x.id);
                  if (!p) return null;
                  return (
                    <tr key={x.id}>
                      <td className="max-w-[220px] truncate text-right font-extrabold">{p.name}</td>
                      <td className="num text-[13px]">{p.code}</td>
                      <td className="num">{fmtQty(p.stock)}</td>
                      <td className="p-1">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => add(x.id, -1)}><Minus className="h-4 w-4" /></button>
                          <input
                            className="win-input num h-7 w-[60px] text-center"
                            value={x.count}
                            onChange={(e) => {
                              const n = Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 1));
                              setQueue((qq) => qq.map((y) => (y.id === x.id ? { ...y, count: n } : y)));
                            }}
                          />
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => add(x.id, 1)}><Plus className="h-4 w-4" /></button>
                        </div>
                      </td>
                      <td className="w-[44px] p-1">
                        <button type="button" className="btn h-7 w-8 p-0" onClick={() => setQueue((qq) => qq.filter((y) => y.id !== x.id))}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!queue.length && (
                  <tr className="empty"><td colSpan={5} className="py-16 text-slate-500">اضغط على أي صنف من القائمة لإضافته</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-[#d5deea] p-2">
            <label className="flex cursor-pointer items-center gap-2 text-[14px] font-extrabold">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              طباعة السعر على الملصق
            </label>
            <button type="button" className="btn btn-green ms-auto h-[42px] px-6 text-[17px]" onClick={print}>
              <Printer className="h-5 w-5" />
              طباعة الملصقات
            </button>
          </div>
        </div>

        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head px-3 py-2 text-[15px]">معاينة</div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start justify-items-center gap-2 overflow-auto bg-[#e9edf3] p-2" style={{ zoom: 0.78 }}>
            {preview.map(({ key, p }) => (p ? <BarcodeLabel key={key} code={p.code} name={p.name} price={p.salePrice} store={store} showPrice={showPrice} /> : null))}
            {!preview.length && <div className="col-span-2 py-16 text-center text-[15px] font-bold text-slate-500">لا توجد ملصقات</div>}
          </div>
        </div>
      </div>
    </Window>
  );
}
