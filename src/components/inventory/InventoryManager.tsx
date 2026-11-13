"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, RefreshCw, Save, Search, Trash2, Wand2 } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconWarehouse } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { UNITS } from "@/lib/constants";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

type Form = {
  id?: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  costPrice: string;
  wholesalePrice: string;
  salePrice: string;
  stock: string;
  minStock: string;
  imageUrl: string;
};

const emptyForm = (): Form => ({
  code: "",
  name: "",
  unit: "قطعة",
  category: "",
  costPrice: "",
  wholesalePrice: "",
  salePrice: "",
  stock: "0",
  minStock: "0",
  imageUrl: "",
});

const toForm = (p: Product): Form => ({
  id: p.id,
  code: p.code,
  name: p.name,
  unit: p.unit,
  category: p.category,
  costPrice: String(p.costPrice),
  wholesalePrice: String(p.wholesalePrice),
  salePrice: String(p.salePrice),
  stock: String(p.stock),
  minStock: String(p.minStock),
  imageUrl: p.imageUrl,
});

export function InventoryManager() {
  const { confirm, toast } = useDesktop();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Product[]; categories: string[] }>("/api/products?limit=2000");
      setItems(r.items);
      setCategories(r.categories);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (p) =>
        (!category || p.category === category) &&
        (!lowOnly || p.stock <= p.minStock) &&
        (!s || p.name.toLowerCase().includes(s) || p.code.includes(s)),
    );
  }, [items, q, category, lowOnly]);

  const stats = useMemo(
    () => ({
      count: items.length,
      qty: items.reduce((s, p) => s + p.stock, 0),
      cost: items.reduce((s, p) => s + p.stock * p.costPrice, 0),
      sale: items.reduce((s, p) => s + p.stock * p.salePrice, 0),
      low: items.filter((p) => p.stock <= p.minStock).length,
    }),
    [items],
  );
  const selected = items.find((p) => p.id === sel) ?? null;

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast("يجب إدخال اسم الصنف", "error");
      return;
    }
    setBusy(true);
    try {
      const sale = Number(form.salePrice) || 0;
      const payload = {
        ...form,
        costPrice: Number(form.costPrice) || 0,
        salePrice: sale,
        wholesalePrice: form.wholesalePrice.trim() === "" ? sale : Number(form.wholesalePrice) || 0,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
      };
      const p = form.id
        ? await api<Product>(`/api/products/${form.id}`, { method: "PUT", json: payload })
        : await api<Product>("/api/products", { method: "POST", json: payload });
      toast(form.id ? `تم تعديل الصنف "${p.name}"` : `تم إضافة الصنف "${p.name}"`);
      setForm(null);
      setSel(p.id);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (p: Product) => {
    const ok = await confirm(`هل تريد حذف الصنف "${p.name}"؟\n(لن تتأثر الفواتير السابقة)`, {
      title: "حذف صنف",
      danger: true,
      okText: "حذف",
      cancelText: "إلغاء",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await api(`/api/products/${p.id}`, { method: "DELETE" });
      toast("تم حذف الصنف");
      setSel(null);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const exportCsv = () => {
    const header = ["الكود", "الصنف", "المجموعة", "العبوة", "سعر الشراء", "سعر الجملة", "سعر البيع", "الرصيد", "الحد الأدنى", "قيمة المخزون"];
    const rows = list.map((p) => [p.code, p.name, p.category, p.unit, p.costPrice, p.wholesalePrice, p.salePrice, p.stock, p.minStock, (p.stock * p.costPrice).toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aljamal-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <Window
      title="المخازن - إدارة الأصناف"
      icon={<IconWarehouse className="h-9 w-9" />}
      statusBar={
        <>
          <span>عدد الأصناف: {stats.count}</span>
          <span className="sep" />
          <span>المعروض: {list.length}</span>
          <span className="sep" />
          <span className={stats.low ? "text-red-600" : ""}>أصناف ناقصة: {stats.low}</span>
          <span className="ms-auto">{loading ? "جاري التحميل..." : "اضغط مرتين على الصنف للتعديل"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="panel flex flex-wrap items-center gap-2 p-2">
          <button type="button" className="btn btn-green h-[40px] px-4 text-[15px]" onClick={() => setForm(emptyForm())}>
            <Plus className="h-5 w-5" strokeWidth={3} />
            صنف جديد
          </button>
          <button type="button" className="btn h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && setForm(toForm(selected))}>
            <Pencil className="h-5 w-5 text-blue-700" />
            تعديل
          </button>
          <button type="button" className="btn btn-red h-[40px] px-4 text-[15px]" disabled={!selected} onClick={() => selected && void del(selected)}>
            <Trash2 className="h-5 w-5" />
            حذف
          </button>
          <button type="button" className="btn h-[40px] px-4 text-[15px]" onClick={() => void load()}>
            <RefreshCw className={`h-5 w-5 text-blue-700 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button type="button" className="btn h-[40px] px-4 text-[15px]" onClick={exportCsv}>
            <Download className="h-5 w-5 text-green-700" />
            تصدير Excel
          </button>
          <div className="ms-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="win-input h-[40px] w-[260px] pr-8" placeholder="بحث بالاسم أو الباركود..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="win-input h-[40px] w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">كل المجموعات</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="panel flex h-[40px] cursor-pointer items-center gap-2 px-3 text-[14px] font-extrabold text-red-700">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              النواقص فقط
            </label>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-5 gap-3">
          <Kpi label="عدد الأصناف" value={stats.count} color="navy" />
          <Kpi label="إجمالي الكميات" value={fmtQty(Math.round(stats.qty * 1000) / 1000)} color="teal" />
          <Kpi label="قيمة المخزون (شراء)" value={fmt(stats.cost)} color="blue" sub="ج.م" />
          <Kpi label="قيمة المخزون (بيع)" value={fmt(stats.sale)} color="green" sub={`ربح متوقع ${fmt(stats.sale - stats.cost)}`} />
          <Kpi label="أصناف ناقصة" value={stats.low} color="red" sub="وصلت للحد الأدنى" />
        </div>

        <div className="panel min-h-0 flex-1 overflow-auto p-0">
          <table className="dgrid text-center text-[14px]">
            <thead>
              <tr>
                <th>م</th>
                <th>الباركود</th>
                <th className="text-right">الصنف</th>
                <th>المجموعة</th>
                <th>العبوة</th>
                <th>سعر الشراء</th>
                <th>سعر الجملة</th>
                <th>سعر البيع</th>
                <th>الرصيد</th>
                <th>الحد الأدنى</th>
                <th>قيمة المخزون</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => {
                const s = sel === p.id;
                const status = p.stock <= 0 ? ["نفد", "bg-red-100 text-red-700"] : p.stock <= p.minStock ? ["ناقص", "bg-orange-100 text-orange-700"] : ["متوفر", "bg-green-100 text-green-700"];
                return (
                  <tr key={p.id} className={`clickable ${s ? "sel" : ""}`} onClick={() => setSel(p.id)} onDoubleClick={() => setForm(toForm(p))}>
                    <td className="num">{i + 1}</td>
                    <td className="num text-[13px]">{p.code}</td>
                    <td className="max-w-[240px] truncate text-right font-extrabold">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.unit}</td>
                    <td className="num">{fmt(p.costPrice)}</td>
                    <td className="num">{fmt(p.wholesalePrice)}</td>
                    <td className="num font-black">{fmt(p.salePrice)}</td>
                    <td className={`num font-black ${!s && p.stock <= p.minStock ? "text-red-600" : ""}`}>{fmtQty(p.stock)}</td>
                    <td className="num">{fmtQty(p.minStock)}</td>
                    <td className="num">{fmt(p.stock * p.costPrice)}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-black ${status[1]}`}>{status[0]}</span>
                    </td>
                    <td className="p-1">
                      <div className="flex justify-center gap-1">
                        <button type="button" className="btn h-7 w-8 p-0" title="تعديل" onClick={(e) => { e.stopPropagation(); setForm(toForm(p)); }}>
                          <Pencil className="h-4 w-4 text-blue-700" />
                        </button>
                        <button type="button" className="btn h-7 w-8 p-0" title="حذف" onClick={(e) => { e.stopPropagation(); void del(p); }}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr className="empty">
                  <td colSpan={13} className="py-10 text-slate-500">
                    {loading ? "جاري التحميل..." : "لا توجد أصناف مطابقة"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Dialog
          title={form.id ? `تعديل الصنف: ${form.name}` : "إضافة صنف جديد"}
          onClose={() => setForm(null)}
          width={680}
          icon={<IconWarehouse className="h-6 w-6" />}
          footer={
            <>
              <button type="button" className="btn btn-green h-9 px-6" onClick={() => void save()} disabled={busy}>
                <Save className="h-4 w-4" />
                {busy ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setForm(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الصنف *" className="col-span-2">
              <input autoFocus className="win-input w-full" value={form.name} onChange={set("name")} />
            </Field>
            <Field label="الباركود / الكود (اتركه فارغاً للتوليد التلقائي)">
              <div className="flex gap-1">
                <input className="win-input num w-full" dir="ltr" value={form.code} onChange={set("code")} />
                <button type="button" className="btn h-[34px] w-[40px] shrink-0 p-0" title="توليد باركود" onClick={() => setForm({ ...form, code: `62${Date.now().toString().slice(-11)}` })}>
                  <Wand2 className="h-4 w-4 text-purple-700" />
                </button>
              </div>
            </Field>
            <Field label="المجموعة">
              <input className="win-input w-full" list="cats" value={form.category} onChange={set("category")} placeholder="مثال: مشروبات" />
              <datalist id="cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="العبوة / الوحدة">
              <input className="win-input w-full" list="units" value={form.unit} onChange={set("unit")} />
              <datalist id="units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
            <Field label="سعر الشراء (التكلفة)">
              <input className="win-input num w-full" inputMode="decimal" value={form.costPrice} onChange={set("costPrice")} />
            </Field>
            <Field label="سعر البيع (قطاعي)">
              <input className="win-input num w-full" inputMode="decimal" value={form.salePrice} onChange={set("salePrice")} />
            </Field>
            <Field label="سعر الجملة">
              <input className="win-input num w-full" inputMode="decimal" value={form.wholesalePrice} onChange={set("wholesalePrice")} placeholder="نفس سعر البيع" />
            </Field>
            <Field label={form.id ? "الرصيد الحالي (تسوية جرد)" : "رصيد أول المدة"}>
              <input className="win-input num w-full" inputMode="decimal" value={form.stock} onChange={set("stock")} />
            </Field>
            <Field label="الحد الأدنى للتنبيه">
              <input className="win-input num w-full" inputMode="decimal" value={form.minStock} onChange={set("minStock")} />
            </Field>
            <Field label="رابط صورة الصنف (اختياري)" className="col-span-2">
              <input className="win-input w-full" dir="ltr" value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://..." />
            </Field>
            {Number(form.salePrice) > 0 && (
              <div className="col-span-2 rounded-lg border border-green-200 bg-green-50 p-2 text-center text-[14px] font-extrabold text-green-800">
                ربح الوحدة: {fmt((Number(form.salePrice) || 0) - (Number(form.costPrice) || 0))} ج.م — نسبة الربح:{" "}
                {Number(form.costPrice) > 0 ? fmt((((Number(form.salePrice) || 0) - Number(form.costPrice)) / Number(form.costPrice)) * 100, 1) : "-"}%
              </div>
            )}
          </div>
        </Dialog>
      )}
    </Window>
  );
}
