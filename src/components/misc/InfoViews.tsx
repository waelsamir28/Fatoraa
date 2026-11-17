"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock, Gift, Layers, Loader2, MessageCircle, Phone, Power, RefreshCw, ShieldCheck } from "lucide-react";
import { Window } from "@/components/win/Window";
import { CartLogo, IconInfo, IconSupport } from "@/components/icons/AppIcons";
import { APP_BRAND, APP_NAME, APP_TAGLINE, APP_VERSION, DEFAULT_LOGO, SUPPORT_PERSON, SUPPORT_PHONE, SUPPORT_TEL, WHATSAPP_URL } from "@/lib/constants";
import { UpdatePanel } from "@/components/win/UpdateCenter";

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

/**
 * صفحة الدعم الفني — مقسومة لقسمين واضحين:
 * 1) شرح (إيه اللي نعمله وامتى) 2) التواصل الفعلي (أرقام وأزرار).
 */
export function SupportView() {
  return (
    <Window
      title="الدعم الفني"
      icon={<IconSupport className="h-9 w-9" />}
      statusBar={<span>الدعم الفني: {SUPPORT_PERSON} — {SUPPORT_PHONE}</span>}
      fit={false}
    >
      <div className="mx-auto h-full max-w-[1020px] space-y-4 overflow-auto p-4" data-scroll-root="1">
        {/* ===== قسم 1: الشرح ===== */}
        <div className="overflow-hidden rounded-2xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2.5 text-white">
            <IconSupport className="h-6 w-6" />
            <div>
              <div className="text-[16px] font-black">الدعم الفني لـ {APP_NAME}</div>
              <div className="text-[11.5px] font-bold text-blue-200">إيه اللي بنقدمه — وامتى تحتاج تتواصل معانا</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            {[
              {
                icon: <Clock className="h-6 w-6 text-blue-600" />,
                title: "مواعيد الدعم",
                text: "يومياً من 10 صباحاً حتى 10 مساءً — عدا الجمعة بعد الظهر.",
              },
              {
                icon: <Gift className="h-6 w-6 text-red-600" />,
                title: "تدريب مجاني",
                text: "شرح كامل للكاشير والمالك، وملفات تدريب مرفقة مع التثبيت.",
              },
              {
                icon: <ShieldCheck className="h-6 w-6 text-green-600" />,
                title: "تحديثات مستمرة",
                text: "تحديثات دورية وإضافة مميزات جديدة بدون أي رسوم إضافية.",
              },
            ].map((c) => (
              <div key={c.title} className="flex items-start gap-2 rounded-xl border border-[#dce8f6] bg-[#f7fbff] p-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white shadow-sm">{c.icon}</span>
                <div>
                  <div className="text-[13.5px] font-black text-[#0b2350]">{c.title}</div>
                  <div className="text-[11.5px] font-bold leading-5 text-slate-600">{c.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#e3ecf7] p-3">
            <div className="mb-1.5 text-[13px] font-black text-[#0f2942]">امتى تحتاج تتواصل معانا؟</div>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {[
                "البرنامج مش بيفتح أو بيقفل لوحده",
                "مشكلة في الطباعة أو مقاس الفاتورة",
                "عايز تنقل البيانات لجهاز جديد",
                "عايز تفعّل نسخة إضافية أو تجدد الاشتراك",
                "مشكلة في الباركود أو قارئ الباركود",
                "عايز تدرّب موظف جديد على البرنامج",
              ].map((t) => (
                <div key={t} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[11.5px] font-bold text-slate-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a6fd0]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== قسم 2: التواصل ===== */}
        <div className="overflow-hidden rounded-2xl border-2 border-[#2fb3a6] bg-white shadow-sm">
          <div className="bg-[#0067c0] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2 text-[16px] font-black">
              <Phone className="h-5 w-5" />
              التواصل المباشر
            </div>
            <div className="text-[11.5px] font-bold text-emerald-100">اتصل أو راسلنا واتساب — بنرد في نفس اليوم</div>
          </div>
          <div className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-center">
            <div className="text-center">
              <div className="text-[13px] font-black text-[#0b2350]">{SUPPORT_PERSON}</div>
              <a href={SUPPORT_TEL} className="phone-pill mt-1.5">
                <span className="phone-num num text-[26px]">{SUPPORT_PHONE}</span>
                <span className="phone-ico h-[42px] w-[42px]">
                  <Phone className="h-5 w-5 fill-white text-white" />
                </span>
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-green h-[46px] px-6 text-[15px]">
                <MessageCircle className="h-5 w-5" />
                تواصل واتساب
              </a>
              <a href={SUPPORT_TEL} className="btn btn-blue h-[46px] px-6 text-[15px]">
                <Phone className="h-5 w-5" />
                اتصال مباشر
              </a>
            </div>
          </div>
        </div>

        {/* ===== مساعدة سريعة ===== */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-[#dce8f6] bg-white">
            <div className="navy-head px-3 py-1.5 text-[13px]">اختصارات لوحة المفاتيح</div>
            <table className="dgrid text-[12.5px]">
              <tbody>
                {SHORTCUTS.map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-[100px] text-center">
                      <span className="kbd text-[11.5px]">{k}</span>
                    </td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#dce8f6] bg-white">
            <div className="navy-head px-3 py-1.5 text-[13px]">أسئلة شائعة</div>
            <div className="divide-y divide-[#dde4ef]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-3 py-2">
                  <summary className="cursor-pointer text-[12.5px] font-black text-[#0b2350]">{q}</summary>
                  <p className="mt-1 text-[11.5px] font-bold leading-5 text-slate-600">{a}</p>
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
  const facts: Array<[string, string]> = [
    ["اسم البرنامج", APP_NAME],
    ["رقم الإصدار", APP_VERSION],
    ["مناسب لـ", "السوبر ماركت، البقالة، المكتبات، الأدوات المنزلية، وجميع الأنشطة التجارية"],
    ["الدعم الفني", `${SUPPORT_PERSON} — ${SUPPORT_PHONE}`],
  ];
  const features = [
    "فواتير مبيعات ومشتريات احترافية",
    "إدارة المخازن والأصناف والباركود",
    "حسابات العملاء والموردين والآجل",
    "تقارير الأرباح والمبيعات اليومية",
    "طباعة الفواتير وحفظها PDF",
    "نسخ احتياطي واستعادة البيانات",
    "مرتجعات المبيعات والمشتريات",
    "الخزينة والمصروفات وكارت الصنف",
    "طباعة ملصقات الباركود",
  ];

  return (
    <Window
      title="معلومات عن البرنامج"
      icon={<IconInfo className="h-9 w-9" />}
      statusBar={<span>الإصدار {APP_VERSION}</span>}
      fit={false}
    >
      <div className="h-full overflow-y-auto bg-[#f7f9fc] px-4 py-4" dir="rtl">
        <div className="mx-auto w-full max-w-[1000px] space-y-4 pb-6">
          {/* الترويسة */}
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-center gap-5 bg-gradient-to-b from-[#eaf3ff] to-white px-5 py-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEFAULT_LOGO} alt={APP_BRAND} className="h-[110px] w-auto object-contain drop-shadow-lg" />
              <div className="text-center">
                <div className="text-[26px] font-black text-[#0b2350]">برنامج {APP_BRAND}</div>
                <div className="brand-pill mx-auto mt-1 inline-block text-[14px]">{APP_TAGLINE}</div>
                <div className="num mt-2 text-[13px] font-black text-slate-500">الإصدار {APP_VERSION}</div>
              </div>
            </div>
          </div>

          {/* البيانات + المميزات */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="panel p-4">
              <div className="mb-3 flex items-center gap-2 border-b border-[#dbe4f0] pb-2 text-[15px] font-black text-[#0b2350]">
                <span className="inline-block h-4 w-1.5 rounded bg-[#1a6fd0]" />
                بيانات البرنامج
              </div>
              <dl className="space-y-2.5">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap items-start gap-x-2 border-b border-dashed border-[#e2e8f2] pb-2 last:border-0">
                    <dt className="w-[110px] shrink-0 text-[13.5px] font-black text-slate-500">{k}</dt>
                    <dd className="min-w-0 flex-1 text-[14px] font-extrabold text-[#0b2350]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="panel p-4">
              <div className="mb-3 flex items-center gap-2 border-b border-[#dbe4f0] pb-2 text-[15px] font-black text-[#0b2350]">
                <span className="inline-block h-4 w-1.5 rounded bg-[#1a6fd0]" />
                مميزات البرنامج
              </div>
              <ul className="grid grid-cols-1 gap-1.5 text-[13.5px] font-extrabold text-[#0b2350] sm:grid-cols-1">
                {features.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 fill-green-600 text-white" />
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* أزرار الاشتراك */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/subscription"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#2f86e8] to-[#1a5fc0] px-4 text-[13.5px] font-black text-white shadow"
            >
              <BadgeCheck className="h-4 w-4" />
              حالة اشتراكي
            </Link>
            <Link
              href="/plans"
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-[#c9d8ee] bg-white px-4 text-[13.5px] font-black text-[#0f2942]"
            >
              <Layers className="h-4 w-4 text-[#1a6fd0]" />
              أنظمة التفعيل والأسعار
            </Link>
            <a href={SUPPORT_TEL} className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 text-[13.5px] font-black text-emerald-800">
              <Phone className="h-4 w-4" />
              <span className="num">{SUPPORT_PHONE}</span>
            </a>
          </div>

          {/* التحديثات */}
          <div className="panel overflow-hidden">
            <div className="navy-head px-4 py-2 text-[15px]">تحديثات البرنامج</div>
            <div className="p-3">
              <UpdatePanel />
            </div>
          </div>

          <div className="rounded-lg border border-[#d5deea] bg-white px-4 py-3 text-center text-[12.5px] font-bold text-slate-500">
            جميع الحقوق محفوظة © {new Date().getFullYear()} — {APP_NAME} · {SUPPORT_PERSON}
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
              <CartLogo className="h-4 w-4" />
              <span dir="rtl" className="text-[12.5px] font-extrabold">{APP_NAME}</span>
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
