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
import { QuickSaleBar } from "@/components/invoice/QuickSaleBar";
import { ExportDialog } from "@/components/home/ExportDialog";
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

interface HomeSummary {
  salesTotal: number;
  salesCount: number;
  products: number;
  customers: number;
  lowStock: number;
  receivables: number;
  todayExpenses: number;
}

const SalesSmall: Icon = (p) => <IconSales plus={false} {...p} />;

interface HomeItem {
  href: string | null;
  label: string;
  Icon: Icon;
  badge?: string;
  /** إجراء خاص بدل الانتقال */
  action?: "export";
}

interface HomeGroup {
  title: string;
  tone: string;
  items: HomeItem[];
}

/** كل شاشات البرنامج مقسّمة مجموعات — كروت مربّعة ملوّنة */
const HOME_GROUPS: HomeGroup[] = [
  {
    title: "العمليات اليومية",
    tone: "#2fb3a6",
    items: [
      { href: "/sales", label: "فاتورة مبيعات", Icon: IconSales, badge: "F2" },
      { href: "/purchases", label: "فاتورة مشتريات", Icon: IconBox },
      { href: "/returns/sales", label: "مرتجع مبيعات", Icon: IconReturn },
      { href: "/returns/purchases", label: "مرتجع مشتريات", Icon: IconReturnBox },
      { href: "/sales/list", label: "سجل الفواتير", Icon: IconInvoices },
      { href: "/customers", label: "العملاء", Icon: IconCustomers },
      { href: null, label: "تصدير سريع", Icon: IconBackup, action: "export" },
    ],
  },
  {
    title: "الأصناف والمخزون",
    tone: "#3b82f6",
    items: [
      { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories, badge: "إكسيل" },
      { href: "/inventory", label: "المخازن والجرد", Icon: IconWarehouse },
      { href: "/low-stock", label: "النواقص", Icon: IconWarehouse, badge: "تنبيه" },
      { href: "/stock-movements", label: "حركات المخزون", Icon: IconWarehouse },
      { href: "/barcode", label: "طباعة الباركود", Icon: IconBarcode },
      { href: "/item-card", label: "كارت الصنف", Icon: IconItemCard },
      { href: "/smart-orders", label: "الشراء الذكي", Icon: IconSmartOrders, badge: "AI" },
      { href: "/price-checker", label: "كشك السعر", Icon: IconInfo },
    ],
  },
  {
    title: "الحسابات والخزينة",
    tone: "#0ea5e9",
    items: [
      { href: "/suppliers", label: "الموردون", Icon: IconSuppliers },
      { href: "/installments", label: "الأقساط والمستحقات", Icon: IconInstallments },
      { href: "/treasury", label: "الخزينة واليومية", Icon: IconTreasury },
      { href: "/expenses", label: "المصروفات", Icon: IconExpense },
      { href: "/shifts", label: "الورديات والكاشير", Icon: IconShifts },
    ],
  },
  {
    title: "التقارير",
    tone: "#eab308",
    items: [
      { href: "/reports", label: "التقارير الشاملة", Icon: IconReports, badge: "F9" },
      { href: "/profit", label: "تقرير الأرباح", Icon: IconProfit },
      { href: "/dashboard", label: "لوحة المالك", Icon: IconDashboard },
    ],
  },
  {
    title: "الإدارة والدعم",
    tone: "#8b5cf6",
    items: [
      { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings },
      { href: "/users", label: "المستخدمون", Icon: IconUsers },
      { href: "/branches", label: "الفروع", Icon: IconBranches },
      { href: "/backup", label: "النسخ الاحتياطي", Icon: IconBackup },
      { href: "/backup-schedule", label: "النسخ التلقائي", Icon: IconBackup },
      { href: "/connection", label: "ربط قاعدة البيانات", Icon: IconCloud },
      { href: "/support", label: "الدعم الفني", Icon: IconSupport },
      { href: "/about", label: "معلومات البرنامج", Icon: IconInfo },
      { href: null, label: "خروج", Icon: IconExit },
    ],
  },
];

export function HomeScreen() {
  const router = useRouter();
  const { confirm, native, quitApp, activeUser } = useDesktop();
  const [stats, setStats] = useState<HomeSummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // تحميل موازٍ وخفيف: ملخص الرئيسية + إعدادات الشاشة (بدل تقرير اليوم الكامل)
  useEffect(() => {
    let alive = true;
    api<HomeSummary>("/api/home")
      .then((d) => alive && setStats(d))
      .catch(() => alive && setStats(null));
    // الإعدادات مخزّنة محلياً — تُعرض فوراً ثم تُحدَّث في الخلفية
    try {
      const cached = localStorage.getItem("fatora.settings.cache");
      if (cached) {
        const parsed = JSON.parse(cached) as Settings;
        const id = setTimeout(() => alive && setSettings(parsed), 0);
        // لا حاجة للتنظيف: alive يحمي من التحديث بعد الخروج
        void id;
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
            مبيعات اليوم: <b className="num text-green-700">{stats ? fmt(stats.salesTotal) : "..."}</b> ج.م (
            {stats?.salesCount ?? 0} فاتورة)
          </span>
          <span className="sep" />
          <span>الأصناف: <b>{stats?.products ?? "-"}</b></span>
          <span className="sep" />
          <span>العملاء: <b>{stats?.customers ?? "-"}</b></span>
          <span className="sep" />
          {/* النواقص: الكلمة والرقم باللون الأحمر دايماً */}
          <span className="flex items-center gap-1 font-black text-red-600">
            <span>النواقص:</span>
            <b className="num text-[14px] text-red-600">{stats?.lowStock ?? 0}</b>
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
            <div className="relative h-[212px] w-full overflow-hidden">
              <Image
                src="/images/main-banner.jpg"
                alt="بانر البرنامج"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 1200px"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* ===== Body: Sidebar + Tiles ===== */}
          {/* زر الفاتورة السريعة بضغطة واحدة */}
          <QuickSaleBar />

          <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-1.5 pt-2">
            <HomeSidebar
              activeUser={activeUser || settings?.userName || "FATORA"}
              lowStock={Number(stats?.lowStock ?? 0)}
              onExit={() => void exit()}
            />

            <div className="home-cards-wrap">
              {HOME_GROUPS.map((g) => (
                <div key={g.title} className="home-group">
                  <div className="home-group__label">
                    <span className="home-group__dot" style={{ background: g.tone }} />
                    <span>{g.title}</span>
                    <span className="home-group__count" style={{ color: g.tone, background: `${g.tone}1a` }}>
                      {g.items.length}
                    </span>
                    <span className="home-group__line" style={{ background: `linear-gradient(90deg, ${g.tone}55, transparent)` }} />
                  </div>

                  <div className="home-cards">
                    {g.items.map((it) => {
                      const content = (
                        <>
                          <span className="home-card__ico" style={{ background: `${g.tone}1f`, color: g.tone }}>
                            <it.Icon />
                          </span>
                          <span className="home-card__label">{it.label}</span>
                          {it.badge && <span className="home-card__badge">{it.badge}</span>}
                        </>
                      );
                      return it.href ? (
                        <Link key={it.label} href={it.href} className="home-card" title={it.label}>
                          {content}
                        </Link>
                      ) : (
                        <button
                          key={it.label}
                          type="button"
                          className="home-card"
                          title={it.label}
                          onClick={() => (it.action === "export" ? setExportOpen(true) : void exit())}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </Window>
  );
}
