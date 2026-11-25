"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Settings } from "@/lib/types";

/** تخصيص الأزرار الفرعية بالكامل (حفظ، طباعة، حذف، إضافة، تعليق، الأزرار العامة...) — يُحفظ داخل Settings.buttonOptions كـ JSON */
export interface ButtonOptions {
  /** وضع التلوين: حسب دور كل زر (موصى به) أو لون موحد لكل الأزرار */
  colorMode: "per-role" | "unified";
  /** لون الزر العام / الموحد */
  color: string;
  hoverColor: string;
  activeColor: string;
  textColor: string;
  /** زر الحفظ والتأكيد (حفظ الفاتورة / تطبيق وحفظ / واتساب...) */
  saveBg: string;
  saveHover: string;
  saveText: string;
  /** زر الطباعة والإضافة والعرض (طباعة الفاتورة / فاتورة جديدة / إضافة...) */
  printBg: string;
  printHover: string;
  printText: string;
  /** زر الحذف والإلغاء */
  dangerBg: string;
  dangerHover: string;
  dangerText: string;
  /** زر التعليق والتنبيهات الفرعية */
  warnBg: string;
  warnHover: string;
  warnText: string;
  /** زر ثانوي / فرعي (تراجع / تصدير / تحديث / مسح...) */
  secondaryBg: string;
  secondaryHover: string;
  secondaryText: string;
  /** حدود وشكل */
  radius: number;
  borderWidth: number;
  borderColor: string;
  shape: string; // rounded | pill | square | soft | sharp | custom
  /** حركة الزر عند المرور والضغط */
  animation: string; // none | lift | grow | press | shine | pulse | bounce | glow
  /** ظل ووزن الخط */
  shadow: boolean;
  bold: boolean;
}

export const DEFAULT_BUTTONS: ButtonOptions = {
  colorMode: "per-role",
  color: "#0067c0",
  hoverColor: "#1975c5",
  activeColor: "#005a9e",
  textColor: "#ffffff",
  saveBg: "#0f7b0f",
  saveHover: "#15803d",
  saveText: "#ffffff",
  printBg: "#0067c0",
  printHover: "#1d4ed8",
  printText: "#ffffff",
  dangerBg: "#c42b1c",
  dangerHover: "#dc2626",
  dangerText: "#ffffff",
  warnBg: "#b45309",
  warnHover: "#d97706",
  warnText: "#ffffff",
  secondaryBg: "#ffffff",
  secondaryHover: "#eff6ff",
  secondaryText: "#12263f",
  radius: 8,
  borderWidth: 1,
  borderColor: "#cbdcf0",
  shape: "rounded",
  animation: "lift",
  shadow: true,
  bold: true,
};

export const BUTTON_MOTIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: "lift", label: "رفع ناعم للأعلى (Lift)", hint: "يرتفع الزر برشاقة مع ظل خفيف عند مرور الماوس" },
  { key: "grow", label: "تكبير انسيابي (Grow)", hint: "يكبر الزر قليلاً لإبراز التركيز" },
  { key: "bounce", label: "ارتداد مرن (Spring Bounce)", hint: "حركة حيوية نابضة بستايل عصري" },
  { key: "shine", label: "لمعة ضوئية عابرة (Shine)", hint: "شعاع ضوئي لامع يعبر فوق الزر" },
  { key: "glow", label: "توهج مضيء (Fluent Glow)", hint: "هالة إضاءة ناعمة حول إطار الزر" },
  { key: "pulse", label: "نبض متكرر هادئ (Pulse)", hint: "نبضة خفيفة مستمرة أثناء الوقوف على الزر" },
  { key: "press", label: "ضغطة كاشير لمسية (Tactile)", hint: "إحساس ضغط الأزرار الميكانيكية السريعة" },
  { key: "none", label: "بدون حركة (ثابت)", hint: "تغيير اللون فقط بدون تحريك" },
];

