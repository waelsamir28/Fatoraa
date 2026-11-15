"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck, Sparkles, User } from "lucide-react";
import { CartLogo } from "@/components/icons/AppIcons";
import { APP_BRAND, APP_NAME } from "@/lib/constants";
import { api, errMsg } from "@/lib/client";
import { resolveLogo } from "@/lib/logo";
import { useAuth, type SessionUser } from "./AuthProvider";
import { SetupWizard } from "./SetupWizard";

/**
 * شاشة الدخول الحقيقية:
 * - أول مرة (مفيش مستخدمين) تطلب إنشاء حساب المالك.
 * - بعد كده تطلب يوزر/باسورد وتعمل جلسة موقّعة على الخادم.
 */
export function LoginGate() {
  const { authEnabled, refresh, setUser, loading, dbError, dbErrorMessage } = useAuth();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  /** دخول سريع برمز PIN (للكاشير) */
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logo, setLogo] = useState(resolveLogo());

  // قبل وجود أي مستخدم لا بد من شاشة «إنشاء حساب المالك» — لا شاشة دخول بلا حساب
  useEffect(() => {
    if (!loading) setMode(authEnabled ? "login" : "setup");
  }, [authEnabled, loading]);

  useEffect(() => {
    api<{ customLogoUrl?: string }>("/api/settings")
      .then((st) => setLogo(resolveLogo(st.customLogoUrl)))
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "setup") {
      if (username.trim().length < 3) return setError("اسم المستخدم لازم يكون 3 حروف على الأقل");
      if (password.length < 6) return setError("كلمة المرور لازم تكون 6 أحرف على الأقل");
      if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    } else if (pinMode) {
      if (!/^\d{4,6}$/.test(pin)) return setError("رمز الدخول من 4 إلى 6 أرقام");
    } else if (!username.trim() || !password) {
      return setError("أدخل اسم المستخدم وكلمة المرور");
    }

    setBusy(true);
    try {
      if (mode === "setup") {
        const r = await api<{ user: SessionUser }>("/api/auth/setup", {
          method: "POST",
          json: { username, password, fullName },
        });
        setUser({ ...r.user, permissions: ["*"] });
        await refresh();
      } else {
        const r = await api<{ user: SessionUser }>("/api/auth/login", {
          method: "POST",
          json: pinMode ? { pin } : { username, password },
        });
        try {
          localStorage.setItem("aljamal_active_user", r.user.name);
          sessionStorage.setItem("aljamal_session_logged", "1");
        } catch {
          /* ignore */
        }
        setUser(r.user);
        await refresh();
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // أول مرة: شاشة إعداد مبسطة في 3 خطوات (بدون أكواد)
  if (mode === "setup" && !loading) {
    return (
      <SetupWizard
        onDone={async () => {
          await refresh();
        }}
      />
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-3" dir="rtl">
      <div className="w-full max-w-[430px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-l from-[#164066] to-[#0f2942] px-5 py-4 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={APP_BRAND} className="mx-auto h-[92px] w-auto object-contain drop-shadow-lg" />
          <div className="mt-1 text-[19px] font-black">{APP_NAME}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] font-bold text-blue-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            {mode === "setup" ? "إعداد أول مرة — إنشاء حساب المالك" : "دخول آمن للنظام"}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5">
          {mode === "setup" && (
            <Field icon={<Sparkles className="h-4 w-4 text-amber-500" />} label="اسمك (يظهر في الفواتير)">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: وائل الجمال"
                className="h-10 w-full rounded-lg border-2 border-[#c9d8ee] px-3 text-[14px] font-bold text-slate-800 focus:border-[#2fb3a6] focus:outline-none"
              />
            </Field>
          )}

          {mode !== "setup" && pinMode && (
            <div className="rounded-xl border-2 border-[#c9d8ee] bg-[#f4f8fd] p-3">
              <label className="mb-1 flex items-center gap-1.5 text-[12.5px] font-black text-slate-600">
                <Lock className="h-4 w-4 text-amber-600" />
                رمز الدخول السريع (PIN)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
                dir="ltr"
                className="h-12 w-full rounded-lg border-2 border-[#c9d8ee] bg-white text-center font-mono text-[24px] font-black tracking-[0.5em] text-slate-800 focus:border-[#2fb3a6] focus:outline-none"
              />
              <div className="mt-1 text-[11px] font-bold text-slate-500">
                اطلب رمزك من المالك — أسرع من كتابة اسم المستخدم وكلمة المرور
              </div>
            </div>
          )}

          {!pinMode && (
          <>
          <Field icon={<User className="h-4 w-4 text-blue-600" />} label="اسم المستخدم">
            <input
              type="text"
              dir="ltr"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="h-10 w-full rounded-lg border-2 border-[#c9d8ee] px-3 text-[14px] font-bold text-slate-800 focus:border-[#2fb3a6] focus:outline-none"
            />
          </Field>

          <Field icon={<Lock className="h-4 w-4 text-blue-600" />} label="كلمة المرور">
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                dir="ltr"
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border-2 border-[#c9d8ee] px-3 pl-10 text-[14px] font-bold text-slate-800 focus:border-[#2fb3a6] focus:outline-none"
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

          {mode === "setup" && (
            <Field icon={<KeyRound className="h-4 w-4 text-blue-600" />} label="تأكيد كلمة المرور">
              <input
                type={showPass ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border-2 border-[#c9d8ee] px-3 text-[14px] font-bold text-slate-800 focus:border-[#2fb3a6] focus:outline-none"
              />
            </Field>
          )}
          </>
          )}

          {mode !== "setup" && (
            <button
              type="button"
              onClick={() => {
                setPinMode((v) => !v);
                setError("");
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c9d8ee] bg-[#f4f8fd] py-2 text-[12px] font-black text-[#0f2942] hover:bg-[#eaf2fc]"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              {pinMode ? "الدخول باسم المستخدم وكلمة المرور" : "دخول سريع برمز PIN (كاشير)"}
            </button>
          )}

          {(error || dbError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-bold text-red-700">
              {dbError ? dbErrorMessage : error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-blue flex h-11 w-full items-center justify-center gap-2 text-[15px] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CartLogo className="!h-5 !w-5" />}
            {mode === "setup" ? "إنشاء الحساب وبدء الاستخدام" : "دخول"}
          </button>

          {mode === "setup" && (
            <p className="text-center text-[11.5px] font-bold leading-relaxed text-slate-500">
              هذا الحساب هو «المالك» وله كل الصلاحيات. يمكنك بعد الدخول إنشاء حسابات للموظفين
              (مدير / كاشير) من شاشة «المستخدمون».
            </p>
          )}

          <p className="text-center text-[11px] font-bold text-slate-400">
            {mode === "setup" ? "🔒 تُحفظ كلمة المرور مشفّرة (scrypt) ولا يمكن استرجاعها." : `النسخة ${APP_BRAND}`}
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[12.5px] font-black text-slate-600">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
