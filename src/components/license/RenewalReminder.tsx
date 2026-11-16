"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Phone, RefreshCw, X } from "lucide-react";
import { SUPPORT_PERSON, SUPPORT_PHONE } from "@/lib/constants";
import { ActivationPlans } from "@/components/win/ActivationPlans";
import type { PlanKey } from "@/lib/license-plans";

/** الأيام التي يظهر عندها تنبيه التجديد */
const REMIND_AT = [15, 5];

interface Status {
  isActivated: boolean;
  plan: PlanKey | null;
  planLabel?: string;
  planDaysLeft: number | null;
  machineId: string;
}

const DISMISS_KEY = "fatora.renew.dismiss";

/**
 * تنبيه تجديد الاشتراك داخل البرنامج:
 * يظهر قبل الانتهاء بـ 15 يوم و5 أيام (مرة واحدة لكل مرحلة يومياً)،
 * ويوجه العميل لصفحة الأنظمة أو الاتصال بالدعم.
 */
export function RenewalReminder() {
  const [s, setS] = useState<Status | null>(null);
  const [shown, setShown] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/license")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Status | null) => {
        if (!alive || !d) return;
        setS(d);
        const left = d.planDaysLeft;
        if (!d.isActivated || left === null) return;
        // مرحلة التنبيه: 15 أو 5 (أو أقل، ويظهر لو لسه ما اتقفلش النهاردة)
        const stage = REMIND_AT.find((v) => left <= v);
        if (stage === undefined) return;
        try {
          const key = `${d.machineId}:${stage}:${new Date().toDateString()}`;
          if (localStorage.getItem(DISMISS_KEY) === key) return;
        } catch {
          /* ignore */
        }
        setShown(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = () => {
    setShown(false);
    if (!s) return;
    const left = s.planDaysLeft ?? 0;
    const stage = REMIND_AT.find((v) => left <= v) ?? 5;
    try {
      localStorage.setItem(DISMISS_KEY, `${s.machineId}:${stage}:${new Date().toDateString()}`);
    } catch {
      /* ignore */
    }
  };

  if (!s || !shown) return null;
  const left = s.planDaysLeft ?? 0;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-2" dir="rtl">
        <div
          className={`flex w-full max-w-[720px] items-center gap-2 rounded-xl border-2 px-3 py-2 shadow-xl ${
            left <= 5 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          <CalendarClock className={`h-5 w-5 shrink-0 ${left <= 5 ? "text-red-600" : "text-amber-600"}`} />
          <div className="min-w-0 flex-1">
            <div className={`text-[12.5px] font-black ${left <= 5 ? "text-red-900" : "text-amber-900"}`}>
              {left <= 5 ? `تنبيه: اشتراكك ينتهي بعد ${left} يوم` : `اشتراكك (${s.planLabel}) ينتهي بعد ${left} يوم`}
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              {left <= REMIND_AT[0]
                ? "جدّد الآن واستفد بخصم التجديد المبكر 15% — البرنامج سيرجع لوضع التجربة بعد الانتهاء"
                : "يمكنك التجديد من صفحة الأنظمة أو بالاتصال بالدعم الفني"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPlansOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0f2942] px-2.5 py-1.5 text-[11.5px] font-black text-white hover:bg-[#1b3f5f]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تجديد
          </button>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11.5px] font-black text-white"
            title={`اتصل بالدعم: ${SUPPORT_PERSON} — ${SUPPORT_PHONE}`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{SUPPORT_PERSON}</span>
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/70"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {plansOpen && (
        <ActivationPlans
          machineId={s.machineId}
          currentPlan={s.plan}
          currentDaysLeft={s.planDaysLeft}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </>
  );
}
