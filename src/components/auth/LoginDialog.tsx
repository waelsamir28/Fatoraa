"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock, LogIn, User, Sparkles } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { CartLogo } from "@/components/icons/AppIcons";
import { APP_BRAND, APP_NAME } from "@/lib/constants";
import { api } from "@/lib/client";
import { resolveLogo } from "@/lib/logo";

export function LoginDialog({
  onLoginSuccess,
}: {
  onLoginSuccess: (name: string) => void;
}) {
  const [userName, setUserName] = useState("FATORA");
  const [logo, setLogo] = useState(resolveLogo());
  const [welcomeMessage, setWelcomeMessage] = useState(false);

  useEffect(() => {
    try {
      api<{ customLogoUrl?: string }>("/api/settings")
      .then((st) => setLogo(resolveLogo(st.customLogoUrl)))
      .catch(() => undefined);
    const saved = localStorage.getItem("aljamal_active_user");
      if (saved) setUserName(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = userName.trim() || "FATORA";
    try {
      localStorage.setItem("aljamal_active_user", finalName);
    } catch {
      // ignore
    }
    setWelcomeMessage(true);
    setTimeout(() => {
      onLoginSuccess(finalName);
    }, 1100);
  };

  return (
    <Dialog title={`تسجيل الدخول - ${APP_NAME}`} onClose={() => {}} width={420}>
      <form onSubmit={handleLogin} className="space-y-4 py-2 text-center">
        {/* الشعار الكبير بدون خلفية */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={APP_BRAND}
          className="mx-auto h-[190px] w-auto max-w-full object-contain drop-shadow-[0_10px_24px_rgba(10,40,110,0.28)]"
        />

        <div>
          <h2 className="text-[22px] font-black text-[#0b2350]">مرحباً بك في برنامج {APP_BRAND}</h2>
          <p className="text-[13px] font-bold text-slate-500 mt-0.5">يرجى تأكيد اسم المستخدم لبدء الجلسة ونقاط البيع</p>
        </div>

        {welcomeMessage ? (
          <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4 text-center animate-pulse">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600 mb-1" />
            <div className="text-[17px] font-black text-green-900">أهلاً وسهلاً بك يا {userName}!</div>
            <div className="text-[12px] font-bold text-green-700">جاري فتح النظام وتهيئة نقاط البيع...</div>
          </div>
        ) : (
          <>
            <div className="text-right">
              <label className="form-label mb-1">اسم المستخدم / الكاشير</label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
                <input
                  autoFocus
                  className="win-input h-11 w-full pr-10 text-[16px] font-black text-blue-900"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="اكتب اسمك أو اسم الكاشير..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-green h-11 w-full text-[17px] font-black shadow-md mt-2"
            >
              <LogIn className="h-5 w-5" />
              دخول البرنامج
            </button>
          </>
        )}
      </form>
    </Dialog>
  );
}
