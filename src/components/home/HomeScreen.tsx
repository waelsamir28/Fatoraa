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
  IcCartPlus,
  RailBackup,
  RailDatabase,
  RailHome,
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

/** الأقسام الثلاثة كما في الصورة المرجعية — بأزرار برنامجنا */
const SECTIONS: Section[] = [
  {
    id: "main",
    title: "العمليات الرئيسية",
    items: [
      { href: "/sales", label: "فاتورة مبيعات", Icon: IcCartPlus },
      { href: "/returns/sales", label: "مرتجع مبيعات", Icon: IcReturnBox },
      { href: "/inventory", label: "مخزن منتجات", Icon: IcBoxStack },
      { href: "/sales/list", label: "سجل الفواتير", Icon: IcClipboardCheck },
      { href: "/customers", label: "العملاء", Icon: IcCustomers },
      { href: "/reports", label: "تقرير المبيعات", Icon: IcReportDoc },
    ],
  },
  {
    id: "stock",
    title: "إدارة المخزون",
    items: [
      { href: "/products-manager", label: "المخازن", Icon: IcWarehouse },
      { href: "/products-manager?new=1", label: "إضافة صنف", Icon: IcAddBox },
      { href: "/products-manager", label: "تعديل صنف", Icon: IcEditBox },
      { href: "/products-manager", label: "حذف صنف", Icon: IcDeleteBox },
      { href: "/sales", label: "جرد المخزون", Icon: IcBarcodeScan },
      { href: "/inventory", label: "تقرير المخزون", Icon: IcChartBars },
    ],
  },
  {
    id: "system",
    title: "إعدادات النظام",
    items: [
      { href: "/settings", label: "إعدادات البرنامج", Icon: IcGear },
      { href: "/users", label: "المستخدمين", Icon: IcUserGear },
      { href: "/users", label: "صلاحيات المستخدمين", Icon: IcShieldCheck },
      { href: "/connection", label: "قاعدة البيانات", Icon: IcDatabase },
      { href: "/backup", label: "النسخ الاحتياطي", Icon: IcBackup },
      { href: "/about", label: "حول البرنامج", Icon: IcInfo },
    ],
  },
];

/** أزرار القائمة اليمنى — الأساسية فقط كما طُلب */
const RAIL: Array<{ href: string | null; label: string; Icon: RawIcon; danger?: boolean; action?: "exit" }> = [
  { href: "/", label: "الرئيسية", Icon: RailHome },
  { href: "/users", label: "المستخدمين", Icon: RailUsers },
  { href: "/shifts", label: "الورديات", Icon: RailShifts },
  { href: "/settings", label: "الإعدادات", Icon: RailSettings },
  { href: "/connection", label: "ربط قاعدة البيانات", Icon: RailDatabase },
  { href: "/backup", label: "النسخ الاحتياطي", Icon: RailBackup },
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
      statusBar={
        <>
          <span className="ms-auto flex items-center gap-2">
            <span>الإصدار {APP_VERSION}</span>
            <span className="sep" />
            <span>الدعم: <b className="num font-black text-blue-800">{SUPPORT_PHONE}</b></span>
          </span>
        </>
      }
    >
      <div className="hs" dir="rtl">
        {/* ================= الترويسة: البانر + كارت المستخدم ================= */}
        <div className="hs-top">
          <div className="hs-banner">
            <Image src="/images/home-banner.png" alt="FATORA" fill priority sizes="(max-width: 900px) 70vw, 1100px" className="hs-banner__bg" />
            <div className="hs-banner__brand">
              <div className="hs-banner__word">فاتورة</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings?.customLogoUrl || DEFAULT_LOGO} alt={APP_TITLE} className="hs-banner__logo" />
              <div className="hs-banner__tag">إدارة أسهل .. مبيعات أذكى</div>
            </div>
          </div>

          <div className="hs-user">
            <div className="hs-user__ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/avatar-user.png" alt={userName} className="hs-user__img" />
            </div>
            <div className="hs-user__name">{roleLabel}</div>
            <div className="hs-user__sub">{userName}</div>
            <div className="hs-user__line" />
          </div>
        </div>

        {/* ================= المحتوى: الكروت + القائمة اليمنى ================= */}
        <div className="hs-body">
          {/* ---- يمين: القائمة الثابتة ---- */}
          <nav className="hs-rail">
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
            <button
              type="button"
              className="hs-rail__btn hs-rail__btn--lock"
              onClick={() => window.dispatchEvent(new Event("fatora:lock"))}
              title="قفل الشاشة (Ctrl+L)"
            >
              <span className="hs-rail__text">قفل الشاشة</span>
              <span className="hs-rail__ico">
                <Lock className="h-5 w-5" />
              </span>
            </button>
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
                      <div className="hs-cards">
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
                <span className="hs-footer__ico">
                  <IcClockUsers className="h-4 w-4" />
                </span>
                <b className="num">{dateStr}</b>
                <span className="hs-footer__sep">|</span>
                <b className="num">{timeStr}</b>
              </span>
              <span className="hs-footer__state">
                <span className="hs-footer__badge">✓</span>
                حالة النظام : يعمل بشكل طبيعي
              </span>
              <span className="hs-footer__ver">
                {fmt(stats?.salesTotal ?? 0)} ج.م اليوم
                <span className="hs-footer__i">i</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </Window>
  );
}
