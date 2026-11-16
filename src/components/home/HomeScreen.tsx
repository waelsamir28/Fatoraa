"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { ChevronDown, Lock, RefreshCw, Search, Star } from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { APP_TITLE, APP_VERSION, DEFAULT_LOGO, SUPPORT_PHONE } from "@/lib/constants";
import { api } from "@/lib/client";
import { fmt } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { ExportDialog } from "@/components/home/ExportDialog";
import {
  IcAddBox,
  IcBackup,
  IcBarcodeScan,
  IcBoxStack,
  IcBuilding,
  IcChartBars,
  IcClipboardCheck,
  IcClockUsers,
  IcCustomers,
  IcDatabase,
  IcDeleteBox,
  IcEditBox,
  IcGear,
  IcInfo,
  IcPower,
  IcReportDoc,
  IcReturnBox,
  IcShieldCheck,
  IcUserGear,
  IcWarehouse,
  IcItemCard,
  IcTrendUp,
  IcContract,
  IcCards,
  IcCartPlus,
  RailBackup,
  RailDatabase,
  RailHome,
  RailInfo,
  RailSupport,
  RailSettings,
  RailShifts,
  RailUsers,
} from "@/components/home/HomeIcons";


type Icon = ComponentType<{ className?: string }>;
type RawIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface HomeSummary {
  salesTotal: number;
  salesCount: number;
  products: number;
  customers: number;
  lowStock: number;
  receivables: number;
  todayExpenses: number;
}

interface Card {
  href: string | null;
  label: string;
  Icon: Icon;
  action?: "export" | "exit";
}

interface Section {
  id: string;
  title: string;
  items: Card[];
}

/**
 * كل الشاشات موزّعة على 5 أقسام — ترتيب المستخدم (14/11):
 * 1) العمليات الرئيسية 2) المخزون والأصناف 3) الحسابات والخزينة
 * 4) التقارير والتحليلات 5) إعدادات النظام
 * الشاشات اللي اتشالت من الكروت باقية عادية في القائمة الجانبية والبحث السريع.
 */
const SECTIONS: Section[] = [
  {
    id: "main",
    title: "العمليات الرئيسية",
    items: [
      { href: "/customers", label: "العملاء", Icon: IcCustomers },
      { href: "/suppliers", label: "الموردين", Icon: IcBuilding },
      { href: "/sales", label: "فاتورة مبيعات", Icon: IcCartPlus },
      { href: "/purchases", label: "فاتورة مشتريات", Icon: IcReportDoc },
      { href: "/smart-orders", label: "الشراء الذكى", Icon: IcBoxStack },
      { href: "/price-checker", label: "كشك السعر", Icon: IcBarcodeScan },
      // سجل الفواتير باقي كارت زي ما هو (اتفقنا نسيبه على حاله)
      { href: "/sales/list", label: "سجل الفواتير", Icon: IcClipboardCheck },
    ],
  },
  {
    id: "stock",
    title: "المخزون والأصناف",
    items: [
      { href: "/products-manager", label: "المخازن", Icon: IcWarehouse },
      { href: "/products-manager?new=1", label: "إضافة صنف", Icon: IcAddBox },
      // بدل «تعديل صنف»
      { href: "/item-card", label: "كارت الصنف", Icon: IcItemCard },
      // بدل «حذف صنف»
      { href: "/returns/sales", label: "مرتجع مبيعات", Icon: IcReturnBox },
      { href: "/inventory", label: "جرد المخزون", Icon: IcBarcodeScan },
      // بدل «تقرير المخزون»
      { href: "/returns/purchases", label: "مرتجع مشتريات", Icon: IcReturnBox },
    ],
  },
  {
    id: "accounts",
    title: "الحسابات والخزينة",
    items: [
      { href: "/installments", label: "الأقساط", Icon: IcClipboardCheck },
      { href: "/treasury", label: "الخزينة واليومية", Icon: IcChartBars },
      { href: "/expenses", label: "المصروفات", Icon: IcDeleteBox },
      { href: "/barcode", label: "طباعة الباركود", Icon: IcBarcodeScan },
      { href: "/low-stock", label: "النواقص", Icon: IcBoxStack },
    ],
  },
  {
    id: "reports",
    title: "التقارير والتحليلات",
    items: [
      { href: "/reports", label: "تقرير المبيعات", Icon: IcChartBars },
      { href: "/dashboard", label: "لوحة المالك", Icon: IcChartBars },
      { href: "/stock-movements", label: "حركات المخزون", Icon: IcClipboardCheck },
      { href: "/profit", label: "تقرير الأرباح", Icon: IcTrendUp },
    ],
  },
  {
    id: "system",
    title: "إعدادات النظام",
    items: [
      { href: "/users", label: "الصلاحيات", Icon: IcUserGear },
      { href: "/backup-schedule", label: "النسخ التلقائي", Icon: IcBackup },
      // بدل «الفروع» — الفروع باقية زر في القائمة الجانبية
      { href: "/subscription", label: "حالة الاشتراك", Icon: IcContract },
      // لوحة التراخيص بقت كارت فقط (اتشال زرها من القائمة)
      { href: "/licenses", label: "لوحة التراخيص", Icon: IcCards },
    ],
  },
];

