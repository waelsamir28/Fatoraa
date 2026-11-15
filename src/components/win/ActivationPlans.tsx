"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Crown, Gift, Phone, ShieldCheck, Sparkles, Timer, X, ArrowUpRight } from "lucide-react";
import { SUPPORT_PHONE } from "@/lib/constants";
import {
  PLAN_DEFS,
  canUpgrade,
  extraDevicesPrice,
  renewalPrice,
  upgradePrice,
  type PlanDef,
  type PlanKey,
} from "@/lib/license-plans";

export interface PlansPageProps {
  /** كود جهاز العميل (يُرسل مع الطلب) */
  machineId: string;
  /** تفاصيل الاشتراك الحالي (للتجديد والترقية) */
  currentPlan?: PlanKey | null;
  currentDaysLeft?: number | null;
  /** معرّف الخطة المختارة (لمولد الأكواد أنت فقط) */
  onSelect?: (plan: PlanKey) => void;
  onClose?: () => void;
  /** عرض داخل صفحة كاملة (بدون زر إغلاق) */
  standalone?: boolean;
}

const ICONS: Record<PlanKey, typeof Timer> = {
  year: Timer,
  tier2: Gift,
  lifetime: Crown,
};

/**
 * صفحة أنظمة التفعيل (الأسعار والمدد) — تظهر للعميل عند الضغط على «تفعيل البرنامج».
 * لا تحتوي أي كود توليد؛ فقط اختيار الخطة وإرسال كود الجهاز للدعم.
 */