export const BUTTON_PRESETS: Array<{
  key: string;
  label: string;
  patch: Partial<ButtonOptions>;
}> = [
  {
    key: "fluent-default",
    label: "ويندوز 11 القياسي (الافتراضي)",
    patch: {
      colorMode: "per-role",
      saveBg: "#0f7b0f",
      saveHover: "#15803d",
      saveText: "#ffffff",
      printBg: "#0067c0",
      printHover: "#1d4ed8",
      printText: "#ffffff",
      dangerBg: "#c42b1c",
      dangerHover: "#dc2626",
      dangerText: "#ffffff",
      warnBg: "#b45309",
      warnHover: "#d97706",
      warnText: "#ffffff",
      secondaryBg: "#ffffff",
      secondaryHover: "#eff6ff",
      secondaryText: "#12263f",
      shape: "rounded",
      radius: 8,
      animation: "lift",
    },
  },
  {
    key: "vivid-modern",
    label: "ألوان حيوية مشرقة",
    patch: {
      colorMode: "per-role",
      saveBg: "#10b981",
      saveHover: "#059669",
      saveText: "#ffffff",
      printBg: "#2563eb",
      printHover: "#1d4ed8",
      printText: "#ffffff",
      dangerBg: "#ef4444",
      dangerHover: "#dc2626",
      dangerText: "#ffffff",
      warnBg: "#f59e0b",
      warnHover: "#d97706",
      warnText: "#ffffff",
      secondaryBg: "#f8fafc",
      secondaryHover: "#e0f2fe",
      secondaryText: "#0f172a",
      shape: "soft",
      radius: 12,
      animation: "shine",
    },
  },
  {
    key: "royal-dark",
    label: "كحلي وذهبي فخم",
    patch: {
      colorMode: "per-role",
      saveBg: "#0d9488",
      saveHover: "#0f766e",
      saveText: "#ffffff",
      printBg: "#1e3a8a",
      printHover: "#1d4ed8",
      printText: "#fde047",
      dangerBg: "#991b1b",
      dangerHover: "#b91c1c",
      dangerText: "#ffffff",
      warnBg: "#92400e",
      warnHover: "#b45309",
      warnText: "#fef08a",
      secondaryBg: "#0f2942",
      secondaryHover: "#1e3a8a",
      secondaryText: "#ffffff",
      shape: "rounded",
      radius: 10,
      animation: "glow",
    },
  },
  {
    key: "soft-pastel",
    label: "باستيل هادئ مريح للعين",
    patch: {
      colorMode: "per-role",
      saveBg: "#dcfce7",
      saveHover: "#bbf7d0",
      saveText: "#14532d",
      printBg: "#dbeafe",
      printHover: "#bfdbfe",
      printText: "#1e3a8a",
      dangerBg: "#fee2e2",
      dangerHover: "#fecaca",
      dangerText: "#7f1d1d",
      warnBg: "#fef3c7",
      warnHover: "#fde68a",
      warnText: "#78350f",
      secondaryBg: "#f1f5f9",
      secondaryHover: "#e2e8f0",
      secondaryText: "#0f172a",
      shape: "pill",
      radius: 999,
      animation: "bounce",
    },
  },
  {
    key: "unified-ocean",
    label: "لون موحّد لكل الأزرار (أزرق ملكي)",
    patch: {
      colorMode: "unified",
      color: "#1d4ed8",
      hoverColor: "#2563eb",
      activeColor: "#1e40af",
      textColor: "#ffffff",
      shape: "rounded",
      radius: 9,
      animation: "lift",
    },
  },
];

/** تخصيص القائمة الجانبية العائمة والصفحة الرئيسية (ستايل Windows 11) */
export type SidebarMotion = "win11-pop" | "slide-right" | "fade-blur" | "spring" | "none";
export type HomeCardStyle = "colored" | "acrylic";

export interface SidebarOptions {
  /** حركة ظهور القائمة */
  animation: SidebarMotion;
  /** لون خلفية القائمة */
  bgColor: string;
  /** درجة شفافية الخلفية (70..100) */
  bgOpacity: number;
  /** لون الكلام والأيقونات داخل القائمة */
  textColor: string;
  /** لون أزرار القائمة */
  btnColor: string;
  /** لون الزر عند المرور بالماوس */
  btnHoverColor: string;
  /** لون الزر النشط (الشاشة الحالية) */
  btnActiveColor: string;
  /** لون كلام الأزرار */
  btnTextColor: string;
  /** ستايل كروت الشاشة الرئيسية: ملونة بالكامل أو زجاجية بأيقونات ملونة */
  homeCardStyle: HomeCardStyle;
  /** إظهار البانر الاختياري في أعلى الشاشة الرئيسية */
  showHomeBanner: boolean;
}

