"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gift, Loader2, MessageCircle, Phone, Power, RefreshCw, ShieldCheck } from "lucide-react";
import { Window } from "@/components/win/Window";
import { CartLogo, IconInfo, IconSupport } from "@/components/icons/AppIcons";
import { APP_BRAND, APP_NAME, APP_TAGLINE, APP_VERSION, DEFAULT_LOGO, SUPPORT_PHONE, SUPPORT_TEL, WHATSAPP_URL } from "@/lib/constants";

const SHORTCUTS: Array<[string, string]> = [
  ["F2", "فاتورة جديدة"],
  ["F3", "الانتقال لخانة البحث عن صنف"],
  ["F4", "البحث عن عميل / مورد"],
  ["F9", "حفظ الفاتورة"],
  ["F10", "طباعة الفاتورة"],
  ["Enter", "إضافة الصنف / الانتقال للخانة التالية"],
  ["Delete", "حذف السطر المحدد من الفاتورة"],
  ["Esc", "إغلاق النافذة المنبثقة"],
];

const FAQ: Array<[string, string]> = [
  ["كيف أضيف صنفاً جديداً؟", "من الشاشة الرئيسية اختر (المخازن) ثم اضغط (صنف جديد) وأدخل الاسم والأسعار والرصيد."],
  ["كيف أبيع بالآجل؟", "في فاتورة المبيعات اختر العميل ثم اضغط (آجل)، وسيضاف المتبقي على رصيد العميل تلقائياً."],
  ["كيف أحصّل مبلغاً من عميل؟", "من شاشة (العملاء) اختر العميل ثم اضغط (تحصيل دفعة) وأدخل المبلغ."],
  ["هل يمكن استخدام قارئ الباركود؟", "نعم، فعّل خيار (باركود) في الفاتورة ثم امسح الصنف وسيضاف مباشرة."],
  ["كيف أحفظ الفاتورة PDF؟", "اضغط زر PDF ثم اختر (حفظ كـ PDF) من نافذة الطباعة."],
];