/** أزرار القائمة اليمنى — الأساسية فقط كما طُلب */
const RAIL: Array<{ href: string | null; label: string; Icon: RawIcon; danger?: boolean; action?: "exit" }> = [
  { href: "/", label: "الرئيسية", Icon: RailHome },
  { href: "/users", label: "المستخدمين", Icon: RailUsers },
  { href: "/branches", label: "الفروع", Icon: IcBuilding as unknown as RawIcon },
  { href: "/shifts", label: "الورديات", Icon: RailShifts },
  { href: "/settings", label: "الإعدادات", Icon: RailSettings },
  { href: "/connection", label: "ربط قاعدة البيانات", Icon: RailDatabase },
  { href: "/backup", label: "النسخ الاحتياطي", Icon: RailBackup },
  { href: "/health", label: "صحة البرنامج", Icon: IcShieldCheck as unknown as RawIcon },
  { href: "/audit", label: "سجل النشاط", Icon: IcClipboardCheck as unknown as RawIcon },
  { href: "/support", label: "الدعم الفني", Icon: RailSupport },
  { href: "/about", label: "معلومات البرنامج", Icon: RailInfo },
  { href: null, label: "خروج", Icon: IcPower as unknown as RawIcon, danger: true, action: "exit" },
];

export function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, native, quitApp, activeUser } = useDesktop();
  const { user } = useAuth();
  const [stats, setStats] = useState<HomeSummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [bannerImg, setBannerImg] = useState("");
  const [lic, setLic] = useState<{
    plan: string | null;
    planLabel: string;
    planDaysLeft: number | null;
  } | null>(null);
  const [railImg, setRailImg] = useState("");
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    api<HomeSummary>("/api/home")
      .then((d) => alive && setStats(d))
      .catch(() => alive && setStats(null));
    try {
      const cached = localStorage.getItem("fatora.settings.cache");
      if (cached) {
        const parsed = JSON.parse(cached) as Settings;
        setTimeout(() => alive && setSettings(parsed), 0);
      }
    } catch {
      /* ignore */
    }
    api<{ avatar: string }>("/api/users/avatar")
      .then((r) => alive && setAvatar(r.avatar))
      .catch(() => undefined);
    api<{ plan: string | null; planLabel: string; planDaysLeft: number | null }>("/api/license")
      .then((r) => alive && setLic(r))
      .catch(() => undefined);
    // صور البانر وخلفية الأزرار (يتم رفعها من الإعدادات)
    (["banner", "rail"] as const).forEach((kind) => {
      api<{ url: string }>(`/api/home/images?kind=${kind}`)
        .then((r) => {
          if (!alive || !r.url) return;
          if (kind === "banner") setBannerImg(r.url);
          else setRailImg(r.url);
        })
        .catch(() => undefined);
    });
    api<Settings>("/api/settings")
      .then((st) => {
        if (!alive) return;
        setSettings(st);
        try {
          localStorage.setItem("fatora.settings.cache", JSON.stringify(st));
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // الساعة (نفس موضع الصورة: التاريخ + الوقت في شريط الحالة)
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(id);
      clearInterval(t);
    };
  }, []);

  const exit = async () => {
    if (!(await confirm("هل تريد الخروج من برنامج FATORA؟", { title: "خروج" }))) return;
    if (native) quitApp();
    else router.push("/exit");
  };

  const runCard = (c: Card) => {
    if (c.action === "export") setExportOpen(true);
    else if (c.action === "exit") void exit();
    else if (c.href) router.push(c.href);
  };

  const toggle = (id: string) => setOpenSection((o) => ({ ...o, [id]: o[id] === false }));

  const userName = user?.name || activeUser || settings?.userName || "FATORA";
  const roleLabel = user?.roleLabel || "مستخدم";
  const dateStr = now ? now.toLocaleDateString("en-GB").replace(/\//g, "/") : "";
  const timeStr = now ? now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <Window
      title={APP_TITLE}
      onClose={exit}
      showBackBtn={false}
    >
      <div className="hs" dir="rtl">
        {/* خلفية واحدة تغطي البانر + الأزرار الجانبية كقطعة واحدة */}
        <Image src="/images/home-shell.jpg" alt="" fill priority sizes="1600px" className="hs-shell" />

        {/* ================= الترويسة: لوجو كبير + صورة المستخدم يمين ================= */}
        <div
          className="hs-top"
          style={bannerImg ? { backgroundImage: `url("${bannerImg}")` } : undefined}
        >

          {/* صورة المستخدم — فوق الخلفية مباشرة بدون أي فاصل */}
          <div className="hs-user">
            <div className="hs-user__ring">
              <span className="hs-user__halo" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar || "/images/avatar-user.png"} alt={userName} className="hs-user__img" />
              <span className="hs-user__badge">{roleLabel}</span>
            </div>
            <div className="hs-user__plate">
              <span className="hs-user__sub">{userName}</span>
              <span className="hs-user__dot" />
            </div>
          </div>

          {/* اللوجو في منتصف البانر */}
          <div className="hs-top__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings?.customLogoUrl || DEFAULT_LOGO} alt={APP_TITLE} className="hs-top__logo" />
          </div>
        </div>

        {/* ================= المحتوى: الكروت + القائمة اليمنى ================= */}
        <div className="hs-body">
          {/* ---- يمين: القائمة الثابتة ---- */}
          <nav className="hs-rail" style={railImg ? { backgroundImage: `url("${railImg}")` } : undefined}>
            <div className="hs-rail__inner">
            {RAIL.map((r) => {
              const on = r.href ? (r.href === "/" ? pathname === "/" : pathname === r.href || pathname.startsWith(`${r.href}/`)) : false;
              const inner = (
                <>
                  <span className="hs-rail__text">{r.label}</span>
                  <span className="hs-rail__ico">
                    <r.Icon className="h-6 w-6" />
                  </span>
                </>
              );
              return r.href ? (
                <Link key={r.label} href={r.href} className={`hs-rail__btn ${on ? "is-on" : ""} ${r.danger ? "is-danger" : ""}`}>
                  {inner}
                </Link>
              ) : (
                <button key={r.label} type="button" onClick={() => void exit()} className={`hs-rail__btn ${r.danger ? "is-danger" : ""}`}>
                  {inner}
                </button>
              );
            })}
            <div className="hs-rail__spacer" />
            </div>
          </nav>

          {/* ---- وسط: اللوحة ---- */}
          <div className="hs-main">
            {/* شريط الأدوات العلوي */}
            <div className="hs-toolbar">
              <div className="hs-tools">
                <button type="button" className="hs-tool hs-tool--green" title="تحديث البيانات" onClick={() => void api<HomeSummary>("/api/home?fresh=1").then(setStats).catch(() => undefined)}>
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="hs-tool hs-tool--blue"
                  title="بحث سريع في كل الشاشات (Ctrl+K)"
                  onClick={() => window.dispatchEvent(new Event("fatora:search"))}
                >
                  <Search className="h-4 w-4" />
                </button>
                <button type="button" className="hs-tool hs-tool--white" title="تصدير سريع" onClick={() => setExportOpen(true)}>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="hs-hello">
                <span className="hs-hello__text">أهلا بك في برنامج فاتورة لإدارة المبيعات والمخزون</span>
                <span className="hs-pill">النسخة مفتوحة</span>
                <button
                  type="button"
                  className="hs-lock"
                  onClick={() => window.dispatchEvent(new Event("fatora:lock"))}
                  title="قفل الشاشة (Ctrl+L)"
                >
                  <Lock className="h-3.5 w-3.5" strokeWidth={2.8} />
                  <span>قفل الشاشة</span>
                </button>
              </div>
            </div>

            {/* الأقسام */}
            <div className="hs-board">
              {SECTIONS.map((sec) => {
                const collapsed = openSection[sec.id] === false;
                return (
                  <div key={sec.id} className="hs-sec">
                    <button type="button" className="hs-sec__head" onClick={() => toggle(sec.id)}>
                      <span className="hs-sec__title">{sec.title}</span>
                      <Star className="hs-sec__star h-4 w-4" />
                    </button>

                    {!collapsed && (
                      <div
                        className="hs-cards"
                        style={{ gridTemplateColumns: `repeat(${sec.items.length}, minmax(0, 1fr))` }}
                      >
                        {sec.items.map((it) => (
                          <button key={it.label} type="button" className="hs-card" onClick={() => runCard(it)} title={it.label}>
                            <span className="hs-card__ico">
                              <it.Icon className="h-full w-full" />
                            </span>
                            <span className="hs-card__label">{it.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* شريط الحالة السفلي */}
            <div className="hs-footer">
              <span className="hs-footer__box">
                <b className="num">{dateStr}</b>
                <span className="hs-footer__sep">|</span>
                <b className="num">{timeStr}</b>
              </span>

              <span className="hs-footer__state">
                <span className="hs-footer__badge">✓</span>
                حالة النظام : يعمل بشكل طبيعي
              </span>

              <span className="hs-footer__info">
                <span>مبيعات اليوم: <b className="num">{fmt(stats?.salesTotal ?? 0)}</b> ج.م ({stats?.salesCount ?? 0} فاتورة)</span>
                <span className="hs-footer__sep">|</span>
                <span>الأصناف: <b className="num">{stats?.products ?? 0}</b></span>
                <span className="hs-footer__sep">|</span>
                <span>العملاء: <b className="num">{stats?.customers ?? 0}</b></span>
                <span className="hs-footer__sep">|</span>
                <span className="hs-footer__low">النواقص: <b className="num">{stats?.lowStock ?? 0}</b></span>
                <span className="hs-footer__sep">|</span>
                <span>الإصدار {APP_VERSION}</span>
                {lic && lic.plan && (
                  <>
                    <span className="hs-footer__sep">|</span>
                    <span className={lic.planDaysLeft !== null && lic.planDaysLeft <= 30 ? "hs-footer__low" : ""}>
                      {lic.planLabel}:{" "}
                      <b className="num">
                        {lic.plan === "lifetime" ? "مدى الحياة" : `${lic.planDaysLeft ?? 0} يوم`}
                      </b>
                    </span>
                  </>
                )}
                <span className="hs-footer__sep">|</span>
                <span>الدعم: <b className="num">{SUPPORT_PHONE}</b></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </Window>
  );
}