export const DEFAULT_SIDEBAR: SidebarOptions = {
  animation: "win11-pop",
  bgColor: "#0f2744",
  bgOpacity: 94,
  textColor: "#f8fafc",
  btnColor: "#1b3b64",
  btnHoverColor: "#2563eb",
  btnActiveColor: "#0ea5e9",
  btnTextColor: "#ffffff",
  homeCardStyle: "colored",
  showHomeBanner: false,
};

export const SIDEBAR_MOTIONS: Array<{ key: SidebarMotion; label: string; hint: string }> = [
  { key: "win11-pop", label: "ويندوز 11 زجاجي (Scale & Pop)", hint: "ظهور ناعم مع تكبير خفيف مثل قائمة Start" },
  { key: "slide-right", label: "انزلاق ناعم من اليمين", hint: "سحب انسيابي من يمين الشاشة" },
  { key: "spring", label: "حركة مرنة نابضة (Spring)", hint: "ارتداد عصري حيوي وسريع" },
  { key: "fade-blur", label: "تلاشي هادئ (Fade)", hint: "ظهور تدريجي ناعم ومريح للعين" },
  { key: "none", label: "فوري بدون حركة", hint: "فتح لحظي فوري" },
];

export const SIDEBAR_PRESETS: Array<{
  key: string;
  label: string;
  opts: Pick<SidebarOptions, "bgColor" | "textColor" | "btnColor" | "btnHoverColor" | "btnActiveColor" | "btnTextColor">;
}> = [
  {
    key: "win11-navy",
    label: "كحلي ويندوز 11 (الافتراضي)",
    opts: {
      bgColor: "#0f2744",
      textColor: "#f8fafc",
      btnColor: "#1b3b64",
      btnHoverColor: "#2563eb",
      btnActiveColor: "#0ea5e9",
      btnTextColor: "#ffffff",
    },
  },
  {
    key: "win11-mica-light",
    label: "زجاجي فاتح (Mica Light)",
    opts: {
      bgColor: "#f0f6ff",
      textColor: "#0f2942",
      btnColor: "#ffffff",
      btnHoverColor: "#dbeafe",
      btnActiveColor: "#0067c0",
      btnTextColor: "#0f2942",
    },
  },
  {
    key: "royal-ocean",
    label: "أزرق ملكي فخم",
    opts: {
      bgColor: "#0b3b8c",
      textColor: "#ffffff",
      btnColor: "#164fa8",
      btnHoverColor: "#3b82f6",
      btnActiveColor: "#14b8a6",
      btnTextColor: "#ffffff",
    },
  },
  {
    key: "emerald-dark",
    label: "بترولي زمردي",
    opts: {
      bgColor: "#0d2f36",
      textColor: "#ecfdf5",
      btnColor: "#15464f",
      btnHoverColor: "#0d9488",
      btnActiveColor: "#10b981",
      btnTextColor: "#ffffff",
    },
  },
  {
    key: "slate-fluent",
    label: "رمادي فحمي أنيق",
    opts: {
      bgColor: "#1e293b",
      textColor: "#f1f5f9",
      btnColor: "#334155",
      btnHoverColor: "#4f46e5",
      btnActiveColor: "#6366f1",
      btnTextColor: "#ffffff",
    },
  },
];

export function parseSidebarOptions(raw: unknown): SidebarOptions {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_SIDEBAR;
  try {
    const parsed = JSON.parse(raw) as Partial<SidebarOptions>;
    return { ...DEFAULT_SIDEBAR, ...parsed };
  } catch {
    return DEFAULT_SIDEBAR;
  }
}

export interface UiPrefs {
  theme: string;
  /** light | dark */
  mode: string;
  fontFamily: string;
  fontWeight: string; // normal | bold | black
  fontScale: number;
  buttonStyle: string;
  buttonOptions: ButtonOptions;
  sidebarOptions: SidebarOptions;
  tableHeaderColor: string;
  tableHeaderFollowTheme: boolean;
  rowSelectColor: string;
}

export const DEFAULT_PREFS: UiPrefs = {
  theme: "classic-blue",
  mode: "light",
  fontFamily: "cairo",
  fontWeight: "normal",
  fontScale: 100,
  buttonStyle: "glossy-3d",
  buttonOptions: DEFAULT_BUTTONS,
  sidebarOptions: DEFAULT_SIDEBAR,
  tableHeaderColor: "navy-dark",
  tableHeaderFollowTheme: true,
  rowSelectColor: "#dbeafe",
};

