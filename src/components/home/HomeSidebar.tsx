"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  Building2,
  ChevronDown,
  Cloud as IconCloud,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useDesktop } from "@/components/win/DesktopProvider";
import { DEFAULT_SIDEBAR, useUiPrefs } from "@/components/win/UiPrefs";
import { pageAllowed } from "@/lib/pages";
import { api } from "@/lib/client";
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

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  href: string;
  label: string;
  Icon: Icon;
  badge?: string;
  /** كلمات بحث إضافية */
  keywords?: string;
}

export interface NavGroup {
  title: string;
  /** لون الشريط الجانبي للمجموعة */
  tone: string;
  items: NavItem[];
}

const SalesSmall: Icon = (p) => <IconSales plus={false} {...p} />;

/** مجموعات القائمة العائمة — مرتبة حسب الاستخدام اليومي وشاملة لكل الشاشات */
export function buildNavGroups(lowStock: number): NavGroup[] {
  return [
    {
      title: "العمليات اليومية",
      tone: "#0ea5e9",
      items: [
        { href: "/", label: "الرئيسية", Icon: IconHome, keywords: "home رئيسية start" },
        { href: "/sales", label: "فاتورة مبيعات", Icon: SalesSmall, keywords: "بيع sales كاشير" },
        { href: "/purchases", label: "فاتورة مشتريات", Icon: IconBox, keywords: "شراء purchase" },
        { href: "/returns/sales", label: "مرتجع مبيعات", Icon: IconReturn, keywords: "return مرتجع" },
        { href: "/returns/purchases", label: "مرتجع مشتريات", Icon: IconReturnBox, keywords: "return مرتجع" },
        { href: "/sales/list", label: "سجل الفواتير", Icon: IconInvoices, keywords: "سجل invoices" },
        { href: "/price-checker", label: "كشك الاستعلام عن السعر", Icon: IconBarcode, keywords: "سعر كشك price" },
      ],
    },
    {
      title: "الأصناف والمخزون",
      tone: "#10b981",
      items: [
        { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories, keywords: "صنف منتج category مخازن" },
        { href: "/inventory", label: "المخازن والجرد", Icon: IconWarehouse, keywords: "مخزن جرد stock" },
        { href: "/low-stock", label: "الأصناف الناقصة", Icon: IconWarehouse, badge: lowStock > 0 ? String(lowStock) : "", keywords: "نواقص تنبيه" },
        { href: "/stock-movements", label: "حركات المخزون", Icon: IconWarehouse, keywords: "حركة مخزون" },
        { href: "/barcode", label: "طباعة الباركود", Icon: IconBarcode, keywords: "باركود ملصقات" },
        { href: "/item-card", label: "كارت الصنف", Icon: IconItemCard, keywords: "كارت تفاصيل" },
        { href: "/smart-orders", label: "الشراء الذكي", Icon: IconSmartOrders, badge: "AI", keywords: "طلب شراء ذكي" },
      ],
    },
    {
      title: "العملاء والحسابات",
      tone: "#8b5cf6",
      items: [
        { href: "/customers", label: "العملاء", Icon: IconCustomers, keywords: "عميل customer" },
        { href: "/suppliers", label: "الموردون", Icon: IconSuppliers, keywords: "مورد supplier" },
        { href: "/installments", label: "الأقساط والمستحقات", Icon: IconInstallments, keywords: "قسط" },
        { href: "/treasury", label: "الخزينة واليومية", Icon: IconTreasury, keywords: "خزينة نقدية" },
        { href: "/expenses", label: "المصروفات", Icon: IconExpense, keywords: "مصروف" },
        { href: "/shifts", label: "الورديات والكاشير", Icon: IconShifts, keywords: "وردية شيفت" },
      ],
    },
    {
      title: "التقارير والتحليل",
      tone: "#f59e0b",
      items: [
        { href: "/reports", label: "التقارير الشاملة", Icon: IconReports, keywords: "تقرير مبيعات" },
        { href: "/profit", label: "تقرير الأرباح", Icon: TrendingUp as Icon, keywords: "ربح" },
        { href: "/dashboard", label: "لوحة المالك", Icon: LayoutDashboard as Icon, keywords: "لوحة مؤشرات" },
        { href: "/audit", label: "سجل النشاط والمراجعة", Icon: ShieldCheck as Icon, keywords: "سجل مراجعة نشاط" },
      ],
    },
    {
      title: "الإدارة والإعدادات",
      tone: "#3b82f6",
      items: [
        { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings, keywords: "إعداد ثيم قائمة مظهر" },
        { href: "/users", label: "المستخدمون والصلاحيات", Icon: Users as Icon, keywords: "مستخدم صلاحيات" },
        { href: "/pages", label: "صلاحيات الشاشات", Icon: Users as Icon, keywords: "صلاحيات شاشات" },
        { href: "/branches", label: "الفروع", Icon: Building2 as Icon, keywords: "فرع" },
        { href: "/connection", label: "ربط قاعدة البيانات", Icon: IconCloud as Icon, keywords: "سحابة قاعدة" },
        { href: "/backup", label: "النسخ الاحتياطي", Icon: IconBackup, keywords: "نسخة احتياطية" },
        { href: "/backup-schedule", label: "النسخ التلقائي", Icon: IconBackup, keywords: "جدولة نسخ تلقائي" },
        { href: "/subscription", label: "حالة الاشتراك", Icon: Sparkles as Icon, keywords: "اشتراك تفعيل" },
      ],
    },
    {
      title: "المساعدة والدعم",
      tone: "#64748b",
      items: [
        { href: "/health", label: "صحة البرنامج", Icon: IconSupport, keywords: "فحص صحة تنبيه" },
        { href: "/support", label: "الدعم الفني", Icon: IconSupport, keywords: "دعم مساعدة" },
        { href: "/about", label: "معلومات البرنامج", Icon: IconInfo, keywords: "عن الإصدار" },
      ],
    },
  ];
}

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** تحويل HEX إلى rgba مع درجة الشفافية */
function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || "#0f2744").replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(15, 39, 68, ${alpha})`;
}

/**
 * القائمة الجانبية العائمة الموحّدة (Windows 11 Global Overlay Flyout):
 * - لا تأخذ أي مساحة ثابتة من الشاشة نهائياً.
 * - تفتح من زر الأيقونة الصغير في شريط العنوان أو الشاشة الرئيسية أو باختصار Ctrl+B.
 * - تظهر فوق الصفحة الحالية مع تغبيش زجاجي ناعم وتتبع ألوان وحركة الإعدادات.
 */
export function FloatingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, native, quitApp, activeUser } = useDesktop();
  const { prefs } = useUiPrefs();
  const sb = { ...DEFAULT_SIDEBAR, ...(prefs.sidebarOptions || {}) };

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [lowStock, setLowStock] = useState(0);
  const [openGroup, setOpenGroup] = useState<Record<string, boolean>>({});
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // إغلاق تلقائي عند تغير المسار
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // الاستماع لأحداث الفتح / الإغلاق / التبديل من أي مكان في البرنامج
  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("fatora:toggle-nav", onToggle);
    window.addEventListener("fatora:open-nav", onOpen);
    window.addEventListener("fatora:close-nav", onClose);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("fatora:toggle-nav", onToggle);
      window.removeEventListener("fatora:open-nav", onOpen);
      window.removeEventListener("fatora:close-nav", onClose);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // جلب عداد النواقص عند فتح القائمة
  useEffect(() => {
    if (!open) return;
    api<{ lowStock?: number }>("/api/home")
      .then((r) => setLowStock(Number(r?.lowStock ?? 0)))
      .catch(() => undefined);
  }, [open]);

  const handleExit = useCallback(async () => {
    setOpen(false);
    if (!(await confirm("هل تريد الخروج من برنامج FATORA؟", { title: "خروج" }))) return;
    if (native) quitApp();
    else router.push("/exit");
  }, [confirm, native, quitApp, router]);

  const groups = useMemo(() => {
    return buildNavGroups(lowStock)
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.href === "/" || pageAllowed(user, it.href.split("?")[0])),
      }))
      .filter((g) => g.items.length > 0);
  }, [lowStock, user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) => it.label.toLowerCase().includes(s) || (it.keywords || "").toLowerCase().includes(s),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const totalScreens = filtered.reduce((acc, g) => acc + g.items.length, 0);
  const displayUser = user?.name || activeUser || "FATORA";
  const roleLabel = user?.roleLabel || "مستخدم";

  if (!open) return null;

  const alpha = Math.min(1, Math.max(0.68, (sb.bgOpacity ?? 94) / 100));
  const panelBg = hexToRgba(sb.bgColor, alpha);

  return (
    <div
      className="win11-flyout-backdrop"
      dir="rtl"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="القائمة الرئيسية للبرنامج"
    >
      <aside
        className={`win11-flyout win11-flyout--${sb.animation || "win11-pop"}`}
        style={{
          backgroundColor: panelBg,
          color: sb.textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* الترويسة */}
        <div className="win11-flyout__head" style={{ borderColor: hexToRgba(sb.textColor, 0.14) }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm"
              style={{ background: sb.btnActiveColor, color: "#ffffff" }}
            >
              <LayoutGrid className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-black leading-tight" style={{ color: sb.textColor }}>
                قائمة برنامج FATORA
              </div>
              <div className="truncate text-[11px] font-bold opacity-75" style={{ color: sb.textColor }}>
                {totalScreens} شاشة متاحة — اختر للانتقال السريع
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:scale-105"
            style={{
              background: hexToRgba(sb.textColor, 0.12),
              color: sb.textColor,
            }}
            title="إغلاق القائمة (Esc)"
          >
            <X className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>

        {/* شريط البحث داخل القائمة */}
        <div className="px-3 pt-2.5 pb-1.5">
          <div
            className="relative flex items-center rounded-xl border px-3 py-1.5 transition"
            style={{
              background: hexToRgba(sb.textColor, 0.09),
              borderColor: hexToRgba(sb.textColor, 0.18),
            }}
          >
            <Search className="h-4 w-4 shrink-0 opacity-75" style={{ color: sb.textColor }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن شاشة أو قسم..."
              className="h-6 flex-1 bg-transparent px-2 text-[12.5px] font-bold focus:outline-none"
              style={{ color: sb.textColor }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="rounded p-0.5 opacity-75 hover:opacity-100"
                style={{ color: sb.textColor }}
                title="مسح"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* عناصر القائمة */}
        <div className="win11-flyout__scroll">
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[12.5px] font-bold opacity-75" style={{ color: sb.textColor }}>
              لا توجد شاشة مطابقة لبحثك
            </div>
          )}

          {filtered.map((g) => {
            const collapsed = !q && openGroup[g.title] === false;
            return (
              <div key={g.title} className="mb-2.5">
                <button
                  type="button"
                  onClick={() => setOpenGroup((o) => ({ ...o, [g.title]: collapsed }))}
                  className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11.5px] font-black tracking-wide transition"
                  style={{ color: sb.textColor, opacity: 0.88 }}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: g.tone }} />
                    <span>{g.title}</span>
                  </span>
                  {!q && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? "rotate-90" : ""}`}
                    />
                  )}
                </button>

                {!collapsed && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {g.items.map((it) => {
                      const active = isActive(pathname, it.href);
                      const itemKey = `${g.title}-${it.href}`;
                      const hovered = hoveredKey === itemKey;
                      const bg = active ? sb.btnActiveColor : hovered ? sb.btnHoverColor : sb.btnColor;
                      const txt = sb.btnTextColor || sb.textColor;

                      return (
                        <Link
                          key={itemKey}
                          href={it.href}
                          onClick={() => setOpen(false)}
                          onMouseEnter={() => setHoveredKey(itemKey)}
                          onMouseLeave={() => setHoveredKey((k) => (k === itemKey ? null : k))}
                          className="win11-flyout__btn"
                          style={{
                            backgroundColor: bg,
                            color: txt,
                            borderColor: active ? "rgba(255,255,255,0.45)" : hexToRgba(txt, 0.12),
                          }}
                        >
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                            style={{
                              background: active ? "rgba(255,255,255,0.22)" : hexToRgba(g.tone, 0.22),
                            }}
                          >
                            <it.Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 truncate text-[12.8px] font-extrabold">{it.label}</span>
                          {it.badge && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-black"
                              style={{
                                background: it.badge === "AI" ? "#8b5cf6" : "#ef4444",
                                color: "#ffffff",
                              }}
                            >
                              {it.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* التذييل: المستخدم الحالي + الإعدادات السريعة للقائمة + خروج */}
        <div
          className="win11-flyout__foot"
          style={{
            borderColor: hexToRgba(sb.textColor, 0.14),
            background: hexToRgba("#000000", 0.14),
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
              style={{ background: sb.btnActiveColor, color: "#ffffff" }}
            >
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-black leading-tight" style={{ color: sb.textColor }}>
                {displayUser}
              </div>
              <div className="truncate text-[10.5px] font-bold opacity-75" style={{ color: sb.textColor }}>
                {roleLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/settings?tab=sidebar"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-black transition hover:opacity-90"
              style={{
                background: hexToRgba(sb.textColor, 0.14),
                color: sb.textColor,
              }}
              title="تخصيص شكل وألوان وحركة القائمة"
            >
              <IconSettings className="h-3.5 w-3.5" />
              <span>تخصيص</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleExit()}
              className="flex h-8 items-center gap-1 rounded-lg bg-gradient-to-b from-[#ef4444] to-[#dc2626] px-2.5 text-[11.5px] font-black text-white shadow-sm transition hover:brightness-110"
              title="خروج من البرنامج"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** زر الأيقونة الصغير لفتح القائمة العائمة */
export function SidebarTriggerButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("fatora:toggle-nav"))}
      className={`win11-menu-trigger app-no-drag ${className}`}
      title="فتح قائمة البرنامج (Ctrl+B)"
      aria-label="فتح قائمة البرنامج"
    >
      <LayoutGrid className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}

export { IconExit };
