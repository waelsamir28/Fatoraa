"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  Cloud as IconCloud,
  LayoutDashboard,
  LogOut,
  PanelRightClose,
  ListTree,
  PanelRightOpen,
  Rows3,
  Search,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
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

/** مجموعات القائمة الجانبية — مرتبة حسب الاستخدام اليومي */
export function buildNavGroups(lowStock: number): NavGroup[] {
  return [
    {
      title: "العمليات اليومية",
      tone: "#2fb3a6",
      items: [
        { href: "/", label: "الرئيسية", Icon: IconHome, keywords: "home رئيسية" },
        { href: "/sales", label: "فاتورة مبيعات", Icon: SalesSmall, keywords: "بيع sales" },
        { href: "/purchases", label: "فاتورة مشتريات", Icon: IconBox, keywords: "شراء purchase" },
        { href: "/returns/sales", label: "مرتجع مبيعات", Icon: IconReturn, keywords: "return مرتجع" },
        { href: "/returns/purchases", label: "مرتجع مشتريات", Icon: IconReturnBox, keywords: "return مرتجع" },
        { href: "/sales/list", label: "سجل الفواتير", Icon: IconInvoices, keywords: "سجل invoices" },
      ],
    },
    {
      title: "الأصناف والمخزون",
      tone: "#3b82f6",
      items: [
        { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories, keywords: "صنف منتج category" },
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
      tone: "#0ea5e9",
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
      tone: "#f5c518",
      items: [
        { href: "/reports", label: "التقارير الشاملة", Icon: IconReports, keywords: "تقرير" },
        { href: "/profit", label: "تقرير الأرباح", Icon: TrendingUp as Icon, keywords: "ربح" },
        { href: "/dashboard", label: "لوحة المالك", Icon: LayoutDashboard as Icon, keywords: "لوحة" },
      ],
    },
    {
      title: "الإدارة والإعدادات",
      tone: "#8b5cf6",
      items: [
        { href: "/users", label: "المستخدمون", Icon: Users as Icon, keywords: "مستخدم صلاحيات" },
        { href: "/branches", label: "الفروع", Icon: Building2 as Icon, keywords: "فرع" },
        { href: "/connection", label: "ربط قاعدة البيانات", Icon: IconCloud as Icon, keywords: "سحابة قاعدة" },
        { href: "/backup-schedule", label: "النسخ الاحتياطي", Icon: IconBackup, keywords: "نسخة" },
        { href: "/settings", label: "الإعدادات والمظهر", Icon: IconSettings, keywords: "إعداد ثيم" },
      ],
    },
    {
      title: "المساعدة",
      tone: "#64748b",
      items: [
        { href: "/support", label: "الدعم الفني", Icon: IconSupport, keywords: "دعم مساعدة" },
        { href: "/about", label: "معلومات البرنامج", Icon: IconInfo, keywords: "عن الإصدار" },
      ],
    },
  ];
}

export function HomeSidebar({
  activeUser,
  lowStock,
  onExit,
}: {
  activeUser: string;
  lowStock: number;
  onExit: () => void;
}) {
  const [mini, setMini] = useState(false);
  /** شكل العرض: مجموعات مصنّفة أو قائمة مسطحة مضغوطة */
  const [flat, setFlat] = useState(false);
  const [q, setQ] = useState("");
  const [openGroup, setOpenGroup] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  // استرجاع الحالة المحفوظة (بعد أول رسم لتجنب اختلاف الترطيب)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setMini(localStorage.getItem("fatora.nav.mini") === "1");
        setFlat(localStorage.getItem("fatora.nav.flat") === "1");
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const toggleMini = () =>
    setMini((v) => {
      const next = !v;
      try {
        localStorage.setItem("fatora.nav.mini", next ? "1" : "0");
        localStorage.setItem("aljamal.sidebar", next ? "0" : "1");
      } catch {
        /* ignore */
      }
      return next;
    });

  const toggleFlat = () =>
    setFlat((v) => {
      const next = !v;
      try {
        localStorage.setItem("fatora.nav.flat", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const groups = useMemo(() => buildNavGroups(lowStock), [lowStock]);

  /** تصفية العناصر بالبحث */
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

  const total = filtered.reduce((n, g) => n + g.items.length, 0);

  /** مؤشرات التمرير: هل يوجد محتوى أعلى/أسفل؟ */
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [filtered.length, mini]);

  return (
    <aside
      className={`nav-rail ${mini ? "nav-rail--mini" : ""}`}
      // ارتفاع كامل + تمرير داخلي = القائمة لا تُقص أبداً
      aria-label="قائمة البرنامج"
    >
      {/* ===== ترويسة القائمة ===== */}
      <div className="nav-head">
        {!mini && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-black text-white">قائمة البرنامج</div>
            <div className="text-[10.5px] font-bold text-blue-200">
              {total} شاشة — مرّر لعرض الباقي
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleFlat}
          className="nav-mini-btn"
          title={flat ? "عرض بالمجموعات المصنّفة" : "عرض كقائمة مسطحة مضغوطة"}
        >
          {flat ? <ListTree className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={toggleMini}
          className="nav-mini-btn"
          title={mini ? "توسيع القائمة" : "تصغير القائمة إلى أيقونات"}
        >
          {mini ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>

      {/* ===== بحث ===== */}
      {!mini && (
        <div className="nav-search">
          <Search className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-200" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن شاشة..."
            className="nav-search-input"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white" title="مسح">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ===== منطقة التمرير ===== */}
      <div className="relative min-h-0 flex-1">
        {canUp && <div className="nav-fade nav-fade--top" />}
        {canDown && <div className="nav-fade nav-fade--bottom" />}

        <div ref={scrollRef} className="nav-scroll">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] font-bold text-blue-200">
              لا توجد شاشة بهذا الاسم
            </div>
          )}

          {/* ===== العرض المسطح: قائمة واحدة متصلة ===== */}
          {flat &&
            !mini &&
            filtered.map((g) =>
              g.items.map((it) => (
                <Link
                  key={`flat-${it.href}-${it.label}`}
                  href={it.href}
                  className="nav-btn nav-btn--flat"
                  style={{ borderInlineStartColor: g.tone }}
                  title={it.label}
                >
                  <it.Icon className="nav-btn-icon" />
                  <span className="nav-btn-text">{it.label}</span>
                  {it.badge && (
                    <span className={`nav-badge ${it.badge === "AI" ? "nav-badge--ai" : ""}`}>{it.badge}</span>
                  )}
                </Link>
              )),
            )}

          {/* ===== العرض بالمجموعات ===== */}
          {(!flat || mini) && filtered.map((g) => {
            const collapsed = !q && openGroup[g.title] === false;
            return (
              <div key={g.title} className="nav-group">
                {/* عنوان المجموعة — ثابت أعلى القسم */}
                {q ? (
                  <div className="nav-group-label" style={{ borderInlineStartColor: g.tone }}>
                    <span>{g.title}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="nav-group-label nav-group-label--btn"
                    style={{ borderInlineStartColor: g.tone }}
                    onClick={() => setOpenGroup((o) => ({ ...o, [g.title]: collapsed }))}
                    title={collapsed ? "إظهار" : "إخفاء"}
                  >
                    <span className="truncate">{g.title}</span>
                    {mini ? (
                      <span className="nav-dot" style={{ background: g.tone }} />
                    ) : (
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                      />
                    )}
                  </button>
                )}

                {!collapsed &&
                  g.items.map((it) => (
                    <Link
                      key={it.href + it.label}
                      href={it.href}
                      className="nav-btn"
                      title={mini ? it.label : undefined}
                    >
                      <it.Icon className="nav-btn-icon" />
                      {!mini && <span className="nav-btn-text">{it.label}</span>}
                      {it.badge && (
                        <span
                          className={`nav-badge ${it.badge === "AI" ? "nav-badge--ai" : ""} ${
                            !mini ? "" : "nav-badge--dot"
                          }`}
                        >
                          {mini ? "" : it.badge}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
            );
          })}
          <div className="h-2" />
        </div>
      </div>

      {/* ===== المستخدم + خروج (ثابت أسفل القائمة) ===== */}
      <div className="nav-foot">
        <div className="nav-user" title={activeUser}>
          <span className="nav-avatar">
            <User className="h-3.5 w-3.5" />
          </span>
          {!mini && (
            <span className="min-w-0 flex-1">
              <span className="block text-[9.5px] font-bold text-blue-200">المستخدم الحالي</span>
              <span className="block truncate text-[11.5px] font-black text-white">{activeUser}</span>
            </span>
          )}
        </div>
        <button type="button" onClick={onExit} className="nav-exit" title="خروج من البرنامج">
          <LogOut className="h-4 w-4" />
          {!mini && <span>خروج</span>}
        </button>
      </div>
    </aside>
  );
}

/** زر إظهار/إخفاء القائمة — يظهر عند تصغيرها */
export function SidebarOpenButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="side-open-btn" title="إظهار القائمة الجانبية">
      <ChevronLeft className="h-4 w-4" strokeWidth={3} />
    </button>
  );
}

export { IconExit };
