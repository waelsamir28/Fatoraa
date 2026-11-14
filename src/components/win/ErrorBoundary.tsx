"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, DatabaseZap, Loader2, LogIn, RefreshCw } from "lucide-react";

/**
 * حاجز أمان لكل الشاشات:
 * لو أي شاشة عملت خطأ غير متوقع في المتصفح، لا نترك المستخدم أمام صفحة فاضية —
 * نُظهر رسالة عربية واضحة + إعادة المحاولة + خروج ودخول من جديد.
 */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const onErr = (e: ErrorEvent) => setError(e.error instanceof Error ? e.error : new Error(e.message));
    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      setError(r instanceof Error ? r : new Error(String(r)));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!error) return <>{children}</>;

  const msg = String(error.message || "");
  const isDb = /DATABASE_URL|قاعدة البيانات|ECONNREFUSED|Failed query|relation .* does not exist/i.test(msg);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-4" dir="rtl">
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className={`flex items-center gap-3 px-5 py-4 text-white ${isDb ? "bg-red-600" : "bg-amber-600"}`}
        >
          {isDb ? <DatabaseZap className="h-7 w-7 shrink-0" /> : <AlertTriangle className="h-7 w-7 shrink-0" />}
          <div>
            <div className="text-[17px] font-black">
              {isDb ? "تعذّر الاتصال بقاعدة البيانات" : "حدث خطأ غير متوقع في الشاشة"}
            </div>
            <div className="text-[12px] font-bold opacity-90">
              بياناتك لم تُفقد — أعد المحاولة أو سجّل الدخول من جديد
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 text-[12px] font-black text-slate-500">تفاصيل الخطأ</div>
            <p className="break-words font-mono text-[11.5px] leading-relaxed text-slate-700">
              {msg.slice(0, 400) || "خطأ غير معروف"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f2942] text-[13.5px] font-black text-white hover:bg-[#1b3f5f]"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {
                  /* ignore */
                }
                window.location.href = "/";
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-[#2fb3a6] bg-white text-[13.5px] font-black text-[#0f2942] hover:bg-[#e6f7f5]"
            >
              <LogIn className="h-4 w-4" />
              خروج ودخول جديد
            </button>
          </div>

          <p className="text-center text-[11px] font-bold text-slate-400">
            لو الخطأ تكرر، ابعته للدعم: 01222355769
          </p>
        </div>
      </div>
    </div>
  );
}

/** شاشة التحميل الموحدة */
export function LoadingScreen({ text = "جارٍ التحميل..." }: { text?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0f2942]" dir="rtl">
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#2fb3a6]" />
        <span className="text-[14px] font-black">{text}</span>
      </div>
    </div>
  );
}
