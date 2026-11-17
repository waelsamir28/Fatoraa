"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
import { APP_BRAND, APP_NAME, SUPPORT_PHONE, SUPPORT_PERSON } from "@/lib/constants";
import { api, errMsg } from "@/lib/client";
import { resolveLogo } from "@/lib/logo";

/**
 * شاشة إعداد أول مرة — تصميم «بانر + فوتر»:
 * بانر علوي متدرّج فيه اسم البرنامج وخطوات الإعداد، وكارت أبيض في النص
 * فيه محتوى الخطوة، وفوتر كحلي فيه الدعم الفني ورقم الإصدار.
 *
 * الخطوات (3) بدون أي أكواد أو ملفات:
 *   1) بيانات المحل  2) حساب المالك  3) تليجرام (اختياري)
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

  /** عناوين الخطوات — تظهر في شريط الخطوات بالبانر */
  const STEPS = [
    { n: 1, label: "بيانات المحل", icon: <Store className="h-4 w-4" /> },
    { n: 2, label: "حساب المالك", icon: <ShieldCheck className="h-4 w-4" /> },
    { n: 3, label: "تليجرام (اختياري)", icon: <Send className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#eaf2fb]" dir="rtl">
      {/* ================= البانر ================= */}
      <header className="relative shrink-0 overflow-hidden bg-[#0067c0]">
        {/* لمعة قطرية خفيفة زي التصميم */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(120% 160% at 8% 120%, rgba(56,182,255,.55) 0%, rgba(56,182,255,0) 55%)",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-4">
          {/* اليمين: عنوان الإعداد + الخطوات */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
              <h1 className="text-[22px] font-black leading-tight sm:text-[26px]">
                إعداد البرنامج
              </h1>
            </div>
            <p className="mt-0.5 text-[12.5px] font-bold text-blue-200">
              خطوة {step} من 3 — {STEPS[step - 1].label}
            </p>

            {/* شريط الخطوات */}
            <ol className="mt-3 flex flex-wrap items-center gap-1.5">
              {STEPS.map((s) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                  <li
                    key={s.n}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-black transition ${
                      done
                        ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100"
                        : active
                          ? "border-white/70 bg-white text-[#0f2942]"
                          : "border-white/25 bg-white/10 text-blue-100/80"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.icon}
                    {s.label}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* الشمال: الشعار */}
          <div className="flex shrink-0 flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt={APP_BRAND}
              className="h-[64px] w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,.5)] sm:h-[76px]"
            />
            <div className="mt-0.5 hidden text-[10.5px] font-bold tracking-widest text-blue-200/80 sm:block">
              {APP_NAME.split("|")[1]?.trim() || ""}
            </div>
          </div>
        </div>

        {/* شريط التقدم أسفل البانر */}
        <div className="h-1.5 w-full bg-black/25">
          <div
            className="h-full bg-[#0f6cbd] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      {/* ================= الكارت ================= */}
      <main className="flex flex-1 items-start justify-center px-3 py-5 sm:py-7">
        <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-[#cfe0f2] bg-white shadow-[0_18px_50px_rgba(12,45,90,.16)]">
          <div className="space-y-3.5 p-5 sm:p-6">
            {/* ---------- الخطوة 1: بيانات المحل ---------- */}
            {step === 1 && (
              <>
                <StepHead
                  icon={<Store className="h-5 w-5 text-[#2fb3a6]" />}
                  title="بيانات المحل"
                  sub="هتظهر على الفواتير والتقارير"
                />

                <Field label="اسم المحل *">
                  <input
                    autoFocus
                    className="win-input w-full"
                    placeholder="مثال: سوبرماركت النور"
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
                    placeholder="الاسم ثلاثي"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </Field>
              </>
            )}

            {/* ---------- الخطوة 2: حساب المالك ---------- */}
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

            {/* ---------- الخطوة 3: تليجرام ---------- */}
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

            {/* ---------- الأزرار ---------- */}
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
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0067c0] text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-[#1975c5] active:bg-[#005a9e]"
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
          </div>
        </div>
      </main>

      {/* ================= الفوتر ================= */}
      <footer className="shrink-0 border-t-2 border-[#f5a623] bg-[#005a9e]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-1 px-5 py-2.5 text-[11.5px] font-bold text-blue-100">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            الدعم الفني: {SUPPORT_PERSON} —{" "}
            <span className="num" dir="ltr">
              {SUPPORT_PHONE}
            </span>
          </span>
          <span className="text-blue-300">الإصدار {APP_BRAND}</span>
        </div>
      </footer>
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