export function SupportView() {
  return (
    <Window title="الدعم الفني" icon={<IconSupport className="h-9 w-9" />} statusBar={<span>الدعم الفني: {SUPPORT_PHONE}</span>}>
      <div className="mx-auto h-full max-w-[1200px] space-y-4 overflow-auto p-5">
        <div className="panel flex flex-wrap items-center gap-6 p-6">
          <IconSupport className="h-32 w-32 shrink-0" />
          <div className="min-w-[300px] flex-1">
            <h2 className="text-[28px] font-black text-[#0b2350]">الدعم الفني لـ {APP_NAME}</h2>
            <p className="mt-1 text-[16px] font-bold text-slate-600">
              فريق الدعم جاهز لمساعدتك في التثبيت والتدريب وحل أي مشكلة تواجهك أثناء استخدام البرنامج.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={SUPPORT_TEL} className="phone-pill">
                <span className="phone-num num text-[34px]">{SUPPORT_PHONE}</span>
                <span className="phone-ico h-[52px] w-[52px]">
                  <Phone className="h-6 w-6 fill-white text-white" />
                </span>
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-green h-[56px] px-6 text-[18px]">
                <MessageCircle className="h-6 w-6" />
                تواصل واتساب
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Clock className="h-8 w-8 text-blue-600" />, title: "مواعيد الدعم", text: "يومياً من 10 صباحاً حتى 10 مساءً" },
            { icon: <Gift className="h-8 w-8 text-red-600" />, title: "دعم فني مجاني", text: "دعم وتدريب مجاني لجميع العملاء" },
            { icon: <ShieldCheck className="h-8 w-8 text-green-600" />, title: "تحديثات مستمرة", text: "تحديثات دورية وإضافة مميزات جديدة" },
          ].map((c) => (
            <div key={c.title} className="panel flex items-center gap-4 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#eef4ff]">{c.icon}</div>
              <div>
                <div className="text-[17px] font-black text-[#0b2350]">{c.title}</div>
                <div className="text-[14px] font-bold text-slate-600">{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div id="help" className="grid grid-cols-2 gap-4">
          <div className="panel overflow-hidden">
            <div className="navy-head px-4 py-2 text-[16px]">اختصارات لوحة المفاتيح</div>
            <table className="dgrid text-[14.5px]">
              <tbody>
                {SHORTCUTS.map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-[110px] text-center">
                      <span className="kbd text-[13px]">{k}</span>
                    </td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel overflow-hidden">
            <div className="navy-head px-4 py-2 text-[16px]">أسئلة شائعة</div>
            <div className="divide-y divide-[#dde4ef]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-4 py-2.5">
                  <summary className="cursor-pointer text-[15px] font-black text-[#0b2350]">{q}</summary>
                  <p className="mt-1 text-[14px] font-bold text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}

export function AboutView() {
  return (
    <Window title="معلومات عن البرنامج" icon={<IconInfo className="h-9 w-9" />} statusBar={<span>الإصدار {APP_VERSION}</span>}>
      <div className="grid h-full place-items-center overflow-auto p-6">
        <div className="panel w-full max-w-[760px] overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-b from-[#eaf3ff] to-white px-6 pb-4 pt-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_LOGO} alt={APP_BRAND} className="mx-auto h-[150px] w-auto object-contain drop-shadow-lg" />
            <div className="mt-1 text-[24px] font-black text-[#0b2350]">برنامج {APP_BRAND}</div>
            <div className="brand-pill mx-auto mt-1 inline-block text-[15px]">{APP_TAGLINE}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="space-y-2 text-[15px] font-bold text-slate-700">
              <div>📌 اسم البرنامج: <b className="text-[#0b2350]">{APP_NAME}</b></div>
              <div>🔢 رقم الإصدار: <b className="num text-[#0b2350]">{APP_VERSION}</b></div>
              <div>🏪 مناسب لـ: السوبر ماركت، البقالة، المكتبات، الأدوات المنزلية، وجميع الأنشطة التجارية</div>
              <div>
                ☎ الدعم الفني: <a href={SUPPORT_TEL} className="num font-black text-red-600">{SUPPORT_PHONE}</a>
              </div>
            </div>
            <ul className="space-y-1.5 text-[14.5px] font-extrabold text-[#0b2350]">
              {["فواتير مبيعات ومشتريات احترافية", "إدارة المخازن والأصناف والباركود", "حسابات العملاء والموردين والآجل", "تقارير الأرباح والمبيعات اليومية", "طباعة الفواتير وحفظها PDF", "نسخ احتياطي واستعادة البيانات", "مرتجعات المبيعات والمشتريات", "الخزينة والمصروفات وكارت الصنف", "طباعة ملصقات الباركود"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 fill-green-600 text-white" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#d5deea] bg-[#f3f6fb] px-6 py-3 text-center text-[13px] font-bold text-slate-500">
            جميع الحقوق محفوظة © {new Date().getFullYear()} — {APP_NAME}
          </div>
        </div>
      </div>
    </Window>
  );
}

export function ExitView() {
  const router = useRouter();
  const [phase, setPhase] = useState<"closing" | "closed">("closing");

  useEffect(() => {
    document.title = `تم إغلاق ${APP_NAME}`;
    const t = setTimeout(() => setPhase("closed"), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-[48px] top-0 z-30 grid place-items-center p-4">
      {phase === "closing" ? (
        <div className="flex flex-col items-center gap-4 text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,.5)" }}>
          <Loader2 className="h-16 w-16 animate-spin" />
          <div className="text-[26px] font-black">جاري إغلاق {APP_NAME}...</div>
          <div className="text-[16px] font-bold opacity-90">جاري حفظ البيانات وإغلاق النوافذ</div>
        </div>
      ) : (
        <div className="win-dialog w-full max-w-[480px]">
          <div className="win-titlebar win-titlebar-sm" dir="ltr">
            <div className="flex items-center gap-2 px-3">
              <CartLogo className="h-6 w-6" />
              <span dir="rtl" className="text-[15px] font-extrabold">{APP_NAME}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 bg-white p-6 text-center">
            <Power className="h-14 w-14 text-red-600" />
            <div className="text-[22px] font-black text-[#0b2350]">تم إغلاق البرنامج بنجاح</div>
            <div className="text-[15px] font-bold text-slate-600">شكراً لاستخدامك {APP_NAME}</div>
            <div className="text-[14px] font-bold text-slate-500">
              للدعم الفني: <span className="num font-black text-red-600">{SUPPORT_PHONE}</span>
            </div>
          </div>
          <div className="win-dialog-footer justify-center">
            <button type="button" className="btn btn-blue h-10 px-6" onClick={() => router.push("/")} autoFocus>
              <RefreshCw className="h-5 w-5" />
              تشغيل البرنامج مرة أخرى
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
