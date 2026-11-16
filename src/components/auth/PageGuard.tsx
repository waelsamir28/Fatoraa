"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldX, ArrowRight } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { pageAllowed } from "@/lib/pages";

/**
 * حماية الشاشات:
 * لو الحساب الحالي مش مسموح له بالصفحة → شاشة «غير مصرح» واضحة،
 * ومفيش أي طريقة لفتح الصفحة (حتى بكتابة الرابط).
 */
export function PageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, authEnabled } = useAuth();

  // المالك أو قبل إنشاء الحساب: مفيش قيود
  if (!authEnabled || !user || user.role === "owner") return <>{children}</>;
  if (pageAllowed(user, pathname)) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-4" dir="rtl">
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
          <ShieldX className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-[17px] font-black">هذه الشاشة غير متاحة لحسابك</div>
            <div className="text-[12px] font-bold text-red-100">تم إخفاؤها ومنع فتحها بواسطة المالك</div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold leading-relaxed text-slate-600">
            الحساب الحالي: <b className="text-[#0f2942]">{user.name}</b> ({user.roleLabel})
            <br />
            لو محتاج تفتح الشاشة دي، اطلب من المالك يضيفها من صفحة «صلاحيات الشاشات».
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f2942] text-[14px] font-black text-white hover:bg-[#1b3f5f]"
          >
            <ArrowRight className="h-4 w-4" />
            الرجوع للشاشة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