export function ActivationPlans({
  machineId,
  currentPlan = null,
  currentDaysLeft = null,
  onSelect,
  onClose,
  standalone = false,
}: PlansPageProps) {
  const [selected, setSelected] = useState<PlanKey>("tier2");
  const [copied, setCopied] = useState(false);
  // بطاقة هدية: سعر الهدية + إرسالها لصاحب محل آخر
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftPlan, setGiftPlan] = useState<PlanKey>("year");
  const [giftTo, setGiftTo] = useState("");

  const early = currentPlan ? renewalPrice(currentPlan, currentDaysLeft) : null;
  const isUpgrade = currentPlan ? canUpgrade(currentPlan, selected) : false;
  const upgrade = currentPlan && isUpgrade ? upgradePrice(currentPlan, selected) : null;
  const chosen = PLAN_DEFS.find((p) => p.key === selected) || PLAN_DEFS[0];
  const payable = upgrade && upgrade.price > 0 ? upgrade.price : chosen.price;

  const copyRequest = () => {
    const plan = PLAN_DEFS.find((p) => p.key === selected) || PLAN_DEFS[0];
    const text = `طلب تفعيل برنامج FATORA\nالخطة: ${plan.title} (${plan.subtitle})\nكود الجهاز: ${machineId}\nالسعر: ${plan.price.toLocaleString("en-US")} ج.م`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`${standalone ? "min-h-full w-full" : "fixed inset-0 z-[9999] overflow-auto"} bg-[#0b2547]/70 p-3 backdrop-blur-sm`}
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ترويسة */}
        <div className="relative overflow-hidden bg-gradient-to-l from-[#164066] via-[#0f3d73] to-[#12508f] px-5 pb-4 pt-5 text-white">
          <span className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-20 right-10 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
          {!standalone && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-[#0f2942] shadow">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[19px] font-black leading-tight">أنظمة تفعيل برنامج FATORA</h2>
              <p className="text-[11.5px] font-bold text-blue-100">
                اختر النظام المناسب لك — التفعيل على نفس الجهاز بكود خاص به
              </p>
            </div>
          </div>

          {/* كود الجهاز */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
            <span className="text-[11.5px] font-bold text-blue-100">كود جهازك:</span>
            <b className="font-mono text-[15px] font-black tracking-wider" dir="ltr">
              {machineId || "—"}
            </b>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(machineId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="ms-auto flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-black hover:bg-white/30"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "تم النسخ" : "نسخ"}
            </button>
          </div>
        </div>

        {/* الخطط */}
        <div className="grid gap-3 p-3 sm:grid-cols-3">
          {PLAN_DEFS.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              active={selected === p.key}
              onPick={() => {
                setSelected(p.key);
                onSelect?.(p.key);
              }}
            />
          ))}
        </div>

        {/* عرض التجديد المبكر / الترقية */}
        {(early?.early || isUpgrade) && (
          <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2">
            <Gift className="h-4 w-4 text-amber-600" />
            <span className="text-[12px] font-black text-amber-900">
              {isUpgrade && upgrade
                ? `ترقية من ${PLAN_DEFS.find((p) => p.key === currentPlan)?.title} إلى ${chosen.title} — تدفع الفرق فقط ${upgrade.price.toLocaleString("en-US")} ج.م (وفّرت ${upgrade.saving.toLocaleString("en-US")} ج.م)`
                : `تجديد مبكر: خصم ${early?.discount} ج.م — التجديد الآن بـ ${early?.price.toLocaleString("en-US")} ج.م`}
            </span>
          </div>
        )}

        {/* ملخص الطلب */}
        <div className="mx-3 mb-3 rounded-xl border-2 border-[#c9d8ee] bg-[#f4f8fd] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-black text-[#0f2942]">
              الخطة المختارة:{" "}
              <span className="text-[#1a6fd0]">{PLAN_DEFS.find((p) => p.key === selected)?.title}</span>
            </div>
            <div className="ms-auto flex items-center gap-2">
              {upgrade && upgrade.price > 0 && (
                <span className="text-[12px] font-bold text-slate-400 line-through">
                  {chosen.price.toLocaleString("en-US")}
                </span>
              )}
              <div className="num text-[18px] font-black text-[#0f2942]">{payable.toLocaleString("en-US")} ج.م</div>
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={copyRequest}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2f86e8] to-[#1a5fc0] text-[14.5px] font-black text-white shadow hover:brightness-105"
            >
              <Copy className="h-4.5 w-4.5" />
              نسخ طلب التفعيل وإرساله للدعم
            </button>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#34c46a] to-[#167f3b] px-5 text-[14.5px] font-black text-white shadow hover:brightness-105"
            >
              <Phone className="h-4.5 w-4.5" />
              <span className="num" dir="ltr">
                {SUPPORT_PHONE}
              </span>
            </a>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            بعد استلام الكود: افتح «لدي كود تفعيل» ← الصقه ← تفعيل. الكود يعمل على جهازك فقط.
          </div>

          {/* بطاقة هدية + أجهزة إضافية */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGiftOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[#c9d8ee] bg-white px-3 py-1.5 text-[11.5px] font-black text-[#0f2942] hover:bg-[#f4f8fd]"
            >
              <Gift className="h-3.5 w-3.5 text-amber-600" />
              أهدِ اشتراكاً لصاحب محل آخر
            </button>
            <span className="rounded-lg bg-[#f4f8fd] px-2 py-1 text-[10.5px] font-bold text-slate-600">
              جهاز إضافي على نفس الكود: {extraDevicesPrice(1).toLocaleString("en-US")} ج.م
            </span>
          </div>

          {giftOpen && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2">
              <div className="mb-1.5 text-[11.5px] font-black text-amber-900">بطاقة هدية — كود تفعيل لجهاز آخر</div>
              <div className="grid gap-1.5 sm:grid-cols-[150px_1fr_auto]">
                <select
                  className="win-input h-8 text-[11.5px] font-black"
                  value={giftPlan}
                  onChange={(e) => setGiftPlan(e.target.value as PlanKey)}
                >
                  {PLAN_DEFS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.title} — {p.price}
                    </option>
                  ))}
                </select>
                <input
                  className="win-input h-8 font-mono text-[11.5px] font-black"
                  placeholder="كود جهاز المُهدى إليه FAT-XXXX-XXXX"
                  dir="ltr"
                  value={giftTo}
                  onChange={(e) => setGiftTo(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  onClick={() => {
                    const g = PLAN_DEFS.find((p) => p.key === giftPlan);
                    navigator.clipboard.writeText(
                      `طلب بطاقة هدية FATORA\nالخطة: ${g?.title}\nالسعر: ${g?.price} ج.م\nجهاز المُهدى إليه: ${giftTo || "(لسه)"}\nمن: ${machineId}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg bg-amber-500 px-3 text-[11.5px] font-black text-white"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  نسخ الطلب
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, active, onPick }: { plan: PlanDef; active: boolean; onPick: () => void }) {
  const Icon = ICONS[plan.key];
  return (
    <button
      type="button"
      onClick={onPick}
      className={`relative flex flex-col rounded-2xl border-2 p-3 text-right transition ${
        active
          ? "border-[#1a6fd0] bg-[#f2f8ff] shadow-[0_8px_24px_rgba(26,111,208,0.18)]"
          : "border-[#dbe8f7] bg-white hover:border-[#9cc4ee]"
      } ${plan.highlight ? "ring-2 ring-amber-300/60" : ""}`}
    >
      {plan.badge && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#3b2503] shadow">
          {plan.badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ${
            plan.key === "lifetime" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-[#1a5fc0]"
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <div className="text-[14.5px] font-black text-[#0f2942]">{plan.title}</div>
          <div className="text-[11px] font-bold text-slate-500">{plan.subtitle}</div>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="num text-[26px] font-black leading-none text-[#0f2942]">
          {plan.price.toLocaleString("en-US")}
        </span>
        <span className="pb-0.5 text-[12px] font-black text-slate-500">ج.م</span>
        {plan.months > 0 && (
          <span className="pb-1 text-[10.5px] font-bold text-slate-500">
            ({Math.round(plan.price / plan.months)} شهرياً)
          </span>
        )}
      </div>

      <ul className="mt-2 space-y-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[11px] font-bold leading-snug text-slate-600">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <span
        className={`mt-3 grid h-9 place-items-center rounded-lg text-[12.5px] font-black ${
          active ? "bg-[#0f2942] text-white" : "border border-[#c9d8ee] bg-[#f4f8fd] text-[#0f2942]"
        }`}
      >
        {active ? "✓ الخطة المختارة" : "اختيار هذه الخطة"}
      </span>
    </button>
  );
}