export interface ThemeDef {
  key: string;
  label: string;
  hint: string;
  swatch: string[]; // معاينة الألوان
  homeBg: string;
}

export const THEMES: ThemeDef[] = [
  {
    key: "classic-blue",
    label: "أزرق كلاسيك (الافتراضي)",
    hint: "الأزرق الكلاسيكي — أزرق غامق مع لمسات ذهبية",
    swatch: ["#2b74de", "#0b3fa8", "#0d3b82"],
    homeBg: "linear-gradient(135deg,#0b3370,#0b4fc0 45%,#1b6fe0 62%,#072555)",
  },
  {
    key: "sky-blue",
    label: "أزرق فاتح",
    hint: "أزرق سماوي هادئ ومريح للعين",
    swatch: ["#4db8ff", "#1877c9", "#0d4e8f"],
    homeBg: "linear-gradient(135deg,#0a4a7a,#0e6bb8 45%,#2a9de0 62%,#073352)",
  },
  {
    key: "steel-blue",
    label: "أزرق بترولي",
    hint: "أزرق معدني غامق — أنيق وعملي",
    swatch: ["#5b8fd6", "#2c5c93", "#153a5f"],
    homeBg: "linear-gradient(135deg,#0b2540,#1a4468 45%,#2f6ba3 62%,#071a2c)",
  },
  // 3 ثيمات ستايل Windows 8 (وضع نهاري)
  {
    key: "win8-gray",
    label: "ويندوز 8 — رصاصي",
    hint: "ستايل Windows 8 مسطح بلون رصاصي نهاري أنيق",
    swatch: ["#94a3b8", "#64748b", "#475569"],
    homeBg: "linear-gradient(135deg,#cbd5e1,#94a3b8 55%,#64748b)",
  },
  {
    key: "win8-aqua",
    label: "ويندوز 8 — مائي",
    hint: "ستايل Windows 8 مسطح بلون مائي مشرق",
    swatch: ["#38bdf8", "#0284c7", "#0369a1"],
    homeBg: "linear-gradient(135deg,#e0f2fe,#38bdf8 55%,#0284c7)",
  },
  {
    key: "win8-charcoal",
    label: "ويندوز 8 — فحمي",
    hint: "ستايل Windows 8 مسطح بلون فحمي متوازن",
    swatch: ["#6b7280", "#374151", "#1f2937"],
    homeBg: "linear-gradient(135deg,#e5e7eb,#6b7280 55%,#374151)",
  },
  // 3 ثيمات Flat Gradient (وضع نهاري)
  {
    key: "grad-teal-green",
    label: "جريديانت — تركواز × أخضر",
    hint: "تدرج مسطح نهاري من التركواز إلى الأخضر",
    swatch: ["#14b8a6", "#10b981", "#059669"],
    homeBg: "linear-gradient(135deg,#99f6e4,#14b8a6 50%,#10b981)",
  },
  {
    key: "grad-charcoal-silver",
    label: "جريديانت — فحمي × رصاصي فاتح",
    hint: "تدرج مسطح نهاري من الرصاصي الفاتح إلى الفحمي",
    swatch: ["#e2e8f0", "#64748b", "#334155"],
    homeBg: "linear-gradient(135deg,#f1f5f9,#94a3b8 55%,#334155)",
  },
  {
    key: "grad-amber-coral",
    label: "جريديانت — كهرماني × برتقالي",
    hint: "تدرج مسطح نهاري دافئ من الكهرماني للبرتقالي الهادئ",
    swatch: ["#fbbf24", "#f97316", "#ea580c"],
    homeBg: "linear-gradient(135deg,#fef3c7,#fbbf24 50%,#f97316)",
  },
];

