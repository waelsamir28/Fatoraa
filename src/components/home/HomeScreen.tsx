"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Download,
  LayoutGrid,
  Lock,
  Palette,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_SIDEBAR, useUiPrefs } from "@/components/win/UiPrefs";
import { pageAllowed } from "@/lib/pages";
import { APP_TITLE, APP_VERSION, DEFAULT_LOGO, SUPPORT_PERSON, SUPPORT_PHONE } from "@/lib/constants";
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
  IcContract,
  IcCustomers,
  IcDeleteBox,
  IcItemCard,
  IcReportDoc,
  IcReturnBox,
  IcTrendUp,
  IcUserGear,
  IcWarehouse,
  IcCartPlus,
} from "@/components/home/HomeIcons";

type Icon = ComponentType<{ className?: string }>;

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
  action?: "export" | "exit" | "print-last";
  /** تدرج لوني متناسق مع هوية البرنامج لكل كارت */
  gradFrom: string;
  gradTo: string;
  shadow: string;
  tintBg: string;
  tintBorder: string;
}

interface Section {
  id: string;
  title: string;
  accent: string;
  items: Card[];
}

/**
 * كل الشاشات موزّعة على 5 أقسام مع ألوان عصرية غنية تناسب هوية البرنامج:
 * 1) العمليات الرئيسية (أزرق ملكي / سماوي / ياقوتي)
 * 2) المخزون والأصناف (تركواز / زمردي / أخضر نعناعي)
 * 3) الحسابات والخزينة (بنفسجي / نيلي / أرجواني)
 * 4) التقارير والتحليلات (كهرماني / برتقالي دافئ / ذهبي)
 * 5) إعدادات النظام (بترولي / فولاذي أزرق)
 */
