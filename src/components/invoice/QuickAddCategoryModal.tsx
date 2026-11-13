"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FolderPlus, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Dialog, Field } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";

interface CatRow {
  category: string;
  count: number;
}

/** إدارة مجموعات الأصناف: إضافة مجموعة جديدة + عرض المجموعات الحالية مع التعديل والحذف */
export function QuickAddCategoryModal({
  onClose,
  onCategoryAdded,
  onChanged,
}: {
  onClose: () => void;
  onCategoryAdded: (catName: string) => void;
  /** تُستدعى عند أي تعديل أو حذف لتحديث القوائم المنسدلة في الفاتورة */
  onChanged?: () => void;
}) {
  const { confirm, toast } = useDesktop();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ categories: CatRow[] }>("/api/categories");
      setRows(r.categories);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const cat = name.trim();
    if (!cat) {
      toast("يرجى كتابة اسم المجموعة الجديدة", "error");
      return;
    }
    if (rows.some((r) => r.category === cat)) {
      toast("هذه المجموعة موجودة بالفعل", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/categories", { method: "POST", json: { name: cat } });
      toast(`تمت إضافة مجموعة "${cat}" بنجاح ✓`);
      onCategoryAdded(cat);
      setName("");
      await load();
      onChanged?.();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (oldName: string) => {
    const next = editName.trim();
    if (!next || next === oldName) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ message: string }>("/api/categories", {
        method: "PUT",
        json: { oldName, newName: next },
      });
      toast(r.message);
      setEditing(null);
      await load();
      onCategoryAdded(next);
      onChanged?.();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: CatRow) => {
    const ok = await confirm(
      `حذف مجموعة "${row.category}"؟\nسيتم نقل ${row.count} صنف إلى مجموعة (عام) ولن تُحذف الأصناف.`,
      { title: "حذف مجموعة", danger: true, okText: "حذف", cancelText: "إلغاء", kind: "warning" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api<{ message: string }>(`/api/categories?name=${encodeURIComponent(row.category)}`, {
        method: "DELETE",
      });
      toast(r.message);
      await load();
      onChanged?.();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const totalProducts = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Dialog
      title="إدارة مجموعات الأصناف"
      onClose={onClose}
      width={640}
      footer={
        <button type="button" className="btn h-9 px-5 font-bold" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <div className="space-y-3">
        {/* إضافة مجموعة جديدة */}
        <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[14.5px] font-black text-emerald-900">
            <FolderPlus className="h-4 w-4" />
            تسجيل مجموعة جديدة
          </div>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="form-label">اسم المجموعة الجديدة *</span>
              <input
                autoFocus
                className="win-input w-full font-bold text-blue-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void add();
                }}
                placeholder="مثال: شنط مدرسية / هدايا وتحف / ورق طباعة..."
              />
            </label>
            <button type="button" className="btn btn-green h-[34px] shrink-0 px-4 text-[14px] font-black" onClick={() => void add()} disabled={busy}>
              <Plus className="h-4 w-4 stroke-[3]" />
              إضافة
            </button>
          </div>
        </div>

        {/* قائمة المجموعات الحالية */}
        <div className="overflow-hidden rounded-lg border border-[#b4c4dc]">
          <div className="navy-head flex items-center justify-between px-3 py-1.5 text-[13.5px]">
            <span>المجموعات الموجودة حالياً ({rows.length})</span>
            <span className="num text-[12px] opacity-90">{totalProducts} صنف</span>
          </div>
          <div className="max-h-[46vh] overflow-auto bg-white">
            <table className="dgrid text-center text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-10">م</th>
                  <th className="text-right">اسم المجموعة</th>
                  <th className="w-24">عدد الأصناف</th>
                  <th className="w-28">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isEdit = editing === r.category;
                  return (
                    <tr key={r.category} className={isEdit ? "sel" : ""}>
                      <td className="num font-bold">{i + 1}</td>
                      <td className="text-right">
                        {isEdit ? (
                          <input
                            autoFocus
                            className="win-input h-7 w-full font-black text-blue-900"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveEdit(r.category);
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          <span className="font-black text-[#0f2e5a]">{r.category}</span>
                        )}
                      </td>
                      <td className="num font-bold text-slate-600">{r.count}</td>
                      <td className="p-1">
                        <div className="flex justify-center gap-1">
                          {isEdit ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-green h-7 w-8 p-0"
                                title="حفظ التعديل"
                                onClick={() => void saveEdit(r.category)}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button type="button" className="btn h-7 w-8 p-0" title="إلغاء" onClick={() => setEditing(null)}>
                                <X className="h-4 w-4 text-slate-600" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn h-7 w-8 p-0"
                                title="تعديل اسم المجموعة"
                                onClick={() => {
                                  setEditing(r.category);
                                  setEditName(r.category);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-blue-700" />
                              </button>
                              <button type="button" className="btn h-7 w-8 p-0" title="حذف المجموعة" onClick={() => void remove(r)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && !loading && (
                  <tr className="empty">
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-bold">
                      لا توجد مجموعات بعد — أضف أول مجموعة من الأعلى
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr className="empty">
                    <td colSpan={4} className="py-6 text-center text-slate-500 font-bold">
                      جاري التحميل...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
          <span>حذف المجموعة ينقل أصنافها إلى مجموعة (عام) ولا يحذف الأصناف نفسها.</span>
          <button type="button" className="btn h-7 px-2 text-[11.5px] font-black" onClick={() => void load()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>
    </Dialog>
  );
}
