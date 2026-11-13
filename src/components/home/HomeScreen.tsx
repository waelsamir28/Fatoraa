"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { CheckSquare, PanelRightClose, PanelRightOpen, Phone } from "lucide-react";
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
import { APP_BRAND, APP_TITLE, APP_VERSION, SUPPORT_PHONE, SUPPORT_TEL } from "@/lib/constants";
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

function GoldBadge({ brand }: { brand: string }) {
  return (
    <div className="relative shrink-0 pb-2">
      <div className="badge-gold">
        <div className="leading-tight">
          <div className="text-[12px] font-black">برنامج</div>
          <div className="font-display text-[26px] leading-none text-[#a5150e]">{brand || APP_BRAND}</div>
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#ffd2cc] bg-gradient-to-b from-[#e8261b] to-[#a5120a] px-2.5 py-0.5 text-[11px] font-black text-white shadow-md">
        الاختيار الأفضل
      </div>
    </div>
  );
}

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

  const bigTitle = settings?.customBigTitle || "FATORA";
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
          <div className="relative flex shrink-0 flex-col">
            <div className="relative h-[196px] w-full overflow-hidden">
              <Image
                src="/images/main-banner.jpg"
                alt="بانر البرنامج"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>

            {/* البانر الأزرق السفلي + أرقام الهاتف */}
            <div className="flex items-stretch gap-0">
              <div
                className="relative flex min-w-0 flex-1 items-center justify-between gap-4 px-5 py-2 text-white shadow-md"
                style={{
                  background: "linear-gradient(180deg,#2f7ff0 0%,#1d63d8 52%,#0f47a8 100%)",
                  borderTop: "2px solid #ffffff",
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <GoldBadge brand={bigTitle} />
                  <div className="min-w-0">
                    <div className="truncate text-[20px] font-black leading-tight drop-shadow">إدارة احترافية .. لمحل تجاري أكثر نجاحاً</div>
                    <div className="truncate text-[12.5px] font-bold opacity-90">
                      أدوات مدرسية • خردوات • طباعة وتصميم • كروت أفراح • دعاية وإعلان
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-stretch gap-2">
                  <a href={SUPPORT_TEL} className="phone-pill !gap-3 !px-3 !py-1" title="اتصال بالدعم الفني">
                    <div className="text-right leading-tight">
                      <div className="text-[10.5px] font-bold opacity-90">الدعم الفني</div>
                      <div className="phone-num num !text-[26px]">{settings?.phone || SUPPORT_PHONE}</div>
                    </div>
                    <span className="phone-ico !h-[38px] !w-[38px]">
