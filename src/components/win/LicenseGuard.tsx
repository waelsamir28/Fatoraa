"use client";

import { useEffect, useState } from "react";
import { KeyRound, Lock, Phone, ShieldCheck, Copy, Check, Layers, Tag } from "lucide-react";
import { ActivationPlans } from "@/components/win/ActivationPlans";
import { RenewalReminder } from "@/components/license/RenewalReminder";
import { SUPPORT_PHONE } from "@/lib/constants";
import { resolveLogo } from "@/lib/logo";

interface LicenseInfo {
  isActivated: boolean;
  isExpired: boolean;
  isClockTampered: boolean;
  daysLeft: number;
  machineId: string;
  plan?: string | null;
  planLabel?: string;
  expiresAt?: string | null;
  planDaysLeft?: number | null;
  limits: { maxProducts: number; maxInvoices: number };
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // صفحة أنظمة التفعيل (الأسعار) — تُعرض قبل إدخال الكود
  const [showPlans, setShowPlans] = useState(false);

  const fetchLicense = async () => {
    try {
      const res = await fetch("/api/license");
      if (res.ok) {
        const data: LicenseInfo = await res.json();
        setInfo(data);
        if (data.isExpired) setModalOpen(true);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchLicense();
    // الاستماع لحدث طلب التفعيل من أي صفحة (عند الوصول للحد الأقصى للأصناف أو الفواتير)
    const onOpen = () => setModalOpen(true);
    window.addEventListener("fatora:open-license", onOpen);
    return () => window.removeEventListener("fatora:open-license", onOpen);
  }, []);

  const copyId = () => {
    if (!info?.machineId) return;
    navigator.clipboard.writeText(info.machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("يرجى إدخال كود التفعيل أولاً");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: code.trim(), machineId: info?.machineId || "" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setInfo(data.status);
        setModalOpen(false);
        setCode("");
        // رسالة تهانينا بتصميم البرنامج نفسه (مش alert المتصفح)
        setActivated(true);
      } else {
        setError(data.error || "كود التفعيل غير صحيح");
      }
    } catch {
      setError("تعذر التحقق من الكود، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      <RenewalReminder />

      {/* ===== نافذة التهانئة بعد التفعيل — بنفس هوية البرنامج ===== */}
      {activated && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-l from-[#164066] to-[#0f2942] px-5 pb-5 pt-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveLogo()}
                alt="FATORA"
                className="mx-auto h-[64px] w-auto object-contain drop-shadow-lg"
              />
            </div>

            <div className="relative px-6 pb-5 pt-8 text-center">
              {/* علامة الصح الخضراء */}
              <div className="absolute -top-7 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-emerald-500 shadow-lg">
                <Check className="h-7 w-7 stroke-[4] text-white" />
              </div>

              <div className="mt-2 text-[20px] font-black text-[#0f2942]">تهانينا 🎉</div>
              <div className="mt-1 text-[14.5px] font-bold leading-relaxed text-slate-600">
                لقد تم تفعيل البرنامج بنجاح
              </div>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-800">
                النسخة الكاملة مفعّلة الآن — يمكنك استخدام البرنامج بلا حدود.
              </div>

              <button
                type="button"
                onClick={() => setActivated(false)}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-[#0f2942] text-[14px] font-black text-white hover:bg-[#1b3f5f]"
              >
                ابدأ الاستخدام
              </button>

              <div className="mt-3 text-[10.5px] font-bold text-slate-400">
                تحياتى — م/ وائل الجمال
              </div>
            </div>
          </div>
        </div>
      )}

      {/* شريط عائم صغير للنسخة التجريبية */}
      {info && !info.isActivated && !info.isExpired && (
        <div className="fixed bottom-8 left-3 z-40 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-1.5 text-[12px] font-bold text-amber-950 shadow-lg">
          <KeyRound className="h-4 w-4 text-amber-600" />
          <span>نسخة تجريبية (متبقي {info.daysLeft} يوم)</span>
          <button
            type="button"
            onClick={() => {
              setShowPlans(false);
              setModalOpen(true);
            }}
            className="rounded bg-blue-700 px-2 py-0.5 text-[11px] font-black text-white hover:bg-blue-800"
          >
            تفعيل الآن
          </button>
        </div>
      )}

      {/* شريط حالة الاشتراك (سنة / سنتين) للنسخة المفعّلة */}
      {info?.isActivated && info.plan && info.plan !== "lifetime" && info.planDaysLeft !== null && (
        <div className="fixed bottom-8 left-3 z-40 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/95 px-3 py-1.5 text-[12px] font-bold text-emerald-900 shadow-lg">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            {info.planLabel} — متبقي {info.planDaysLeft} يوم
          </span>
          <button
            type="button"
            onClick={() => {
              setShowPlans(true);
              setModalOpen(true);
            }}
            className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-black text-white hover:bg-emerald-800"
          >
            تجديد
          </button>
        </div>
      )}

      {/* نافذة التفعيل المنبثقة */}
      {info && modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-blue-600 bg-white shadow-2xl">
            <div className="bg-gradient-to-l from-blue-800 to-blue-600 p-4 text-white">
              <div className="flex items-center gap-2 text-lg font-black">
                <Lock className="h-5 w-5 text-amber-300" />
                <span>
                  {info.isClockTampered
                    ? "تم اكتشاف تغيير في تاريخ الجهاز"
                    : info.isExpired
                      ? "انتهت الفترة التجريبية للبرنامج"
                      : "تفعيل النسخة الكاملة من FATORA"}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-blue-100">
                اختر نظام التفعيل المناسب (سنة / سنتين / مدى الحياة) وأرسل كود جهازك للدعم لاستلام كود التفعيل.
              </p>
            </div>

            <div className="space-y-4 p-5 text-right">
              {/* الخطة الحالية (لو فيه اشتراك منتهي) */}
              {info.plan && info.planLabel && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Tag className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-bold">الاشتراك الحالي: {info.planLabel}</span>
                  </div>
                  <b className="text-sm font-black text-amber-700">
                    {info.expiresAt ? `انتهى في ${new Date(info.expiresAt).toLocaleDateString("ar-EG")}` : "—"}
                  </b>
                </div>
              )}

              {/* زر أنظمة التفعيل والأسعار */}
              <button
                type="button"
                onClick={() => setShowPlans(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1a6fd0] bg-[#f2f8ff] py-2.5 text-[13.5px] font-black text-[#0f2942] hover:bg-[#e4f1ff]"
              >
                <Layers className="h-4.5 w-4.5 text-[#1a6fd0]" />
                عرض أنظمة التفعيل والأسعار (سنة / سنتين / مدى الحياة)
              </button>

              {/* رقم الدعم الفني */}
              <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-green-900">
                  <Phone className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-bold">الدعم الفني والمبيعات:</span>
                </div>
                <b className="num text-lg font-black text-green-700" dir="ltr">
                  {SUPPORT_PHONE}
                </b>
              </div>

              {/* كود بصمة الجهاز */}
              <div>
                <label className="mb-1 block text-xs font-black text-slate-600">
                  كود الجهاز الخاص بك (أرسله للدعم الفني):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={info.machineId}
                    dir="ltr"
                    className="w-full rounded-lg border-2 border-slate-300 bg-slate-100 px-3 py-2 text-center font-mono text-base font-black tracking-wider text-slate-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={copyId}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "تم النسخ" : "نسخ"}</span>
                  </button>
                </div>
              </div>

              {/* إدخال كود التفعيل */}
              <form onSubmit={handleActivate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-black text-slate-700">
                    أدخل كود التفعيل (Activation Key):
                  </label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    dir="ltr"
                    className="w-full rounded-lg border-2 border-blue-400 px-3 py-2.5 text-center font-mono text-lg font-black tracking-widest uppercase focus:border-blue-700 focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-2 text-center text-xs font-bold text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-sm font-black text-white shadow hover:bg-blue-800 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-5 w-5" />
                    <span>{loading ? "جاري التحقق..." : "تفعيل البرنامج الآن"}</span>
                  </button>

                  {!info.isExpired && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                    >
                      متابعة التجربة
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== صفحة أنظمة التفعيل (الأسعار والمدد) ===== */}
      {info && modalOpen && showPlans && (
        <ActivationPlans
          machineId={info.machineId}
          currentPlan={(info.plan as never) || null}
          currentDaysLeft={info.planDaysLeft ?? null}
          onClose={() => setShowPlans(false)}
        />
      )}
    </>
  );
}
