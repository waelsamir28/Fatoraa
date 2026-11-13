"use client";

import { useEffect, useState } from "react";
import { Download, Edit2, FolderPlus, Pencil, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Dialog, Field, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconWarehouse } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { UNITS } from "@/lib/constants";
import { fmt, fmtQty } from "@/lib/format";
import type { Product } from "@/lib/types";

type ProductForm = {
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

const emptyForm = (defaultCat = "أدوات مدرسية"): ProductForm => ({
  code: "",
  name: "",
  unit: "قطعة",
  category: defaultCat,
  costPrice: "",
  wholesalePrice: "",
  salePrice: "",
  stock: "0",
  minStock: "0",
  imageUrl: "",
});

export function CategoriesProductsManager() {
  const { confirm, toast } = useDesktop();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("الكل");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<ProductForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // نوافذ إضافة وتعديل المجموعات
  const [addCatModal, setAddCatModal] = useState(false);
  const [editCatModal, setEditCatModal] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  const load = async () => {
    try {
      const r = await api<{ items: Product[]; categories: string[] }>("/api/products?limit=2000");
      setProducts(r.items);
      setCategories(r.categories);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = selectedCat === "الكل" || p.category === selectedCat;
    const matchQ = !q || p.name.includes(q) || p.code.includes(q);
    return matchCat && matchQ;
  });

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast("يرجى كتابة اسم المجموعة الجديدة", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/categories", {
        method: "POST",
        json: { name: newCatName.trim() },
      });
      toast(`تمت إضافة مجموعة "${newCatName.trim()}" بنجاح`);
      setNewCatName("");
      setAddCatModal(false);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editCatModal || !newCatName.trim()) {
      toast("يرجى كتابة الاسم الجديد للمجموعة", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/api/categories", {
        method: "PUT",
        json: { oldName: editCatModal, newName: newCatName.trim() },
      });
      toast(res.message);
      if (selectedCat === editCatModal) setSelectedCat(newCatName.trim());
      setEditCatModal(null);
      setNewCatName("");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!form || !form.name.trim()) {
      toast("يرجى كتابة اسم الصنف", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        wholesalePrice: Number(form.wholesalePrice) || Number(form.salePrice) || 0,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
      };

      if (form.id) {
        await api(`/api/products/${form.id}`, { method: "PUT", json: payload });
        toast("تم تعديل الصنف بنجاح");
      } else {
        await api("/api/products", { method: "POST", json: payload });
        toast("تمت إضافة الصنف بنجاح");
      }
      setForm(null);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!(await confirm(`هل أنت متأكد من حذف الصنف "${p.name}"؟`, { danger: true, title: "حذف صنف" }))) return;
    try {
      await api(`/api/products/${p.id}`, { method: "DELETE" });
      toast("تم حذف الصنف بنجاح");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const handleExcelUpload = async (file: File) => {
    setUploadingExcel(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (!rows.length) {
        toast("ملف الإكسيل فارغ!", "error");
        return;
      }

      // تحويل الأعمدة العربية
      const parsedItems = rows
        .map((r) => ({
          name: String(r["اسم الصنف"] || r["الاسم"] || r["الصنف"] || "").trim(),
          category: String(r["المجموعة"] || r["القسم"] || "عام").trim(),
          unit: String(r["العبوة"] || r["الوحدة"] || "قطعة").trim(),
          costPrice: Number(r["سعر الشراء"] || r["التكلفة"] || 0),
          salePrice: Number(r["سعر البيع"] || r["سعر القطاعي"] || r["السعر"] || 0),
          wholesalePrice: Number(r["سعر الجملة"] || r["الجملة"] || r["سعر البيع"] || 0),
          stock: Number(r["الرصيد الحالي"] || r["الرصيد"] || r["الكمية"] || 0),
          minStock: Number(r["الحد الأدنى"] || 0),
          code: String(r["الباركود"] || r["الكود"] || "").trim(),
        }))
        .filter((x) => x.name.length > 0);

      const res = await api<{ count: number }>("/api/products", {
        method: "POST",
        json: { bulk: parsedItems },
      });

      toast(`تم استيراد ${res.count} صنف من ملف الإكسيل بنجاح`);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setUploadingExcel(false);
    }
  };

  return (
    <Window title="الأصناف والمجموعات - إضافة وتعديل المجموعات والأصناف" icon={<IconWarehouse className="h-9 w-9" />}>
      <div className="grid h-full w-full grid-cols-[280px_1fr] gap-3 p-3">
        {/* المجموعات والأقسام مع أزرار الإضافة والتعديل */}
        <div className="panel flex min-h-0 flex-col overflow-hidden shadow-sm">
          <div className="navy-head flex items-center justify-between px-3 py-2 text-[15px]">
            <span>مجموعات وأقسام الأصناف</span>
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[12px] font-black text-white"
              onClick={() => {
                setNewCatName("");
                setAddCatModal(true);
              }}
              title="إضافة مجموعة جديدة"
            >
              <Plus className="h-3.5 w-3.5" />
              مجموعة جديدة
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-1.5 space-y-1">
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-right text-[14px] font-black transition ${
                selectedCat === "الكل" ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-800"
              }`}
              onClick={() => setSelectedCat("الكل")}
            >
              <span>جميع المجموعات والأقسام</span>
              <span className="num text-[12px] opacity-80">{products.length}</span>
            </button>

            {categories.map((c) => {
              const count = products.filter((p) => p.category === c).length;
              return (
                <div
                  key={c}
                  className={`group flex items-center justify-between rounded-md px-2.5 py-1.5 transition ${
                    selectedCat === c ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-right text-[13.5px] font-black truncate"
                    onClick={() => setSelectedCat(c)}
                  >
                    <span>{c}</span>
                    <span className="num text-[11px] opacity-75 mr-1.5">({count})</span>
                  </button>

                  {/* زر تعديل اسم المجموعة */}
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition text-inherit"
                    title={`تعديل اسم مجموعة "${c}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditCatModal(c);
                      setNewCatName(c);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#c8d8ea] p-2 bg-[#f4f7fb] space-y-1.5">
            <a
              href="/api/products/excel-template"
              download
              className="btn h-9 w-full text-[13px] font-black text-green-800 border-green-300"
            >
              <Download className="h-4 w-4" />
              تحميل نموذج الإكسيل الجاهز
            </a>

            <label className="btn btn-green h-9 w-full text-[13px] font-black cursor-pointer">
              <Upload className="h-4 w-4" />
              {uploadingExcel ? "جاري الاستيراد..." : "رفع شيت إكسيل بالأصناف"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={uploadingExcel}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleExcelUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* جدول الأصناف وعمليات التعديل والإضافة */}
        <div className="flex min-h-0 flex-col gap-2.5">
          <div className="panel flex shrink-0 items-center gap-2 p-2 shadow-sm">
            <button
              type="button"
              className="btn btn-green h-[38px] px-4 text-[15px] font-black"
              onClick={() => setForm(emptyForm(selectedCat === "الكل" ? "أدوات مدرسية" : selectedCat))}
            >
              <Plus className="h-5 w-5" strokeWidth={3} />
              إضافة صنف جديد
            </button>

            <div className="relative flex-1 max-w-[340px]">
              <input
                className="win-input h-[38px] w-full"
                placeholder="بحث بالاسم أو الباركود..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="ms-auto flex items-center gap-2">
              <span className="num text-[14px] font-bold text-slate-600">
                المعروض: <b>{filtered.length}</b> من {products.length} صنف
              </span>
              <button type="button" className="btn h-[38px] px-3" onClick={() => void load()} title="تحديث">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="panel min-h-0 flex-1 overflow-auto p-0 shadow-inner">
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th className="w-12">م</th>
                  <th className="text-right">اسم الصنف</th>
                  <th>المجموعة</th>
                  <th>العبوة</th>
                  <th>سعر الشراء</th>
                  <th>سعر البيع</th>
                  <th>سعر الجملة</th>
                  <th>الرصيد</th>
                  <th>الحد الأدنى</th>
                  <th className="w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td className="num font-bold">{i + 1}</td>
                    <td className="max-w-[240px] truncate text-right font-black text-blue-900">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.unit}</td>
                    <td className="num">{fmt(p.costPrice)}</td>
                    <td className="num font-black text-green-700">{fmt(p.salePrice)}</td>
                    <td className="num font-bold text-orange-600">{fmt(p.wholesalePrice)}</td>
                    <td className={`num font-black ${p.stock <= p.minStock ? "text-red-600" : ""}`}>{fmtQty(p.stock)}</td>
                    <td className="num">{fmtQty(p.minStock)}</td>
                    <td className="p-1">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          className="btn h-7 w-8 p-0"
                          title="تعديل"
                          onClick={() =>
                            setForm({
                              id: p.id,
                              code: p.code,
                              name: p.name,
                              unit: p.unit,
                              category: p.category,
                              costPrice: String(p.costPrice),
                              salePrice: String(p.salePrice),
                              wholesalePrice: String(p.wholesalePrice),
                              stock: String(p.stock),
                              minStock: String(p.minStock),
                              imageUrl: p.imageUrl,
                            })
                          }
                        >
                          <Pencil className="h-4 w-4 text-blue-700" />
                        </button>
                        <button
                          type="button"
                          className="btn h-7 w-8 p-0"
                          title="حذف"
                          onClick={() => void deleteProduct(p)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr className="empty">
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-bold">
                      لا توجد أصناف في هذه المجموعة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* نافذة إضافة مجموعة جديدة */}
      {addCatModal && (
        <Dialog title="إضافة مجموعة / قسم أصناف جديد" onClose={() => setAddCatModal(false)} width={420}>
          <div className="space-y-3">
            <Field label="اسم المجموعة الجديدة *">
              <input
                autoFocus
                className="win-input w-full font-bold text-blue-900"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="مثال: شنط مدرسية / هدايا وتحف..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddCategory();
                }}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-green h-9 flex-1 font-black"
                onClick={() => void handleAddCategory()}
                disabled={busy}
              >
                حفظ وإضافة المجموعة
              </button>
              <button type="button" className="btn h-9 px-4" onClick={() => setAddCatModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* نافذة تعديل اسم مجموعة قائمة */}
      {editCatModal && (
        <Dialog title={`تعديل اسم مجموعة: "${editCatModal}"`} onClose={() => setEditCatModal(null)} width={420}>
          <div className="space-y-3">
            <Field label="الاسم الجديد للمجموعة *">
              <input
                autoFocus
                className="win-input w-full font-bold text-blue-900"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="اكتب الاسم الجديد للمجموعة..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleEditCategory();
                }}
              />
            </Field>
            <div className="text-[12px] font-bold text-slate-500">
              سيتم تعديل اسم المجموعة تلقائياً في كل الأصناف التابعة لها.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-blue h-9 flex-1 font-black"
                onClick={() => void handleEditCategory()}
                disabled={busy}
              >
                حفظ التعديل
              </button>
              <button type="button" className="btn h-9 px-4" onClick={() => setEditCatModal(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {form && (
        <Dialog
          title={form.id ? `تعديل الصنف: ${form.name}` : "إضافة صنف ومجموعة جديدة"}
          onClose={() => setForm(null)}
          width={640}
          footer={
            <>
              <button
                type="button"
                className="btn btn-green h-9 px-6 font-black"
                onClick={() => void saveProduct()}
                disabled={busy}
              >
                <Save className="h-4 w-4" />
                {busy ? "جاري الحفظ..." : "حفظ الصنف"}
              </button>
              <button type="button" className="btn h-9 px-5" onClick={() => setForm(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الصنف *" className="col-span-2">
              <input
                autoFocus
                className="win-input w-full font-black text-blue-900"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <Field label="المجموعة / القسم">
              <input
                className="win-input w-full"
                list="all-cats"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="أدوات مدرسية / كروت أفراح / طباعة..."
              />
              <datalist id="all-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="العبوة أو الوحدة">
              <input
                className="win-input w-full"
                list="all-units"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
              <datalist id="all-units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>

            <Field label="الباركود (اتركه فارغاً للتوليد التلقائي)">
              <input
                className="win-input num w-full"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="توليد تلقائي"
              />
            </Field>

            <Field label="سعر الشراء (التكلفة)">
              <input
                className="win-input num w-full"
                inputMode="decimal"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </Field>

            <Field label="سعر البيع (قطاعي) *">
              <input
                className="win-input num w-full font-black text-green-700"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              />
            </Field>

            <Field label="سعر الجملة">
              <input
                className="win-input num w-full font-bold text-orange-600"
                inputMode="decimal"
                value={form.wholesalePrice}
                onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
              />
            </Field>

            <Field label="الرصيد الحالي بالمخزن">
              <input
                className="win-input num w-full font-black"
                inputMode="decimal"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>

            <Field label="حد التنبيه الأدنى">
              <input
                className="win-input num w-full"
                inputMode="decimal"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </Field>

            <div className="col-span-2">
              <span className="form-label">صورة الصنف (رفع من الكمبيوتر)</span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => setForm({ ...form, imageUrl: reader.result as string });
                      reader.readAsDataURL(f);
                    }
                  }}
                />
                {form.imageUrl && (
                  <span className="text-[12px] font-black text-green-700">✓ تم اختيار صورة للصنف</span>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