export const FONT_OPTIONS: Array<{ key: string; label: string; stack: string }> = [
  { key: "cairo", label: "Cairo — كايرو (الافتراضي)", stack: '"Cairo","Segoe UI",Tahoma,Arial,sans-serif' },
  { key: "tajawal", label: "Tajawal — تجوال", stack: '"Tajawal","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "almarai", label: "Almarai — المراعي", stack: '"Almarai","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "cairo-play", label: "Cairo Play — عريض للعناوين", stack: '"Cairo Play","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "tahoma", label: "Tahoma — تاهوما (ويندوز)", stack: "Tahoma,Geneva,Verdana,Arial,sans-serif" },
  { key: "segoe", label: "Segoe UI — سيجو ويندوز", stack: '"Segoe UI",Tahoma,Arial,sans-serif' },
  { key: "noto-kufi", label: "Noto Kufi Arabic — نوتو كوفي", stack: '"Noto Kufi Arabic","Cairo",Tahoma,sans-serif' },
  { key: "ibm-plex", label: "IBM Plex Sans Arabic — آي بي إم", stack: '"IBM Plex Sans Arabic","Cairo",Tahoma,sans-serif' },
  { key: "rubik", label: "Rubik — روبيك", stack: '"Rubik","Cairo",Tahoma,sans-serif' },
  { key: "amiri", label: "Amiri — أميري (نسخي)", stack: '"Amiri","Cairo",serif' },
  { key: "system", label: "خط النظام الافتراضي", stack: 'system-ui,"Segoe UI",Tahoma,sans-serif' },
];

export const BUTTON_STYLES: Array<{ key: string; label: string; hint: string }> = [
  { key: "glossy-3d", label: "بارزة 3D", hint: "أزرار ويندوز لامعة" },
  { key: "modern-flat", label: "مسطحة عصرية", hint: "بدون لمعة" },
  { key: "soft-rounded", label: "دائرية ناعمة", hint: "حواف كبيرة" },
  { key: "pos-tactile", label: "لمس الكاشير", hint: "أزرار كبيرة بارزة" },
];

export const TABLE_HEADERS: Array<{ key: string; label: string; from: string; to: string }> = [
  { key: "navy-dark", label: "كحلي غامق", from: "#2459b8", to: "#0e347e" },
  { key: "slate-deep", label: "رمادي داكن", from: "#64748b", to: "#1e293b" },
  { key: "royal-blue", label: "أزرق ملكي", from: "#3b82f6", to: "#1d4ed8" },
  { key: "charcoal", label: "أسود فحمي", from: "#4b5563", to: "#111827" },
  { key: "forest", label: "أخضر بترولي", from: "#10b981", to: "#065f46" },
];

const STORAGE_KEY = "aljamal.ui.prefs";

/** تحويل أي ثيم قديم/محذوف إلى أقرب ثيم أزرق متاح */
export function normalizeTheme(key: string | null | undefined): string {
  const k = (key || "").trim();
  if (THEMES.some((t) => t.key === k)) return k;
  // الثيم الأسود حُذف نهائياً — يرجع للأزرق الافتراضي
  if (k === "modern-dark" || k === "dark" || k === "black") return "classic-blue";
  return "classic-blue";
}

/** أشكال الأزرار المدعومة → نصف قطر الحواف */
const SHAPES: Record<string, number> = {
  rounded: 8,
  pill: 999,
  square: 2,
  soft: 14,
  sharp: 0,
};