const SECTIONS: Section[] = [
  {
    id: "main",
    title: "العمليات الرئيسية",
    accent: "#0067c0",
    items: [
      {
        href: "/sales",
        label: "فاتورة مبيعات",
        Icon: IcCartPlus,
        gradFrom: "#0078d4",
        gradTo: "#005a9e",
        shadow: "rgba(0, 103, 192, 0.35)",
        tintBg: "#eff6ff",
        tintBorder: "#bfdbfe",
      },
      {
        href: "/purchases",
        label: "فاتورة مشتريات",
        Icon: IcReportDoc,
        gradFrom: "#0284c7",
        gradTo: "#0369a1",
        shadow: "rgba(2, 132, 199, 0.34)",
        tintBg: "#f0f9ff",
        tintBorder: "#bae6fd",
      },
      {
        href: "/customers",
        label: "العملاء",
        Icon: IcCustomers,
        gradFrom: "#2563eb",
        gradTo: "#1d4ed8",
        shadow: "rgba(37, 99, 235, 0.34)",
        tintBg: "#eef2ff",
        tintBorder: "#c7d2fe",
      },
      {
        href: "/suppliers",
        label: "الموردين",
        Icon: IcBuilding,
        gradFrom: "#0891b2",
        gradTo: "#0e7490",
        shadow: "rgba(8, 145, 178, 0.34)",
        tintBg: "#ecfeff",
        tintBorder: "#a5f3fc",
      },
      {
        href: "/sales/list",
        label: "سجل الفواتير",
        Icon: IcClipboardCheck,
        gradFrom: "#3b82f6",
        gradTo: "#1e40af",
        shadow: "rgba(59, 130, 246, 0.34)",
        tintBg: "#eff6ff",
        tintBorder: "#bfdbfe",
      },
      {
        href: "/smart-orders",
        label: "الشراء الذكى",
        Icon: IcBoxStack,
        gradFrom: "#4f46e5",
        gradTo: "#3730a3",
        shadow: "rgba(79, 70, 229, 0.34)",
        tintBg: "#eef2ff",
        tintBorder: "#c7d2fe",
      },
      {
        href: "/price-checker",
        label: "كشك السعر",
        Icon: IcBarcodeScan,
        gradFrom: "#0ea5e9",
        gradTo: "#0284c7",
        shadow: "rgba(14, 165, 233, 0.34)",
        tintBg: "#f0f9ff",
        tintBorder: "#bae6fd",
      },
      {
        href: null,
        label: "طباعة آخر فاتورة",
        Icon: Printer as unknown as Icon,
        action: "print-last",
        gradFrom: "#1d4ed8",
        gradTo: "#1e3a8a",
        shadow: "rgba(29, 78, 216, 0.34)",
        tintBg: "#eff6ff",
        tintBorder: "#bfdbfe",
      },
    ],
  },
  {
    id: "stock",
    title: "المخزون والأصناف",
    accent: "#0d9488",
    items: [
      {
        href: "/products-manager",
        label: "المخازن والأصناف",
        Icon: IcWarehouse,
        gradFrom: "#0d9488",
        gradTo: "#0f766e",
        shadow: "rgba(13, 148, 136, 0.34)",
        tintBg: "#f0fdfa",
        tintBorder: "#99f6e4",
      },
      {
        href: "/products-manager?new=1",
        label: "إضافة صنف",
        Icon: IcAddBox,
        gradFrom: "#10b981",
        gradTo: "#059669",
        shadow: "rgba(16, 185, 129, 0.34)",
        tintBg: "#ecfdf5",
        tintBorder: "#a7f3d0",
      },
      {
        href: "/item-card",
        label: "كارت الصنف",
        Icon: IcItemCard,
        gradFrom: "#14b8a6",
        gradTo: "#0d9488",
        shadow: "rgba(20, 184, 166, 0.34)",
        tintBg: "#f0fdfa",
        tintBorder: "#99f6e4",
      },
      {
        href: "/inventory",
        label: "جرد المخزون",
        Icon: IcBarcodeScan,
        gradFrom: "#059669",
        gradTo: "#047857",
        shadow: "rgba(5, 150, 105, 0.34)",
        tintBg: "#ecfdf5",
        tintBorder: "#a7f3d0",
      },
      {
        href: "/returns/sales",
        label: "مرتجع مبيعات",
        Icon: IcReturnBox,
        gradFrom: "#0891b2",
        gradTo: "#155e75",
        shadow: "rgba(8, 145, 178, 0.32)",
        tintBg: "#ecfeff",
        tintBorder: "#a5f3fc",
      },
      {
        href: "/returns/purchases",
        label: "مرتجع مشتريات",
        Icon: IcReturnBox,
        gradFrom: "#0f766e",
        gradTo: "#115e59",
        shadow: "rgba(15, 118, 110, 0.32)",
        tintBg: "#f0fdfa",
        tintBorder: "#99f6e4",
      },
    ],
  },
  {
    id: "accounts",
    title: "الحسابات والخزينة",
    accent: "#7c3aed",
    items: [
      {
        href: "/treasury",
        label: "الخزينة واليومية",
        Icon: IcChartBars,
        gradFrom: "#7c3aed",
        gradTo: "#5b21b6",
        shadow: "rgba(124, 58, 237, 0.34)",
        tintBg: "#f5f3ff",
        tintBorder: "#ddd6fe",
      },
      {
        href: "/installments",
        label: "الأقساط",
        Icon: IcClipboardCheck,
        gradFrom: "#6366f1",
        gradTo: "#4338ca",
        shadow: "rgba(99, 102, 241, 0.34)",
        tintBg: "#eef2ff",
        tintBorder: "#c7d2fe",
      },
      {
        href: "/expenses",
        label: "المصروفات",
        Icon: IcDeleteBox,
        gradFrom: "#e11d48",
        gradTo: "#be123c",
        shadow: "rgba(225, 29, 72, 0.32)",
        tintBg: "#fff1f2",
        tintBorder: "#fecdd3",
      },
      {
        href: "/barcode",
        label: "طباعة الباركود",
        Icon: IcBarcodeScan,
        gradFrom: "#8b5cf6",
        gradTo: "#6d28d9",
        shadow: "rgba(139, 92, 246, 0.34)",
        tintBg: "#f5f3ff",
        tintBorder: "#ddd6fe",
      },
      {
        href: "/low-stock",
        label: "النواقص",
        Icon: IcBoxStack,
        gradFrom: "#f97316",
        gradTo: "#c2410c",
        shadow: "rgba(249, 115, 22, 0.34)",
        tintBg: "#fff7ed",
        tintBorder: "#fed7aa",
      },
    ],
  },
  {
    id: "reports",
    title: "التقارير والتحليلات",
    accent: "#d97706",
    items: [
      {
        href: "/reports",
        label: "تقرير المبيعات",
        Icon: IcChartBars,
        gradFrom: "#f59e0b",
        gradTo: "#b45309",
        shadow: "rgba(245, 158, 11, 0.34)",
        tintBg: "#fffbeb",
        tintBorder: "#fde68a",
      },
      {
        href: "/profit",
        label: "تقرير الأرباح",
        Icon: IcTrendUp,
        gradFrom: "#16a34a",
        gradTo: "#15803d",
        shadow: "rgba(22, 163, 74, 0.34)",
        tintBg: "#f0fdf4",
        tintBorder: "#bbf7d0",
      },
      {
        href: "/dashboard",
        label: "لوحة المالك",
        Icon: IcChartBars,
        gradFrom: "#ea580c",
        gradTo: "#9a3412",
        shadow: "rgba(234, 88, 12, 0.34)",
        tintBg: "#fff7ed",
        tintBorder: "#fed7aa",
      },
      {
        href: "/stock-movements",
        label: "حركات المخزون",
        Icon: IcClipboardCheck,
        gradFrom: "#d97706",
        gradTo: "#92400e",
        shadow: "rgba(217, 119, 6, 0.32)",
        tintBg: "#fffbeb",
        tintBorder: "#fde68a",
      },
      {
        href: "/audit",
        label: "سجل النشاط",
        Icon: IcClipboardCheck,
        gradFrom: "#0284c7",
        gradTo: "#075985",
        shadow: "rgba(2, 132, 199, 0.32)",
        tintBg: "#f0f9ff",
        tintBorder: "#bae6fd",
      },
    ],
  },
  {
    id: "system",
    title: "إعدادات النظام",
    accent: "#334155",
    items: [
      {
        href: "/settings",
        label: "الإعدادات والمظهر",
        Icon: Palette as unknown as Icon,
        gradFrom: "#2563eb",
        gradTo: "#1e3a8a",
        shadow: "rgba(37, 99, 235, 0.34)",
        tintBg: "#eff6ff",
        tintBorder: "#bfdbfe",
      },
      {
        href: "/users",
        label: "الصلاحيات",
        Icon: IcUserGear,
        gradFrom: "#334155",
        gradTo: "#0f172a",
        shadow: "rgba(51, 65, 85, 0.34)",
        tintBg: "#f8fafc",
        tintBorder: "#cbd5e1",
      },
      {
        href: "/pages",
        label: "صلاحيات الشاشات",
        Icon: IcContract,
        gradFrom: "#475569",
        gradTo: "#1e293b",
        shadow: "rgba(71, 85, 105, 0.34)",
        tintBg: "#f8fafc",
        tintBorder: "#cbd5e1",
      },
      {
        href: "/backup-schedule",
        label: "النسخ التلقائي",
        Icon: IcBackup,
        gradFrom: "#0f766e",
        gradTo: "#134e4a",
        shadow: "rgba(15, 118, 110, 0.34)",
        tintBg: "#f0fdfa",
        tintBorder: "#99f6e4",
      },
      {
        href: "/subscription",
        label: "حالة الاشتراك",
        Icon: IcContract,
        gradFrom: "#1e40af",
        gradTo: "#172554",
        shadow: "rgba(30, 64, 175, 0.34)",
        tintBg: "#eff6ff",
        tintBorder: "#bfdbfe",
      },
    ],
  },
];

