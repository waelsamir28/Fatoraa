"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, MessageSquareHeart, RotateCcw, Save } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { useDesktop } from "@/components/win/DesktopProvider";

interface ThanksTemplate {
  enabled: boolean;
  showThanks: boolean;
  text: string;
  offerPercent: number;
  offerDays: number;
}

const VAR_HINT = "{name} اسم العميل · {store} اسم المحل · {total} قيمة الفاتورة · {offer} نسبة الخصم · {days} أيام العرض";

/** محرّر رسالة الشكر/العرض التلقائية بعد أول فاتورة — تبويب مستقل في الإعدادات */
export function ThanksMessageEditor() {
  const { toast } = useDesktop();
  const [t, setT] = useState<ThanksTemplate | null>(null);
  const [saved, setSaved] = useState<ThanksTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<ThanksTemplate>("/api/thanks")
      .then((r) => {
        setT(r);
        setSaved(r);
      })
      .catch((e) => toast(errMsg(e), "error"));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!t) return;
    setBusy(true);
    try {
      const r = await api<ThanksTemplate>("/api/thanks", { method: "PUT", json: t });
      setSaved(r);
      setT(r);
      toast("تم حفظ رسالة الترحيب والعرض ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const preview = (t?.text || "")
    .replaceAll("{name}", "أحمد محمد")
    .replaceAll("{store}", "مكتبة الفاتورة")
    .replaceAll("{total}", "125.00")
    .replaceAll("{offer}", String(t?.offerPercent ?? 5))
    .replaceAll("{days}", String(t?.offerDays ?? 15));

  if (!t) {
    return (
      <div className="grid h-40 place-items-center text-[14px] font-bold text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const dirty = saved && JSON.stringify(t) !== JSON.stringify(saved);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
          <MessageSquareHeart className="h-4 w-4 text-[#f5c518]" />
          رسالة الترحب والعرض التلقائي بعد أول فاتورة
        </div>

        <div className="space-y-2.5 p-3">
          <label className="flex items-center justify-between rounded-lg border border-[#c9d8ee] bg-[#f4f8fd] px-3 py-2">
            <div>
              <div className="text-[13.5px] font-black text-[#0f2942]">تفعيل الرسالة التلقائية</div>
              <div className="text-[11.5px] font-bold text-slate-600">
                تظهر جاهزة في نافذة المشاركة بعد حفظ أول فاتورة للعميل (مع زر إرسال واتساب فوري)
              </div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#2fb3a6]"
              checked={t.enabled}
              onChange={(e) => setT({ ...t, enabled: e.target.checked })}
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-[#c9d8ee] bg-white p-2">
              <div className="mb-1 flex items-center gap-1 text-[12.5px] font-black text-[#0f2942]">
                <Gift className="h-3.5 w-3.5 text-[#2fb3a6]" /> نسبة العرض الترحيبي
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t.offerPercent}
                  onChange={(e) => setT({ ...t, offerPercent: Number(e.target.value) || 0 })}
                  className="win-input num w-20 text-center font-black"
                />
                <span className="text-[13px] font-black text-slate-500">%</span>
                <span className="ms-auto text-[11px] font-bold text-slate-500">على الفاتورة القادمة</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#c9d8ee] bg-white p-2">
              <div className="mb-1 text-[12.5px] font-black text-[#0f2942]">صلاحية العرض (أيام)</div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={t.offerDays}
                  onChange={(e) => setT({ ...t, offerDays: Number(e.target.value) || 0 })}
                  className="win-input num w-20 text-center font-black"
                />
                <span className="text-[13px] font-black text-slate-500">يوم</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
              <span className="text-[13px] font-black text-[#0f2942]">نص الرسالة</span>
              <span className="text-[10.5px] font-bold text-slate-500">{VAR_HINT}</span>
            </div>
            <textarea
              value={t.text}
              onChange={(e) => setT({ ...t, text: e.target.value })}
              rows={9}
              className="win-input w-full resize-y font-bold leading-relaxed"
              dir="rtl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-green h-9 px-4 text-[13.5px] font-black"
              onClick={() => void save()}
              disabled={busy || !dirty}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ الرسالة
            </button>
            <button
              type="button"
              className="btn h-9 px-3 text-[13px] font-black"
              onClick={() => saved && setT(saved)}
              disabled={!dirty}
            >
              <RotateCcw className="h-4 w-4" /> تراجع
            </button>
            {dirty && <span className="text-[11.5px] font-black text-amber-700">⚠ توجد تعديلات غير محفوظة</span>}
          </div>
        </div>
      </div>

      {/* معاينة حية */}
      <div className="overflow-hidden rounded-xl border-2 border-emerald-300 bg-white shadow-sm">
        <div className="bg-emerald-700 px-3 py-1.5 text-[13px] font-black text-white">معاينة الرسالة كما يستلمها العميل</div>
        <pre className="max-h-[210px] overflow-auto whitespace-pre-wrap p-3 font-[inherit] text-[12.5px] font-bold leading-relaxed text-emerald-950">
          {preview}
        </pre>
      </div>
    </div>
  );
}
