"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LoginGate } from "./LoginGate";

/**
 * يحمي كل شاشات البرنامج:
 * - لو النظام يحتاج دخول ومفيش جلسة => شاشة الدخول.
 * - غير كده يعرض المحتوى.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authEnabled, user } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b3a8c]">
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
          <span className="text-[14px] font-black">جارٍ التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }

  // يحتاج دخول ولا يوجد مستخدم مسجّل
  if (authEnabled && !user) return <LoginGate />;

  return <>{children}</>;
}