export function HomeScreen() {
  const router = useRouter();
  const { confirm, native, quitApp, activeUser, toast } = useDesktop();
  const { user } = useAuth();
  const { prefs, save: savePrefs } = useUiPrefs();
  const sb = { ...DEFAULT_SIDEBAR, ...(prefs.sidebarOptions || {}) };

  const [stats, setStats] = useState<HomeSummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [bannerImg, setBannerImg] = useState("");
  const [lic, setLic] = useState<{
    isActivated: boolean;
    plan: string | null;
    planLabel: string;
    planDaysLeft: number | null;
    daysLeft: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [query, setQuery] = useState("");
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
    const loadLicense = () => {
      api<{ isActivated: boolean; plan: string | null; planLabel: string; planDaysLeft: number | null; daysLeft: number }>("/api/license")
        .then((r) => alive && setLic(r))
        .catch(() => undefined);
    };
    loadLicense();
    window.addEventListener("fatora:license-changed", loadLicense);
    window.addEventListener("focus", loadLicense);

    api<{ url: string }>("/api/home/images?kind=banner")
      .then((r) => {
        if (alive && r.url) setBannerImg(r.url);
      })
      .catch(() => undefined);

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
      window.removeEventListener("fatora:license-changed", loadLicense);
      window.removeEventListener("focus", loadLicense);
    };
  }, []);

  // الساعة والتاريخ
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

  /** إعادة طباعة آخر فاتورة مبيعات بضغطة واحدة */
  const printLastInvoice = async () => {
    try {
      const r = await api<{ ok: boolean; invoice?: { id: number; number: number; total: number }; printUrl?: string; error?: string }>(
        "/api/invoices/autosave?type=sale",
      );
      if (!r.ok || !r.invoice) {
        toast(r.error || "لا توجد فواتير محفوظة بعد", "info");
        return;
      }
      document.getElementById("home-print-frame")?.remove();
      const f = document.createElement("iframe");
      f.id = "home-print-frame";
      Object.assign(f.style, { position: "fixed", left: "-10000px", top: "0", width: "820px", height: "1100px", border: "0" });
      f.src = r.printUrl || `/print/${r.invoice.id}?auto=1`;
      document.body.appendChild(f);
      setTimeout(() => toast(`جارٍ طباعة الفاتورة رقم ${r.invoice?.number} (إجمالي ${fmt(r.invoice?.total ?? 0)})`), 200);
    } catch {
      toast("تعذّر الوصول لآخر فاتورة", "error");
    }
  };

  const runCard = (c: Card) => {
    if (c.action === "export") setExportOpen(true);
    else if (c.action === "exit") void exit();
    else if (c.action === "print-last") void printLastInvoice();
    else if (c.href) router.push(c.href);
  };

  const toggleCardStyleQuick = () => {
    const nextStyle = sb.homeCardStyle === "acrylic" ? "colored" : "acrylic";
    void savePrefs({
      sidebarOptions: {
        ...sb,
        homeCardStyle: nextStyle,
      },
    });
    toast(nextStyle === "colored" ? "تم التبديل إلى: الكروت الملونة بالكامل" : "تم التبديل إلى: الكروت الزجاجية بأيقونات ملونة");
  };

  /** تصفية الأقسام حسب صلاحيات المستخدم */
  const allowedSections = useMemo(
    () =>
      SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          if (!it.href) return true;
          const path = it.href.split("?")[0];
          return pageAllowed(user, path);
        }),
      })).filter((sec) => sec.items.length > 0),
    [user],
  );

  /** الكروت المعروضة في اللوحة المركزية حسب التبويب والبحث */
  const displayedCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const baseSections =
      activeTab === "all" ? allowedSections : allowedSections.filter((s) => s.id === activeTab);

    const cards = baseSections.flatMap((sec) =>
      sec.items.map((item) => ({
        ...item,
        sectionTitle: sec.title,
        sectionAccent: sec.accent,
      })),
    );

    if (!q) return cards;
    return cards.filter(
      (c) => c.label.toLowerCase().includes(q) || c.sectionTitle.toLowerCase().includes(q),
    );
  }, [allowedSections, activeTab, query]);

  const userName = user?.name || activeUser || settings?.userName || "FATORA";
  const roleLabel = user?.roleLabel || "مستخدم";
  const storeTitle = settings?.storeName || "برنامج FATORA";
  const dateStr = now ? now.toLocaleDateString("en-GB").replace(/\//g, "/") : "";
  const timeStr = now ? now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
  const isAcrylic = sb.homeCardStyle === "acrylic";
  const customBg = settings?.customBgUrl || "";

  return (
    <Window
      title="FATORA | لإدارة المحلات التجارية"
      onClose={exit}
      showBackBtn={false}
    >
      <div
        className="w11-home"
        dir="rtl"
        style={customBg ? { backgroundImage: `url("${customBg}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {/* لمسات الإضاءة الخلفية على طريقة Windows 11 Bloom */}
        {!customBg && (
          <>
            <div className="w11-orb w11-orb--1" />
            <div className="w11-orb w11-orb--2" />
            <div className="w11-orb w11-orb--3" />
          </>
        )}

        {/* ================= الشريط العلوي الزجاجي الخفيف (Windows 11 Top Bar) ================= */}
        <header className="w11-topbar">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* زر الأيقونة الصغير لعرض القائمة العائمة فوق الصفحة */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("fatora:toggle-nav"))}
              className="w11-nav-btn"
              title="فتح القائمة الجانبية (Ctrl+B)"
            >
              <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              {settings?.showLogo === true && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings?.customLogoUrl || DEFAULT_LOGO}
                  alt={APP_TITLE}
                  className="h-8 w-auto object-contain drop-shadow-sm"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14.5px] font-black text-[var(--c-ink)]">{storeTitle}</span>
                  <span className={`hs-pill${lic && !lic.isActivated ? " hs-pill--trial" : ""}`}>
                    {lic?.isActivated ? "النسخة مفتوحة" : `نسخة تجريبية (${lic?.daysLeft ?? 15} يوم)`}
                  </span>
                </div>
                <div className="truncate text-[11px] font-bold text-[var(--c-ink-2)]">
                  {settings?.customTagline || "أهلاً بك في برنامج فاتورة لإدارة المبيعات والمخزون"}
                </div>
              </div>
            </div>
          </div>

          {/* يسار الشريط العلوي: المستخدم + الأدوات السريعة */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w11-user-chip">
              <span className="w11-user-chip__role">{roleLabel}</span>
              <span className="w11-user-chip__name">{userName}</span>
              {settings?.showOnlineDot !== false && <span className="hs-user__dot" />}
            </div>

            <button
              type="button"
              onClick={toggleCardStyleQuick}
              className="w11-icon-action"
              title={isAcrylic ? "التبديل إلى الكروت الملونة بالكامل" : "التبديل إلى الكروت الزجاجية بأيقونات ملونة"}
            >
              <Sparkles className="h-4 w-4 text-[#0067c0]" />
            </button>

            <button
              type="button"
              onClick={() =>
                void api<HomeSummary>("/api/home?fresh=1")
                  .then((d) => {
                    setStats(d);
                    toast("تم تحديث مؤشرات اليوم ✓");
                  })
                  .catch(() => undefined)
              }
              className="w11-icon-action"
              title="تحديث البيانات"
            >
              <RefreshCw className="h-4 w-4 text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="w11-icon-action"
              title="تصدير سريع"
            >
              <Download className="h-4 w-4 text-sky-700" />
            </button>

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
        </header>

        {/* ================= البانر العلوي الاختياري (إذا فُعّل من الإعدادات) ================= */}
        {sb.showHomeBanner && (
          <div
            className="w11-optional-banner"
            style={{ backgroundImage: `url("${bannerImg || "/images/home-banner-2027.png"}")` }}
          />
        )}

        {/* ================= منطقة المنتصف: لوحة Windows 11 Start المركزية ================= */}
        <main className="w11-stage">
          <section className="w11-hub" aria-label="شاشات البرنامج">
            {/* شريط البحث + التبويبات أعلى اللوحة المركزية */}
            <div className="w11-hub__head">
              {/* البحث الفوري بستايل ويندوز 11 */}
              <div className="w11-search">
                <Search className="h-4 w-4 shrink-0 text-[#0067c0]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث هنا عن أي شاشة أو عملية... (أو اضغط Ctrl+K للبحث الشامل)"
                  className="w11-search__input"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
                    title="مسح البحث"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("fatora:search"))}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-500 hover:bg-slate-100"
                    title="فتح نافذة الانتقال السريع"
                  >
                    Ctrl + K
                  </button>
                )}
              </div>

              {/* تبويبات ناعمة (Pills) */}
              <div className="w11-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "all"}
                  onClick={() => setActiveTab("all")}
                  className={`w11-tab ${activeTab === "all" ? "is-active" : ""}`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#0067c0]" />
                  <span>عرض الكل</span>
                  <span className="w11-tab__count">
                    {allowedSections.reduce((n, s) => n + s.items.length, 0)}
                  </span>
                </button>

                {allowedSections.map((sec) => {
                  const on = activeTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setActiveTab(sec.id)}
                      className={`w11-tab ${on ? "is-active" : ""}`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: sec.accent }} />
                      <span>{sec.title}</span>
                      <span className="w11-tab__count">{sec.items.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* الكروت متجمعة في منتصف اللوحة */}
            <div className="w11-hub__body">
              {displayedCards.length === 0 ? (
                <div className="grid h-full place-items-center py-10 text-center">
                  <div>
                    <div className="text-[15px] font-black text-slate-600">لا توجد كروت مطابقة لبحثك</div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveTab("all");
                      }}
                      className="mt-2 rounded-lg bg-[#0067c0] px-4 py-1.5 text-[12px] font-black text-white"
                    >
                      عرض كل الشاشات
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`w11-grid ${
                    displayedCards.length <= 8 ? "w11-grid--spacious" : "w11-grid--all"
                  }`}
                >
                  {displayedCards.map((it) => (
                    <button
                      key={`${it.sectionTitle}-${it.label}`}
                      type="button"
                      onClick={() => runCard(it)}
                      title={`${it.label} — ${it.sectionTitle}`}
                      className={`w11-tile ${isAcrylic ? "w11-tile--acrylic" : "w11-tile--colored"}`}
                      style={
                        isAcrylic
                          ? {
                              background: `linear-gradient(180deg, #ffffff 0%, ${it.tintBg} 100%)`,
                              borderColor: it.tintBorder,
                              boxShadow: `0 4px 14px -4px ${it.shadow}`,
                            }
                          : {
                              background: `linear-gradient(135deg, ${it.gradFrom} 0%, ${it.gradTo} 100%)`,
                              boxShadow: `0 8px 20px -6px ${it.shadow}, inset 0 1px 0 rgba(255,255,255,0.32)`,
                            }
                      }
                    >
                      <span
                        className="w11-tile__icon"
                        style={
                          isAcrylic
                            ? {
                                background: `linear-gradient(135deg, ${it.gradFrom} 0%, ${it.gradTo} 100%)`,
                                boxShadow: `0 6px 14px -3px ${it.shadow}`,
                              }
                            : undefined
                        }
                      >
                        <it.Icon className="h-full w-full" />
                      </span>
                      <span className="w11-tile__label">{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ================= شريط الحالة السفلي العائم (Windows 11 Taskbar Pill) ================= */}
        <footer className="w11-taskbar">
          <div className="w11-taskbar__clock">
            <b className="num">{dateStr}</b>
            <span className="opacity-40">|</span>
            <b className="num">{timeStr}</b>
          </div>

          <div className="w11-taskbar__state">
            <span className="hs-footer__badge">✓</span>
            <span>النظام يعمل بشكل طبيعي</span>
          </div>

          <div className="w11-taskbar__stats">
            <span className="w11-stat-pill w11-stat-pill--blue">
              مبيعات اليوم: <b className="num">{fmt(stats?.salesTotal ?? 0)}</b> ج.م ({stats?.salesCount ?? 0})
            </span>
            <span className="w11-stat-pill">
              الأصناف: <b className="num">{stats?.products ?? 0}</b>
            </span>
            <span className="w11-stat-pill">
              العملاء: <b className="num">{stats?.customers ?? 0}</b>
            </span>
            <span className="w11-stat-pill w11-stat-pill--danger">
              النواقص: <b className="num">{stats?.lowStock ?? 0}</b>
            </span>
            <span className="hidden xl:inline text-[10.5px] font-bold text-slate-600">
              الإصدار <b className="num">{APP_VERSION}</b>
            </span>
            {lic && lic.plan && (
              <span className="hidden lg:inline text-[10.5px] font-bold text-slate-600">
                | {lic.planLabel}:{" "}
                <b className="num">{lic.plan === "lifetime" ? "مدى الحياة" : `${lic.planDaysLeft ?? 0} يوم`}</b>
              </span>
            )}
            <span className="hidden md:inline text-[10.5px] font-bold text-slate-600">
              | الدعم: <b>{SUPPORT_PERSON}</b> — <b className="num">{SUPPORT_PHONE}</b>
            </span>
          </div>
        </footer>
      </div>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </Window>
  );
}