export function applyUiPrefs(p: UiPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", normalizeTheme(p.theme));
  root.setAttribute("data-mode", p.mode === "dark" ? "dark" : "light");
  root.setAttribute("data-buttons", p.buttonStyle || "glossy-3d");
  root.setAttribute("data-table", p.tableHeaderColor || "navy-dark");
  root.setAttribute("data-font", p.fontFamily || "cairo");
  root.setAttribute("data-fweight", p.fontWeight || "normal");
  root.setAttribute("data-scale", String(Math.round(p.fontScale || 100)));
  const font = FONT_OPTIONS.find((f) => f.key === p.fontFamily) ?? FONT_OPTIONS[0];
  root.style.setProperty("--ui-font", font.stack);
  root.style.setProperty("--ui-scale", String((p.fontScale || 100) / 100));

  // ===== تخصيص الأزرار الفرعية بالكامل (حفظ، طباعة، حذف، تعليق، ثانوي...) =====
  const b: ButtonOptions = { ...DEFAULT_BUTTONS, ...(p.buttonOptions || {}) };
  const radius = b.shape === "custom" ? b.radius : (SHAPES[b.shape] ?? b.radius ?? 8);
  const s = root.style;
  s.setProperty("--btn-bg", b.color || DEFAULT_BUTTONS.color);
  s.setProperty("--btn-bg-hover", b.hoverColor || b.color || DEFAULT_BUTTONS.hoverColor);
  s.setProperty("--btn-bg-active", b.activeColor || b.color || DEFAULT_BUTTONS.activeColor);
  s.setProperty("--btn-text", b.textColor || DEFAULT_BUTTONS.textColor);

  s.setProperty("--btn-save-bg", b.saveBg || DEFAULT_BUTTONS.saveBg);
  s.setProperty("--btn-save-hover", b.saveHover || b.saveBg || DEFAULT_BUTTONS.saveHover);
  s.setProperty("--btn-save-text", b.saveText || DEFAULT_BUTTONS.saveText);

  s.setProperty("--btn-print-bg", b.printBg || DEFAULT_BUTTONS.printBg);
  s.setProperty("--btn-print-hover", b.printHover || b.printBg || DEFAULT_BUTTONS.printHover);
  s.setProperty("--btn-print-text", b.printText || DEFAULT_BUTTONS.printText);

  s.setProperty("--btn-danger-bg", b.dangerBg || DEFAULT_BUTTONS.dangerBg);
  s.setProperty("--btn-danger-hover", b.dangerHover || b.dangerBg || DEFAULT_BUTTONS.dangerHover);
  s.setProperty("--btn-danger-text", b.dangerText || DEFAULT_BUTTONS.dangerText);

  s.setProperty("--btn-warn-bg", b.warnBg || DEFAULT_BUTTONS.warnBg);
  s.setProperty("--btn-warn-hover", b.warnHover || b.warnBg || DEFAULT_BUTTONS.warnHover);
  s.setProperty("--btn-warn-text", b.warnText || DEFAULT_BUTTONS.warnText);

  s.setProperty("--btn-sec-bg", b.secondaryBg || DEFAULT_BUTTONS.secondaryBg);
  s.setProperty("--btn-sec-hover", b.secondaryHover || b.secondaryBg || DEFAULT_BUTTONS.secondaryHover);
  s.setProperty("--btn-sec-text", b.secondaryText || DEFAULT_BUTTONS.secondaryText);

  s.setProperty("--btn-radius", `${radius}px`);
  s.setProperty("--btn-border-w", `${b.borderWidth ?? 1}px`);
  s.setProperty("--btn-border-color", b.borderColor || "transparent");
  s.setProperty("--btn-shadow", b.shadow ? "0 3px 10px -2px rgba(15, 38, 68, 0.22)" : "none");
  s.setProperty("--btn-font-weight", b.bold ? "900" : "600");
  root.setAttribute("data-anim", b.animation || "lift");
  const isCustom = JSON.stringify(b) !== JSON.stringify(DEFAULT_BUTTONS);
  root.setAttribute("data-btn-custom", isCustom ? "1" : "0");
  root.setAttribute("data-btn-mode", b.colorMode === "unified" ? "unified" : "per-role");
  root.setAttribute("data-table-follow", p.tableHeaderFollowTheme === false ? "manual" : "theme");
  s.setProperty("--row-select", p.rowSelectColor || "#dbeafe");

  // ===== تخصيص القائمة الجانبية العائمة والواجهة الرئيسية =====
  const sb: SidebarOptions = { ...DEFAULT_SIDEBAR, ...(p.sidebarOptions || {}) };
  s.setProperty("--sb-bg", sb.bgColor || DEFAULT_SIDEBAR.bgColor);
  s.setProperty("--sb-opacity", String(Math.min(1, Math.max(0.65, (sb.bgOpacity ?? 94) / 100))));
  s.setProperty("--sb-text", sb.textColor || DEFAULT_SIDEBAR.textColor);
  s.setProperty("--sb-btn-bg", sb.btnColor || DEFAULT_SIDEBAR.btnColor);
  s.setProperty("--sb-btn-hover", sb.btnHoverColor || DEFAULT_SIDEBAR.btnHoverColor);
  s.setProperty("--sb-btn-active", sb.btnActiveColor || DEFAULT_SIDEBAR.btnActiveColor);
  s.setProperty("--sb-btn-text", sb.btnTextColor || sb.textColor || DEFAULT_SIDEBAR.btnTextColor);
  root.setAttribute("data-sb-motion", sb.animation || "win11-pop");
  root.setAttribute("data-home-cards", sb.homeCardStyle || "colored");
}

