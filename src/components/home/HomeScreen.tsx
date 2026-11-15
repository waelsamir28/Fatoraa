"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Download, Layers } from "lucide-react";
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

/** العمليات اليومية — كروت كبيرة واضحة */
const QUICK: Array<{ href: string | null; label: string; hint: string; Icon: Icon; badge?: string; tone: string }> = [
  { href: "/sales", label: "فاتورة مبيعات", hint: "F2", Icon: IconSales, badge: "F2", tone: "#2fb3a6" },
  { href: "/purchases", label: "فاتورة مشتريات", hint: "شراء أصناف", Icon: IconBox, tone: "#3b82f6" },
  { href: "/returns/sales", label: "مرتجع مبيعات", hint: "إرجاع صنف مباع", Icon: IconReturn, tone: "#0ea5e9" },
  { href: "/returns/purchases", label: "مرتجع مشتريات", hint: "إرجاع للمورد", Icon: IconReturnBox, tone: "#6366f1" },
  { href: "/sales/list", label: "سجل الفواتير", hint: "بحث وتعديل", Icon: IconInvoices, tone: "#8b5cf6" },
  { href: "/customers", label: "العملاء", hint: "أرصدة ومدفوعات", Icon: IconCustomers, tone: "#0284c7" },
  { href: "/inventory", label: "المخازن والجرد", hint: "أرصدة وتسويات", Icon: IconWarehouse, tone: "#14b8a6" },
  { href: "/reports", label: "التقارير الشاملة", hint: "F9", Icon: IconReports, tone: "#f5c518" },
  { href: null, label: "تصدير سريع", hint: "إكسل / طباعة", Icon: IconBackup, tone: "#64748b" },
];

/** مجموعات الأدوات (تبويبات) — بدل 29 كارت متناثر */
const TOOL_GROUPS: Array<{
  key: string;
  title: string;
  tone: string;
  items: Array<{ href: string | null; label: string; Icon: Icon; badge?: string }>;
}> = [
  {
    key: "items",
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
    key: "money",
    title: "العملاء والحسابات",
    tone: "#0ea5e9",
    items: [
      { href: "/suppliers", label: "الموردون", Icon: IconSuppliers },
      { href: "/installments", label: "الأقساط والمستحقات", Icon: IconInstallments },
      { href: "/treasury", label: "الخزينة واليومية", Icon: IconTreasury },
      { href: "/expenses", label: "المصروفات", Icon: IconExpense },
      { href: "/shifts", label: "الورديات والكاشير", Icon: IconShifts },
      { href: "/profit", label: "تقرير الأرباح", Icon: IconProfit },
      { href: "/dashboard", label: "لوحة المالك", Icon: IconDashboard },
    ],
  },
  {
    key: "admin",
    title: "الإدارة والدعم",
    tone: "#8b5cf6",
    items: [
      { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings },
      { href: "/users", label: "المستخدمون والصلاحيات", Icon: IconUsers },
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
  const [tool, setTool] = useState("items");
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

  // استرجاع تبويب الأدوات المفضل
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const v = localStorage.getItem("fatora.home.tool");
        if (v) setTool(v);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const pickTool = (k: string) => {
    setTool(k);
    try {
      localStorage.setItem("fatora.home.tool", k);
    } catch {
      /* ignore */
    }
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
            {/* البانر مخفّض الارتفاع (أسرع تحميلاً وأفسح للكروت) */}
            <div className="relative h-[150px] w-full overflow-hidden">
              <Image
                src="/images/main-banner.jpg"
                alt="بانر البرنامج"
                fill
                priority
                quality={70}
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

            <div className="home-main">
              {/* ===== الكروت الكبيرة للعمليات اليومية ===== */}
              <div className="quick-tiles">
                {QUICK.map((t) => {
                  const inner = (
                    <>
                      <span className="quick-tile__ico" style={{ color: t.tone }}>
                        <t.Icon />
                      </span>
                      <span className="quick-tile__text">
                        <span className="quick-tile__label">{t.label}</span>
                        <span className="quick-tile__hint">{t.hint}</span>
                      </span>
                      <ChevronLeft className="quick-tile__go h-4 w-4" />
                    </>
                  );
                  return t.href ? (
                    <Link key={t.label} href={t.href} className="quick-tile">
                      {inner}
                    </Link>
                  ) : (
                    <button key={t.label} type="button" onClick={() => setExportOpen(true)} className="quick-tile" title="تصدير إكسل أو طباعة">
                      {inner}
                    </button>
                  );
                })}
              </div>

              {/* ===== أدوات إضافية (تبويبات) ===== */}
              <div className="tools-panel">
                <div className="tools-panel__head">
                  <Layers className="h-4 w-4" />
                  <span>أدوات إضافية</span>
                  <span className="tools-panel__tabs">
                    {TOOL_GROUPS.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => pickTool(g.key)}
                        className={`tools-tab ${tool === g.key ? "is-on" : ""}`}
                        style={tool === g.key ? { background: g.tone, borderColor: g.tone } : undefined}
                      >
                        {g.title}
                        <b className="tools-tab__count">{g.items.length}</b>
                      </button>
                    ))}
                  </span>
                </div>
                <div className="tools-panel__body">
                  {(TOOL_GROUPS.find((g) => g.key === tool) ?? TOOL_GROUPS[0]).items.map((it) =>
                    it.href ? (
                      <Link key={it.label} href={it.href} className="tool-chip" title={it.label}>
                        <it.Icon className="h-5 w-auto" />
                        <span>{it.label}</span>
                        {it.badge && <b className="tool-chip__badge">{it.badge}</b>}
                      </Link>
                    ) : (
                      <button key={it.label} type="button" onClick={() => void exit()} className="tool-chip" title={it.label}>
                        <it.Icon className="h-5 w-auto" />
                        <span>{it.label}</span>
                      </button>
                    ),
                  )}
                </div>
              </div>
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
