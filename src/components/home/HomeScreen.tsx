"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { CheckSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import {
  IconBackup,
  IconBox,
  IconCustomers,
  IconExit,
  IconHome,
  IconInfo,
  IconReports,
  IconSales,
  IconSettings,
  IconSupport,
  IconSuppliers,
  IconWarehouse,
} from "@/components/icons/AppIcons";
import {
  IconBarcode,
  IconCategories,
  IconExpense,
  IconInstallments,
  IconInvoices,
  IconItemCard,
  IconReturn,
  IconReturnBox,
  IconShifts,
  IconSmartOrders,
  IconTreasury,
} from "@/components/icons/MoreIcons";
import { APP_TITLE, APP_VERSION, SUPPORT_PHONE } from "@/lib/constants";
import { api } from "@/lib/client";
import { fmt, rangeToISO, todayInput, tzOffset } from "@/lib/format";
import type { Settings } from "@/lib/types";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface TodaySummary {
  sales: { count: number; total: number };
  purchases: { count: number; total: number };
  counts: { products: number; customers: number; lowStock: number };
  profit: number;
}

const SalesSmall: Icon = (p) => <IconSales plus={false} {...p} />;

const TILES: Array<{ href: string | null; label: string; Icon: Icon; badge?: string }> = [
  { href: "/sales", label: "المبيعات", Icon: IconSales, badge: "F2" },
  { href: "/purchases", label: "المشتريات", Icon: IconBox },
  { href: "/returns/sales", label: "مرتجع المبيعات", Icon: IconReturn },
  { href: "/returns/purchases", label: "مرتجع المشتريات", Icon: IconReturnBox },
  { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories, badge: "إكسيل" },
  { href: "/inventory", label: "المخازن", Icon: IconWarehouse },
  { href: "/item-card", label: "كارت الصنف", Icon: IconItemCard },
  { href: "/smart-orders", label: "الشراء الذكي", Icon: IconSmartOrders, badge: "AI" },
  { href: "/customers", label: "العملاء", Icon: IconCustomers },
  { href: "/suppliers", label: "الموردين", Icon: IconSuppliers },
  { href: "/treasury", label: "الخزينة واليومية", Icon: IconTreasury },
  { href: "/shifts", label: "الورديات والكاشير", Icon: IconShifts },
  { href: "/installments", label: "الأقساط والمستحقات", Icon: IconInstallments },
  { href: "/expenses", label: "المصروفات", Icon: IconExpense },
  { href: "/sales/list", label: "سجل الفواتير", Icon: IconInvoices },
  { href: "/price-checker", label: "كشك استعلام السعر", Icon: IconInfo, badge: "للزبائن" },
  { href: "/reports", label: "التقارير الشاملة", Icon: IconReports },
  { href: "/barcode", label: "طباعة الباركود", Icon: IconBarcode },
  { href: "/backup", label: "النسخ الاحتياطي", Icon: IconBackup },
  { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings },
  { href: "/support", label: "الدعم الفني", Icon: IconSupport },
  { href: "/about", label: "معلومات البرنامج", Icon: IconInfo },
  { href: null, label: "خروج", Icon: IconExit },
];

const NAV: Array<{ href: string; label: string; Icon: Icon }> = [
  { href: "/", label: "الرئيسية", Icon: IconHome },
  { href: "/sales", label: "المبيعات", Icon: SalesSmall },
  { href: "/purchases", label: "المشتريات", Icon: IconBox },
  { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories },
  { href: "/smart-orders", label: "الشراء الذكي", Icon: IconSmartOrders },
  { href: "/shifts", label: "الورديات", Icon: IconShifts },
  { href: "/installments", label: "الأقساط", Icon: IconInstallments },
  { href: "/treasury", label: "الخزينة", Icon: IconTreasury },
  { href: "/price-checker", label: "استعلام الأسعار", Icon: IconInfo },
  { href: "/reports", label: "التقارير", Icon: IconReports },
  { href: "/settings", label: "الإعدادات", Icon: IconSettings },
];