interface Ctx {
  prefs: UiPrefs;
  /** معاينة فورية بدون حفظ */
  preview: (patch: Partial<UiPrefs>) => void;
  /** حفظ في الإعدادات والخدمة */
  save: (patch: Partial<UiPrefs>) => Promise<void>;
  /** إعادة القيم المحفوظة (إلغاء المعاينة) */
  revert: () => void;
  saved: UiPrefs;
}

const UiCtx = createContext<Ctx | null>(null);

export function useUiPrefs(): Ctx {
  const c = useContext(UiCtx);
  if (!c) {
    return {
      prefs: DEFAULT_PREFS,
      saved: DEFAULT_PREFS,
      preview: () => undefined,
      save: async () => undefined,
      revert: () => undefined,
    };
  }
  return c;
}

function parseButtons(raw: unknown): ButtonOptions {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_BUTTONS;
  try {
    const parsed = JSON.parse(raw) as Partial<ButtonOptions>;
    return { ...DEFAULT_BUTTONS, ...parsed };
  } catch {
    return DEFAULT_BUTTONS;
  }
}

export const fromSettings = (s: Partial<Settings>): UiPrefs => ({
  theme: normalizeTheme(s.theme),
  mode: s.mode === "dark" ? "dark" : "light",
  fontFamily: s.fontFamily || DEFAULT_PREFS.fontFamily,
  fontWeight: s.fontWeight || "normal",
  fontScale: typeof s.fontScale === "number" && s.fontScale > 0 ? s.fontScale : DEFAULT_PREFS.fontScale,
  buttonStyle: s.buttonStyle || DEFAULT_PREFS.buttonStyle,
  buttonOptions: parseButtons(s.buttonOptions),
  sidebarOptions: parseSidebarOptions(s.sidebarOptions),
  tableHeaderColor: s.tableHeaderColor || DEFAULT_PREFS.tableHeaderColor,
  tableHeaderFollowTheme: s.tableHeaderFollowTheme !== false,
  rowSelectColor: s.rowSelectColor || DEFAULT_PREFS.rowSelectColor,
});

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState<UiPrefs>(DEFAULT_PREFS);

  // تحميل سريع من المتصفح ثم مزامنة مع قاعدة البيانات
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<UiPrefs>;
        const parsed = { ...DEFAULT_PREFS, ...stored };
        parsed.buttonOptions = { ...DEFAULT_BUTTONS, ...(stored.buttonOptions || {}) };
        parsed.sidebarOptions = { ...DEFAULT_SIDEBAR, ...(stored.sidebarOptions || {}) };
        parsed.theme = normalizeTheme(parsed.theme);
        setPrefs(parsed);
        setSaved(parsed);
        applyUiPrefs(parsed);
      }
    } catch {
      /* ignore */
    }
    api<Settings>("/api/settings")
      .then((s) => {
        const p = fromSettings(s);
        setPrefs(p);
        setSaved(p);
        applyUiPrefs(p);
      })
      .catch(() => undefined);
  }, []);

  const preview = useCallback((patch: Partial<UiPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyUiPrefs(next);
      return next;
    });
  }, []);

  const save = useCallback(
    async (patch: Partial<UiPrefs>) => {
      const next = { ...prefs, ...patch };
      applyUiPrefs(next);
      setPrefs(next);
      // نقرأ الإعدادات الحالية أولاً حتى لا نمحو بيانات المحل وقوالب الفاتورة
      const current = await api<Settings>("/api/settings").catch(() => null);
      await api<Settings>("/api/settings", {
        method: "PUT",
        json: {
          ...(current ?? {}),
          ...next,
          // الحقول النصية في قاعدة البيانات
          buttonOptions: JSON.stringify(next.buttonOptions || DEFAULT_BUTTONS),
          sidebarOptions: JSON.stringify(next.sidebarOptions || DEFAULT_SIDEBAR),
        },
      });
      setSaved(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [prefs],
  );

  const revert = useCallback(() => {
    applyUiPrefs(saved);
    setPrefs(saved);
  }, [saved]);

  const value = useMemo(() => ({ prefs, saved, preview, save, revert }), [prefs, saved, preview, save, revert]);
  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}
