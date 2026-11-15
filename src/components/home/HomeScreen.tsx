"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  Building2 as IconBranches,
  CheckSquare,
  Cloud as IconCloud,
  LayoutDashboard as IconDashboard,
  TrendingUp as IconProfit,
  Users as IconUsers,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { HomeSidebar } from "./HomeSidebar";
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
  { href: "/low-stock", label: "تنبيهات النواقص", Icon: IconWarehouse, badge: "تنبيه" },
  { href: "/backup", label: "النسخ الاحتياطي", Icon: IconBackup },
  { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings },
  { href: "/dashboard", label: "لوحة المالك", Icon: IconDashboard },
  { href: "/profit", label: "تقرير الأرباح", Icon: IconProfit },
  { href: "/backup-schedule", label: "النسخ التلقائي", Icon: IconBackup },
  { href: "/users", label: "المستخدمون", Icon: IconUsers },
  { href: "/branches", label: "الفروع", Icon: IconBranches },
  { href: "/connection", label: "ربط قاعدة البيانات", Icon: IconCloud },
  { href: "/support", label: "الدعم الفني", Icon: IconSupport },
  { href: "/about", label: "معلومات البرنامج", Icon: IconInfo },
  { href: null, label: "خروج", Icon: IconExit },
];


export function HomeScreen() {
  const router = useRouter();
  const { confirm, native, quitApp, activeUser } = useDesktop();
  const [stats, setStats] = useState<TodaySummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
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
          {/* النواقص: الكلمة والرقم باللون الأحمر دايماً */}
          <span className="flex items-center gap-1 font-black text-red-600">
            <span>النواقص:</span>
            <b className="num text-[14px] text-red-600">{stats?.counts.lowStock ?? 0}</b>
          </span>
          <span className="ms-auto flex items-center gap-2">
            <span className="hidden text-blue-800 sm:inline">القائمة الجانبية: زر التصغير أعلى القائمة</span>
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
            <HomeSidebar
              activeUser={activeUser || settings?.userName || "FATORA"}
              lowStock={Number(stats?.counts.lowStock ?? 0)}
              onExit={() => void exit()}
            />

            <div className="tiles-grid">
              {TILES.map((t) =>
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
          {/* ===== Footnote صغير أسفل الشاشة ===== */}
          <div className="relative flex h-[34px] shrink-0 items-center justify-between border-t border-[#dbe7f5] bg-gradient-to-b from-white to-[#eef4fb] px-4 text-[12px] font-bold text-[#274b74]">
            <span className="flex items-center gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
              سهل الاستخدام • دعم فني وتدريب مجاني • مناسب لجميع الأنشطة التجارية
            </span>
            <span className="flex items-center gap-2">
              <span>الإصدار {APP_VERSION}</span>
              <span className="h-3 w-px bg-[#c2d6ea]" />
              <span>الدعم الفني:</span>
              <b className="num font-black text-blue-800">{settings?.phone || SUPPORT_PHONE}</b>
              {settings?.phone2 ? (
                <>
                  <span className="h-3 w-px bg-[#c2d6ea]" />
                  <b className="num font-black text-green-700">{settings.phone2}</b>
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    </Window>
  );
}
