"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Layers, Minus, Plus, Printer, Search, Trash2, Wand2 } from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconBarcode } from "@/components/icons/MoreIcons";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtQty } from "@/lib/format";
import type { Product, Settings } from "@/lib/types";
import { BarcodeLabel } from "./BarcodeLabel";

type LabelSize = "58x38" | "50x30" | "40x25" | "70x40";

const SIZES: Array<{ key: LabelSize; label: string; w: number; h: number; perRow: number }> = [
  { key: "58x38", label: "58×38 مم (افتراضي)", w: 58, h: 38, perRow: 3 },
  { key: "50x30", label: "50×30 مم", w: 50, h: 30, perRow: 3 },
  { key: "40x25", label: "40×25 مم (صغير)", w: 40, h: 25, perRow: 4 },
  { key: "70x40", label: "70×40 مم (كبير)", w: 70, h: 40, perRow: 2 },
];

export function BarcodeView() {
  const { toast } = useDesktop();
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState("برنامج FATORA");
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<Array<{ id: number; count: number }>>([]);
  const [showPrice, setShowPrice] = useState(true);
  const [size, setSize] = useState<LabelSize>("58x38");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [batchCount, setBatchCount] = useState("1");
  const [category, setCategory] = useState("");

  useEffect(() => {
    api<{ items: Product[]; categories: string[] }>("/api/products?limit=2000")
      .then((r) => setProducts(r.items))
      .catch((e) => toast(errMsg(e), "error"));
    api<Settings>("/api/settings")
      .then((s) => setStore(s.storeName))
      .catch(() => undefined);
  }, [toast]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!s || p.name.toLowerCase().includes(s) || p.code.includes(s)),
    );
  }, [products, q, category]);

  const add = (id: number, n = 1) =>
    setQueue((qq) => {
      const i = qq.findIndex((x) => x.id === id);
      if (i < 0) return [...qq, { id, count: Math.max(1, n) }];
      return qq.map((x, j) => (j === i ? { ...x, count: Math.min(999, Math.max(1, x.count + n)) } : x));
    });

  const setCount = (id: number, n: number) =>
    setQueue((qq) => qq.map((x) => (x.id === id ? { ...x, count: Math.min(999, Math.max(1, n)) } : x)));

  const total = queue.reduce((s, x) => s + x.count, 0);
  const sheets = Math.ceil(total / 24);

  /** إضافة كل الأصناف المختارة دفعة واحدة */
  const addPicked = () => {
    const n = Math.max(1, Math.min(999, Number(batchCount) || 1));
    if (!picked.size) {
      toast("اختر أصنافاً أولاً من القائمة", "info");
      return;
    }
    picked.forEach((id) => add(id, n));
    toast(`تمت إضافة ${picked.size} صنفاً — ${n} ملصق لكل صنف`);
    setPicked(new Set());
  };

  /** إضافة كل نتائج البحث/الفئة الحالية */
  const addAllFiltered = () => {
    if (!list.length) {
      toast("لا توجد أصناف في القائمة الحالية", "info");
      return;
    }
    list.forEach((p) => add(p.id, Math.max(1, Math.min(999, Number(batchCount) || 1))));
    toast(`تمت إضافة ${list.length} صنفاً بملصقات بعدد الرصيد أو ${batchCount} لكل صنف`);
  };

  /** ملصقات بعدد الرصيد المتاح لكل الأصناف المختارة */
  const addPickedByStock = () => {
    if (!picked.size) {
      toast("اختر أصنافاً أولاً", "info");
      return;
    }
    picked.forEach((id) => {
      const p = byId.get(id);
      add(id, Math.max(1, Math.round(p?.stock ?? 1)));
    });
    toast(`تمت إضافة ملصقات بعدد الرصيد لـ ${picked.size} صنفاً`);
    setPicked(new Set());
  };

  const togglePick = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllFiltered = () => {
    setPicked(new Set(list.map((p) => p.id)));
  };

  const print = () => {
    if (!queue.length) {
      toast("أضف أصنافاً لطباعة ملصقاتها", "info");
      return;
    }
    const items = queue.map((x) => `${x.id}:${x.count}`).join(",");
    const sz = SIZES.find((s) => s.key === size) ?? SIZES[0];
    window.open(
      `/print/barcodes?items=${items}&price=${showPrice ? 1 : 0}&auto=1&w=${sz.w}&h=${sz.h}`,
      "_blank",
    );
  };

  const preview = queue
    .flatMap((x) => Array.from({ length: Math.min(x.count, 4) }, (_, i) => ({ key: `${x.id}-${i}`, p: byId.get(x.id) })))
    .slice(0, 10);
  const activeSize = SIZES.find((s) => s.key === size) ?? SIZES[0];

  return (
    <Window
      title="طباعة ملصقات الباركود — دفعة واحدة"
      icon={<IconBarcode className="h-9 w-9" />}
      statusBar={
        <>
          <span>عدد الملصقات: {total}</span>
          <span className="sep" />
          <span>مقاس الملصق: {size.replace("x", "×")} مم</span>
          <span className="sep" />
          <span>ورق تقريبي: {sheets} صفحة</span>
          <span className="ms-auto">اختر عدة أصناف ثم «إضافة المحدد» لطباعتها كلها مرة واحدة</span>
        </>
      }
    >
      <div className="grid h-full w-full grid-cols-[380px_1fr_340px] gap-3 p-3">
        {/* ===== عمود اختيار الأصناف ===== */}
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head px-3 py-2 text-[15px]">اختر الأصناف (يمكن اختيار أكثر من صنف)</div>

          <div className="space-y-1.5 border-b border-[#d5deea] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="win-input w-full pr-9"
                placeholder="بحث بالاسم أو امسح الباركود..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && list[0]) {
                    add(list[0].id, 1);
                    setQ("");
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                className="win-input h-8 flex-1 text-[12.5px] font-bold"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">كل المجموعات</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="button" className="btn h-8 px-2 text-[11.5px] font-black" onClick={selectAllFiltered} title="تحديد كل النتائج">
                <CheckSquare className="h-3.5 w-3.5" /> تحديد الكل
              </button>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-[#eef4fa] p-1.5">
              <span className="text-[11.5px] font-black text-[#0f2942]">ملصقات لكل صنف:</span>
              <input
                className="win-input num h-7 w-[54px] text-center text-[12.5px] font-black"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value.replace(/\D/g, "") || "1")}
              />
              <button type="button" className="btn btn-blue h-7 flex-1 px-1 text-[11px] font-black" onClick={addPicked}>
                <Layers className="h-3.5 w-3.5" /> إضافة المحدد
              </button>
              <button type="button" className="btn btn-green h-7 px-1.5 text-[11px] font-black" onClick={addAllFiltered} title="إضافة كل نتائج البحث">
                <Wand2 className="h-3.5 w-3.5" /> الكل
              </button>
            </div>
            {picked.size > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-50 p-1.5 text-[11.5px] font-black text-amber-900">
                محدد: {picked.size} صنف
                <button type="button" className="btn h-6 px-1.5 text-[11px] font-black" onClick={addPickedByStock}>
                  بعدد الرصيد
                </button>
                <button type="button" className="btn h-6 px-1.5 text-[11px] font-black" onClick={() => setPicked(new Set())}>
                  إلغاء التحديد
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="dgrid text-[13.5px]">
              <tbody>
                {list.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`clickable ${on ? "sel" : ""}`}
                      onClick={() => togglePick(p.id)}
                      title="اضغط لتحديد الصنف"
                    >
                      <td className="w-[28px]">
                        <input type="checkbox" className="h-4 w-4 accent-[#2fb3a6]" checked={on} onChange={() => togglePick(p.id)} />
                      </td>
                      <td className="max-w-[180px] truncate font-extrabold">{p.name}</td>
                      <td className="num text-center text-[12px] text-slate-500">{p.code}</td>
                      <td className="num w-[48px] text-center">{fmt(p.salePrice)}</td>
                      <td className="w-[40px] p-1">
                        <button
                          type="button"
                          className="btn h-7 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            add(p.id, 1);
                          }}
                          title="إضافة ملصق"
                        >
                          <Plus className="h-4 w-4 text-green-700" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!list.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      لا توجد أصناف مطابقة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== قائمة الطباعة ===== */}
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head flex items-center justify-between px-3 py-2 text-[15px]">
            <span>قائمة الطباعة ({total} ملصق)</span>
            <button type="button" className="text-[13px] underline" onClick={() => setQueue([])}>
              مسح الكل
            </button>
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
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => add(x.id, -1)}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            className="win-input num h-7 w-[60px] text-center"
                            value={x.count}
                            onChange={(e) => setCount(x.id, Number(e.target.value.replace(/\D/g, "")) || 1)}
                          />
                          <button type="button" className="btn h-7 w-7 p-0" onClick={() => add(x.id, 1)}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="w-[44px] p-1">
                        <button
                          type="button"
                          className="btn h-7 w-8 p-0"
                          onClick={() => setQueue((qq) => qq.filter((y) => y.id !== x.id))}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!queue.length && (
                  <tr className="empty">
                    <td colSpan={5} className="py-16 text-slate-500">
                      اضغط على أي صنف من القائمة لإضافته — أو حدد عدة أصناف و«إضافة المحدد»
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* إعدادات + طباعة */}
          <div className="shrink-0 space-y-1.5 border-t border-[#d5deea] p-2">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-extrabold">
                <input type="checkbox" className="h-4 w-4 accent-[#2fb3a6]" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                طباعة السعر
              </label>
              <select className="win-input h-8 flex-1 text-[12.5px] font-bold" value={size} onChange={(e) => setSize(e.target.value as LabelSize)}>
                {SIZES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-green h-[42px] w-full px-6 text-[17px] font-black" onClick={print}>
              <Printer className="h-5 w-5" />
              طباعة {total} ملصق
            </button>
          </div>
        </div>

        {/* ===== المعاينة ===== */}
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="navy-head px-3 py-2 text-[15px]">معاينة — {activeSize.w}×{activeSize.h} مم</div>
          <div
            className="grid min-h-0 flex-1 grid-cols-2 content-start justify-items-center gap-2 overflow-auto bg-[#e9edf3] p-2"
            style={{ zoom: 0.72 }}
          >
            {preview.map(({ key, p }) =>
              p ? (
                <BarcodeLabel
                  key={key}
                  code={p.code}
                  name={p.name}
                  price={p.salePrice}
                  store={store}
                  showPrice={showPrice}
                  widthMm={activeSize.w}
                  heightMm={activeSize.h}
                />
              ) : null,
            )}
            {!preview.length && <div className="col-span-2 py-16 text-center text-[15px] font-bold text-slate-500">لا توجد ملصقات</div>}
          </div>
          <div className="shrink-0 border-t border-[#d5deea] bg-[#f4f8fd] px-2 py-1.5 text-[11px] font-bold text-slate-600">
            يُطبع {activeSize.perRow} ملصق في الصف الواحد على ورق A4. للتجربة: اطبع صفحة واحدة أولاً.
          </div>
        </div>
      </div>
    </Window>
  );
}
