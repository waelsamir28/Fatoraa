"use client";

import type { ReactNode } from "react";
import { AlertTriangle, DatabaseZap, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LoginGate } from "./LoginGate";

/**
 * يحمي كل شاشات البرنامج:
 * - لو قاعدة البيانات مش متاحة => شاشة خطأ واضحة (مش صفحة فاضية).
 * - لو النظام يحتاج دخول ومفيش جلسة => شاشة الدخول / إنشاء حساب المالك.
 * - غير كده يعرض المحتوى.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authEnabled, dbError, dbErrorMessage, user, refresh } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0f2942]" dir="rtl">
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#2fb3a6]" />
          <span className="text-[14px] font-black">جارٍ التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }

  // قاعدة البيانات غير متاحة: لا نفتح البرنامج ولا نعرض شاشة إنشاء حساب كاذبة
  if (dbError) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-4" dir="rtl">
        <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
            <DatabaseZap className="h-7 w-7 shrink-0" />
            <div>
              <div className="text-[17px] font-black">تعذّر الاتصال بقاعدة البيانات</div>
              <div className="text-[12px] font-bold text-red-100">البرنامج لم يستطع قراءة بيانات المستخدمين</div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="flex items-start gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-[13px] font-bold leading-relaxed text-red-800">{dbErrorMessage}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[13px] font-black text-slate-700">إيه اللي تعمله؟</div>
              <ol className="list-inside list-decimal space-y-1 text-[12.5px] font-bold leading-relaxed text-slate-600">
                <li>افتح لوحة Vercel → المشروع → Settings → Environment Variables.</li>
                <li>اتأكد إن <span className="font-mono text-[11.5px] text-slate-800">DATABASE_URL</span> موجودة وصحيحة (من Neon).</li>
                <li>لو قاعدة البيانات على Neon ومتوقفة، افتحها من لوحة Neon وشغّلها.</li>
                <li>اعمل Redeploy للمشروع بعد أي تعديل في المتغيرات.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f2942] text-[14px] font-black text-white hover:bg-[#1b3f5f]"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // لا يوجد مستخدم مسجّل: LoginGate يقرر بين «إنشاء حساب المالك» و«دخول»
  if (!user) return <LoginGate />;

  return <>{children}</>;
}
