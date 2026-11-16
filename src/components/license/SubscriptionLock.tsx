"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Tag,
} from "lucide-react";
import { SUPPORT_PERSON, SUPPORT_PHONE, DEFAULT_LOGO } from "@/lib/constants";

export interface LockInfo {
  isActivated: boolean;
  daysLeft?: number;
  limits?: { maxProducts: number; maxInvoices: number };
  isExpired: boolean;
  isClockTampered?: boolean;
  machineId: string;
  plan?: string | null;
  planLabel?: string;
  expiresAt?: string | null;
  planDaysLeft?: number | null;
}

/**
 * شاشة «انتهى الاشتراك» — قفل كامل للبرنامج.
 * البيانات لا تُمسّ إطلاقاً، وبمجرد إدخال كود التفعيل الصحيح يفتح البرنامج فوراً
 * على نفس البيانات بنفس الأرقام.
 */
export function SubscriptionLock({
  info,
  onActivated,
}: {
  info: LockInfo;
  onActivated: (next: LockInfo) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const title = info.isClockTampered
    ? "تم اكتشاف تغيير في تاريخ الجهاز"
    : info.plan
      ? "انتهى اشتراك البرنامج"
      : "انتهت الفترة التجريبية";

  const sub = info.isClockTampered
    ? "تاريخ النظام غير متوافق مع تاريخ آخر تشغيل. أعد ضبط التاريخ أو تفعّل بكود جديد."
    : info.plan
      ? "الاشتراك انتهى — بياناتك ومحاسبتك وفواتيرك محفوظة بالكامل ولم يُحذف شيء."
      : "انتهت الـ 15 يوماً التجريبية — بياناتك محفوظة بالكامل ولم يُحذف شيء.";

  const expiresText = useMemo(() => {
    if (!info.expiresAt) return "—";
    const d = new Date(info.expiresAt);
    return Number.isNaN(d.getTime()) ? info.expiresAt : d.toLocaleDateString("ar-EG");
  }, [info.expiresAt]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(info.machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const activate = async () => {
    if (!code.trim()) {
      setError("اكتب كود التفعيل أولاً");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: code.trim().toUpperCase(), machineId: info.machineId, mode: "activate" }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        onActivated(data.status as LockInfo);
        window.dispatchEvent(new Event("fatora:license-changed"));
        return;
      }
      setError(data?.error || "الكود غير صحيح لهذا الجهاز — تأكد منه أو تواصل مع الدعم");
    } catch {
      setError("تعذّر الاتصال بالبرنامج — حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/license", { cache: "no-store" });
      if (res.ok) onActivated((await res.json()) as LockInfo);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  };

  // منع أي محاولة للخروج من الشاشة بلوحة المفاتيح (قفل كامل)
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === "F5" || (e.ctrlKey && ["r", "R"].includes(e.key))) return;
      if (e.key === "Escape" || e.key === "F11") e.preventDefault();
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center overflow-auto bg-cover bg-center p-4"
      dir="rtl"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% -10%, #24476f 0%, #16293f 45%, #0a1522 100%)",
      }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_24px_80px_rgba(0,0,0,.55)]">
        {/* الترويسة */}
        <div className="bg-gradient-to-l from-[#b42318] via-[#c93a2a] to-[#8f1d14] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[18px] font-black leading-tight">{title}</div>
              <div className="mt-0.5 text-[12px] font-bold text-red-100">{sub}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {/* اللوجو + الحالة */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_LOGO} alt="FATORA" className="h-12 w-auto object-contain" />
            <div className="text-left">
              <div className="text-[11.5px] font-bold text-slate-500">الحالة</div>
              <div className="text-[13.5px] font-black text-red-700">موقوف — يحتاج تفعيل</div>
            </div>
          </div>

          {/* تفاصيل الاشتراك */}
          {info.plan && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                  <Tag className="h-3.5 w-3.5" /> نوع الاشتراك
                </div>
                <div className="text-[13px] font-black text-amber-900">{info.planLabel || info.plan}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <div className="text-[11px] font-bold text-amber-800">تاريخ الانتهاء</div>
                <div className="num text-[13px] font-black text-amber-900">{expiresText}</div>
              </div>
            </div>
          )}

          {/* كود الجهاز */}
          <div>
            <div className="mb-1 text-[12px] font-black text-[#0f2942]">كود الجهاز (أرسله للدعم لاستلام كود التفعيل)</div>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={info.machineId}
                dir="ltr"
                className="w-full select-all rounded-lg border-2 border-slate-300 bg-slate-100 px-2 py-2 text-center font-mono text-[15px] font-black tracking-widest text-slate-900"
              />
              <button
                type="button"
                onClick={() => void copyId()}
                className="flex h-[38px] shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 text-[12px] font-black text-white hover:bg-slate-700"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم" : "نسخ"}
              </button>
            </div>
          </div>

          {/* إدخال الكود */}
          <div>
            <div className="mb-1 text-[12px] font-black text-[#0f2942]">كود التفعيل</div>
            <div className="flex items-center gap-1.5">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void activate();
                }}
                placeholder="XXXX-XXXX-XXXX"
                dir="ltr"
                className="w-full rounded-lg border-2 border-[#1a6fd0] px-2 py-2 text-center font-mono text-[16px] font-black tracking-widest text-[#0f2942] focus:border-[#0b4f9c] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void activate()}
                disabled={busy}
                className="flex h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#2c8f2c] to-[#1c701c] px-4 text-[13px] font-black text-white shadow hover:brightness-110 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                تفعيل
              </button>
            </div>
            {error && (
              <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-bold text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* الدعم */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[12.5px] font-black text-emerald-900">
              <Phone className="h-4 w-4 text-emerald-600" /> الدعم والمبيعات
            </span>
            <b className="num text-[14px] font-black text-emerald-800" dir="ltr">
              {SUPPORT_PHONE} — {SUPPORT_PERSON}
            </b>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> بياناتك وفواتيرك وأرصدتك سليمة تماماً — القفل على البرنامج فقط.
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex shrink-0 items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-black text-slate-600 hover:bg-slate-100"
            >
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              تحديث
            </button>
          </div>

          <a
            href="/plans"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1a6fd0]/30 bg-[#f2f8ff] py-2 text-[12.5px] font-black text-[#0f4a8a] hover:bg-[#e4f1ff]"
          >
            <Sparkles className="h-4 w-4" /> عرض أنظمة الاشتراك والأسعار
          </a>
        </div>
      </div>
    </div>
  );
}
