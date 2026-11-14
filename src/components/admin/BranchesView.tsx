"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Store, Trash2, Users } from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";

interface BranchRow {
  id: number;
  code: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  totalSales: number;
  invoiceCount: number;
  staff: number;
}

const money = (v: number) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const empty = { id: 0, name: "", code: "", address: "", phone: "", active: true };

export function BranchesView() {
  const { toast, confirm } = useDesktop();
  const [items, setItems] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof empty | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: BranchRow[] }>("/api/branches");
      setItems(r.items);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast("اسم الفرع مطلوب", "error");
    setBusy(true);
    try {
      if (form.id) {
        await api("/api/branches", { method: "PATCH", json: form });
        toast("تم تحديث الفرع ✓");
      } else {
        await api("/api/branches", { method: "POST", json: form });
        toast("تم إضافة الفرع ✓");
      }
      setForm(null);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: BranchRow) => {
    const ok = await confirm(`حذف الفرع «${b.name}»؟\nلو عليه فواتير لن يُحذف — يمكنك إيقافه بدلاً من ذلك.`);
    if (!ok) return;
    try {
      await api(`/api/branches?id=${b.id}`, { method: "DELETE" });
      toast("تم حذف الفرع");
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const totalSales = items.reduce((a, b) => a + Number(b.totalSales || 0), 0);

  return (
    <Window
      title="الفروع"
      icon={<IconSettings className="h-9 w-9" />}
      statusBar={<span>عدد الفروع: {items.length} — إجمالي المبيعات: {money(totalSales)}</span>}
    >
      <div className="h-full overflow-auto p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[14px] font-bold text-slate-600">
            أضف فروعك لفصل المبيعات والمخازن لكل فرع، مع إمكانية متابعة الأداء من شاشة واحدة.
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...empty })}
            className="btn btn-blue flex h-9 items-center gap-1.5 px-3 text-[13.5px]"
          >
            <Plus className="h-4 w-4" /> فرع جديد
          </button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <div key={b.id} className="panel overflow-hidden p-0">
                <div className="flex items-center justify-between bg-gradient-to-l from-[#0b4cc2] to-[#0b2350] px-3 py-2 text-white">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-300" />
                    <span className="text-[14.5px] font-black">{b.name}</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10.5px] font-black ${
                      b.active ? "bg-emerald-400/90 text-emerald-950" : "bg-red-400/90 text-red-950"
                    }`}
                  >
                    {b.active ? "يعمل" : "موقوف"}
                  </span>
                </div>
                <div className="space-y-1.5 p-3 text-[12.5px] font-bold text-slate-700">
                  <Line label="الكود" value={b.code} mono />
                  {b.phone && <Line label="تليفون" value={b.phone} mono />}
                  {b.address && <Line label="العنوان" value={b.address} />}
                  <div className="my-1 border-t border-slate-200" />
                  <Line label="مبيعات الفرع" value={money(b.totalSales)} mono />
                  <Line label="عدد الفواتير" value={String(b.invoiceCount)} mono />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Users className="h-3.5 w-3.5" /> الموظفون
                    </span>
                    <span className="num font-black">{b.staff}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 border-t bg-[#f7faff] px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        id: b.id,
                        name: b.name,
                        code: b.code,
                        address: b.address,
                        phone: b.phone,
                        active: b.active,
                      })
                    }
                    className="btn flex h-8 flex-1 items-center justify-center gap-1 text-[12px]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api("/api/branches", { method: "PATCH", json: { id: b.id, active: !b.active } });
                        await load();
                      } catch (e) {
                        toast(errMsg(e), "error");
                      }
                    }}
                    className="btn flex h-8 flex-1 items-center justify-center gap-1 text-[12px]"
                  >
                    <Store className="h-3.5 w-3.5" /> {b.active ? "إيقاف" : "تشغيل"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="btn btn-red flex h-8 items-center justify-center px-2 text-[12px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!items.length && (
              <div className="panel col-span-full p-8 text-center text-[14px] font-bold text-slate-500">
                لا يوجد فروع بعد — أضف أول فرع بالزر أعلى الشاشة.
              </div>
            )}
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(5,20,55,.45)] p-4">
          <div className="w-full max-w-[430px] overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0b2350] px-4 py-2.5 text-white">
              <div className="flex items-center gap-2 text-[15px] font-black">
                <Building2 className="h-4 w-4" /> {form.id ? "تعديل فرع" : "فرع جديد"}
              </div>
              <button type="button" onClick={() => setForm(null)} className="rounded px-2 hover:bg-white/20">
                ✕
              </button>
            </div>
            <div className="space-y-2.5 p-4">
              {[
                { k: "name" as const, label: "اسم الفرع", ph: "الفرع الرئيسي" },
                { k: "code" as const, label: "كود الفرع", ph: "BR01" },
                { k: "phone" as const, label: "تليفون", ph: "01xxxxxxxxx" },
                { k: "address" as const, label: "العنوان", ph: "المدينة - الشارع" },
              ].map((f) => (
                <div key={f.k}>
                  <label className="mb-0.5 block text-[12px] font-black text-slate-600">{f.label}</label>
                  <input
                    value={form[f.k] as string}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    placeholder={f.ph}
                    className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t bg-[#f7faff] px-4 py-2.5">
              <button type="button" onClick={() => setForm(null)} className="btn h-9 px-3 text-[13px]">
                إلغاء
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="btn btn-green flex h-9 items-center gap-1.5 px-4 text-[13px] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </Window>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-black ${mono ? "num" : ""}`}>{value}</span>
    </div>
  );
}