export function HomeScreen() {
  const router = useRouter();
  const { confirm, native, quitApp, activeUser } = useDesktop();
  const [stats, setStats] = useState<TodaySummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("aljamal.sidebar") === "0") setSidebarOpen(false);
    } catch {
      /* ignore */
    }
    const t = todayInput();
    const r = rangeToISO(t, t);
    api<TodaySummary>(
      `/api/reports?summary=today&from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&tz=${tzOffset()}`,
    )
      .then(setStats)
      .catch(() => setStats(null));

    api<Settings>("/api/settings")
      .then((st) => {
        setSettings(st);
      })
      .catch(() => setSettings(null));
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("aljamal.sidebar", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const exit = async () => {
    if (!(await confirm("هل تريد الخروج من برنامج FATORA؟", { title: "خروج" }))) return;
    if (native) quitApp();
    else router.push("/exit");
  };

  const customBg = settings?.customBgUrl || "";

  return (
    <Window
      title={APP_TITLE}
      onClose={exit}
      showBackBtn={false}
      statusBar={
        <>
          <span>الكاشير: <b className="text-blue-800">{activeUser || settings?.userName || "FATORA"}</b></span>
          <span className="sep" />
          <span>
            مبيعات اليوم: <b className="num text-green-700">{stats ? fmt(stats.sales.total) : "..."}</b> ج.م (
            {stats?.sales.count ?? 0} فاتورة)
          </span>
          <span className="sep" />
          <span>الأصناف: <b>{stats?.counts.products ?? "-"}</b></span>
          <span className="sep" />
          <span>العملاء: <b>{stats?.counts.customers ?? "-"}</b></span>
          <span className="sep" />
          <span className={stats?.counts.lowStock ? "font-black text-red-600" : ""}>النواقص: {stats?.counts.lowStock ?? 0}</span>
          <span className="ms-auto flex items-center gap-2">
            <button type="button" className="font-black text-blue-800 underline-offset-2 hover:underline" onClick={toggleSidebar}>
              {sidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}
            </button>
            <span className="sep" />
            <span>الإصدار {APP_VERSION}</span>
            <span className="sep" />
            <span>الدعم: <b className="num font-black text-blue-800">{SUPPORT_PHONE}</b></span>
          </span>
        </>
      }
    >
      <div className="relative h-full w-full overflow-hidden p-2">
        {customBg ? (
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${customBg})` }}>
            <div className="absolute inset-0 bg-[#04122e]/45" />
          </div>
        ) : (
          <div className="home-wallpaper" />
        )}

        <div className="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-xl bg-gradient-to-b from-white/[0.98] to-[#eaf3ff]/[0.97] shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
          {/* ===== مكان البانر المصمم ===== */}
          <div className="relative flex shrink-0 flex-col border-b-2 border-white shadow-sm">
            <div className="relative h-[220px] w-full overflow-hidden">
              <Image
                src="/images/main-banner.jpg"
                alt="بانر البرنامج"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* ===== Body: Sidebar + Tiles ===== */}
          <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-1.5 pt-2">
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}
              className="absolute top-2 z-30 grid h-7 w-7 place-items-center rounded-full border border-white bg-white text-blue-800 shadow-md transition hover:bg-blue-50"
              style={{ right: sidebarOpen ? 199 : 4 }}
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" strokeWidth={2.6} /> : <PanelRightOpen className="h-4 w-4" strokeWidth={2.6} />}
            </button>

            <nav className={`side-nav ${sidebarOpen ? "" : "side-collapsed"} flex w-[190px] shrink-0 flex-col justify-center gap-1`}>
              {NAV.map((n, i) => (
                <Link key={n.label} href={n.href} className={`side-btn !h-[34px] !text-[15px] ${i === 0 ? "active" : ""}`}>
                  <n.Icon />
                  <span className="flex-1 truncate text-center">{n.label}</span>
                </Link>
              ))}
            </nav>

            <div className={`grid flex-1 gap-2 pe-1 ${sidebarOpen ? "grid-cols-6 grid-rows-3" : "grid-cols-8 grid-rows-3"}`}>
              {TILES.slice(0, sidebarOpen ? 18 : 24).map((t) =>
                t.href ? (
                  <Link key={t.label} href={t.href} className="tile group relative !p-1">
                    {t.badge && (
                      <span className="absolute left-1 top-1 rounded bg-blue-600 px-1 py-[1px] text-[9px] font-black text-white shadow-sm">
                        {t.badge}
                      </span>
                    )}
                    <t.Icon />
                    <span className="px-0.5 text-[13.5px] leading-tight">{t.label}</span>
                  </Link>
                ) : (
                  <button key={t.label} type="button" onClick={exit} className="tile group relative !p-1">
                    <t.Icon />
                    <span className="px-0.5 text-[13.5px] leading-tight">{t.label}</span>
                  </button>
                ),
              )}
            </div>
          </div>