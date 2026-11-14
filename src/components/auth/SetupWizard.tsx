"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { APP_BRAND, APP_NAME } from "@/lib/constants";
import { api, errMsg } from "@/lib/client";
import { resolveLogo } from "@/lib/logo";

/**
 * إعداد أول مرة في 3 خطوات — بدون أي أكواد أو ملفات:
 * 1) بيانات المحل  2) حساب المالك  3) تليجرام (اختياري)
 */
export function SetupWizard({ onDone }: { onDone: () => void | Promise<void> }) {
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logo, setLogo] = useState(resolveLogo());

  useEffect(() => {
    api<{ customLogoUrl?: string }>("/api/settings")
      .then((st) => setLogo(resolveLogo(st.customLogoUrl)))
      .catch(() => undefined);
  }, []);

  const next = () => {
    setError("");
    if (step === 1) {
      if (!storeName.trim()) return setError("اكتب اسم المحل — هيظهر على الفواتير");
      if (phone.trim().length < 8) return setError("اكتب رقم تليفون صحيح");
    }
    if (step === 2) {
      if (username.trim().length < 3) return setError("اسم المستخدم لازم يكون 3 حروف على الأقل");
      if (password.length < 6) return setError("كلمة المرور لازم تكون 6 أحرف على الأقل");
      if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const finish = async (withTelegram: boolean) => {
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/quick-setup", {
        method: "POST",
        json: {
          storeName,
          phone,
          fullName: fullName || storeName,
          username,
          password,
          telegramToken: withTelegram ? tgToken : "",
          telegramChat: withTelegram ? tgChat : "",
        },
      });
      await onDone();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  const pct = (step / 3) * 100;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-3" dir="rtl">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* الهيدر */}
        <div className="bg-gradient-to-l from-[#164066] to-[#0f2942] px-5 pb-3 pt-4 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={APP_BRAND} className="mx-auto h-[70px] w-auto object-contain drop-shadow-lg" />
          <div className="mt-1 text-[18px] font-black">{APP_NAME}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            إعداد البرنامج — خطوة {step} من 3
          </div>
          {/* شريط التقدم */}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#2fb3a6] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 p-5">
          {/* ============ الخطوة 1: بيانات المحل ============ */}
          {step === 1 && (
            <>
              <StepHead icon={<Store className="h-5 w-5 text-[#2fb3a6]" />} title="بيانات المحل" sub="هتظهر على الفواتير والتقارير" />

              <Field label="اسم المحل *">
                <input
                  autoFocus
                  className="win-input w-full"
                  placeholder="مثال: مكتبة الأمل"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </Field>

              <Field label="رقم التليفون *">
                <input
                  className="win-input num w-full"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>

              <Field label="اسم صاحب المحل (يظهر في الفواتير)">
                <input
                  className="win-input w-full"
                  placeholder="مثال: وائل الجمال"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
            </>
          )}

          {/* ============ الخطوة 2: حساب المالك ============ */}
          {step === 2 && (
            <>
              <StepHead
                icon={<ShieldCheck className="h-5 w-5 text-[#2fb3a6]" />}
                title="حساب المالك"
                sub="بيدخل بيه صاحب المحل — وله كل الصلاحيات"
              />

              <Field label="اسم المستخدم *">
                <div className="relative">
                  <User className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    className="win-input w-full pr-8"
                    dir="ltr"
                    autoComplete="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="كلمة المرور *">
                <div className="relative">
                  <Lock className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    className="win-input w-full px-9"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="6 أحرف على الأقل"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label="إظهار كلمة المرور"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="تأكيد كلمة المرور *">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    className="win-input w-full pr-8"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </Field>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-emerald-900">
                🔒 كلمة المرور بتتحفظ مشفّرة (scrypt) ومحدش يقدر يشوفها — احتفظ بها في مكان آمن.
              </div>
            </>
          )}

          {/* ============ الخطوة 3: تليجرام (اختياري) ============ */}
          {step === 3 && (
            <>
              <StepHead
                icon={<Send className="h-5 w-5 text-[#2fb3a6]" />}
                title="تليجرام (اختياري)"
                sub="لإرسال تقرير المبيعات اليومي على موبايلك"
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-slate-600">
                لو مش عارف تجيب التوكن، سيب الخانتين فاضيين واضغط <b>«ابدأ الاستخدام»</b> — وتقدر
                تضبطها بعدين من شاشة <b>الإعدادات › تليجرام</b> بنفس الطريقة بدون أي أكواد.
              </div>

              <Field label="Bot Token">
                <input
                  className="win-input w-full"
                  dir="ltr"
                  placeholder="1234567890:AAH..."
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                />
              </Field>

              <Field label="Chat ID">
                <input
                  className="win-input w-full"
                  dir="ltr"
                  placeholder="-1001234567890"
                  value={tgChat}
                  onChange={(e) => setTgChat(e.target.value)}
                />
              </Field>

              <div className="flex items-center gap-2 rounded-lg border border-[#2fb3a6]/40 bg-[#e6f7f5] px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2fb3a6]" />
                <p className="text-[11.5px] font-bold leading-relaxed text-[#0f2942]">
                  الإعدادات بتتحفظ في قاعدة البيانات — مش لازم تعدّل أي ملفات ولا أكواد.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-bold text-red-700">
              {error}
            </div>
          )}

          {/* الأزرار */}
          <div className="flex items-center gap-2 pt-1">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={busy}
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-4 text-[13px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                السابق
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0f2942] text-[14.5px] font-black text-white hover:bg-[#1b3f5f]"
              >
                التالي
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void finish(false)}
                  disabled={busy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-[#2fb3a6] bg-white text-[14px] font-black text-[#0f2942] hover:bg-[#e6f7f5] disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  ابدأ الاستخدام
                </button>
                <button
                  type="button"
                  onClick={() => void finish(true)}
                  disabled={busy || !tgToken.trim() || !tgChat.trim()}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2fb3a6] text-[14px] font-black text-white hover:bg-[#25938a] disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  حفظ وابدأ
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            الإصدار {APP_BRAND} — دعم فني 01222355769
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 border-b border-slate-100 pb-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-[15px] font-black text-[#0f2942]">{title}</div>
        <div className="text-[11.5px] font-bold text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-black text-slate-600">{label}</label>
      {children}
    </div>
  );
}
