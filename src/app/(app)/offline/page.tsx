import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

/** صفحة بديلة تُعرض عند انقطاع الإنترنت (يخزّنها الـ service worker) */
export default function OfflinePage() {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6" dir="rtl">
      <div className="max-w-[460px] rounded-xl border-2 border-[#c9d8ee] bg-white p-5 text-center shadow-lg">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="text-[19px] font-black text-[#0f2942]">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-slate-600">
          البرنامج يعمل الآن بوضع أوفلاين. أي فاتورة تحفظها تُخزَّن على جهازك وتُرسل تلقائياً بمجرد عودة الإنترنت.
        </p>
        <ul className="mt-3 space-y-1 rounded-lg bg-[#f4f8fd] p-2.5 text-right text-[12px] font-bold text-[#0f2942]">
          <li>✓ البيع السريع بالباركود يعمل بدون إنترنت</li>
          <li>✓ الفواتير المحفوظة أوفلاين تظهر في شريط الحالة بالأسفل</li>
          <li>✓ اضغط «إرسال الآن» أو انتظر المزامنة التلقائية</li>
        </ul>
        <a href="/" className="btn btn-blue mt-4 inline-flex h-10 px-5 text-[14px] font-black">
          إعادة المحاولة
        </a>
      </div>
    </div>
  );
}
