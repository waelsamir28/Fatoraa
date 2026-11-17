"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Settings } from "@/lib/types";

/** تخصيص الأزرار بالكامل — يُحفظ داخل Settings.buttonOptions كـ JSON */
export interface ButtonOptions {
  /** لون أساسي / مرور / ضغط / نص */
  color: string;
  hoverColor: string;
  activeColor: string;
  textColor: string;
  /** حدود */
  radius: number;
  borderWidth: number;
  borderColor: string;
  /** شكل */
  shape: string; // rounded | pill | square | soft | sharp
  /** حركة عند المرور */
  animation: string; // none | lift | grow | press | shine | pulse
  /** ظل */
  shadow: boolean;
  /** وزن الخط */
  bold: boolean;
}

export const DEFAULT_BUTTONS: ButtonOptions = {
  color: "#1a5fc0",
  hoverColor: "#2f7fe0",
  activeColor: "#0e4390",
  textColor: "#ffffff",
  radius: 8,
  borderWidth: 1,
  borderColor: "#0e4390",
  shape: "rounded",
  animation: "lift",
  shadow: true,
  bold: true,
};

export interface UiPrefs {
  theme: string;
  /** light | dark */
  mode: string;
  fontFamily: string;
  fontWeight: string; // normal | bold | black
  fontScale: number;
  buttonStyle: string;
  buttonOptions: ButtonOptions;
  tableHeaderColor: string;
  tableHeaderFollowTheme: boolean;
  rowSelectColor: string;
}

export const DEFAULT_PREFS: UiPrefs = {
  theme: "classic-blue",
  mode: "light",
  fontFamily: "rubik",
  fontWeight: "normal",
  fontScale: 100,
  buttonStyle: "glossy-3d",
  buttonOptions: DEFAULT_BUTTONS,
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
  {
    key: "sage-green",
    label: "أخضر مريمي",
    hint: "أخضر هادئ مريح للعين — مناسب للاستخدام الطويل",
    swatch: ["#8fb99a", "#4f8a63", "#2f5d44"],
    homeBg: "linear-gradient(135deg,#22452f,#2f5d44 45%,#4f8a63 62%,#152c1e)",
  },
  {
    key: "warm-sand",
    label: "بيج رملي",
    hint: "بيج دافئ وأنيق — ألوان محايدة مريحة",
    swatch: ["#e0c9a6", "#b5946a", "#7d6344"],
    homeBg: "linear-gradient(135deg,#5f4b32,#7d6344 45%,#b5946a 62%,#3f3122)",
  },
  {
    key: "muted-purple",
    label: "بنفسجي هادئ",
    hint: "بنفسجي خفيف عصري بدون صخب",
    swatch: ["#a99bc9", "#7a68a6", "#544778"],
    homeBg: "linear-gradient(135deg,#413659,#544778 45%,#7a68a6 62%,#2b2339)",
  },
  {
    key: "soft-teal",
    label: "تركواز ناعم",
    hint: "تركواز بارد هادئ — يشبه ألوان الأنظمة الطبية",
    swatch: ["#7fc0bd", "#4a9a96", "#2f6b68"],
    homeBg: "linear-gradient(135deg,#245250,#2f6b68 45%,#4a9a96 62%,#173736)",
  },
  {
    key: "slate-gray",
    label: "رمادي حجري",
    hint: "رمادي محايد احترافي — يخلي الألوان الأخرى تبرز",
    swatch: ["#a8b2bd", "#6b7885", "#454f5a"],
    homeBg: "linear-gradient(135deg,#343c45,#454f5a 45%,#6b7885 62%,#20262c)",
  },
  {
    key: "dusty-rose",
    label: "وردي ترابي",
    hint: "وردي باهت هادئ — لمسة أنيقة بدون مبالغة",
    swatch: ["#d8a8b0", "#a86e7a", "#7a4b56"],
    homeBg: "linear-gradient(135deg,#5e3942,#7a4b56 45%,#a86e7a 62%,#3f262c)",
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

  // ===== تخصيص الأزرار =====
  const b: ButtonOptions = { ...DEFAULT_BUTTONS, ...(p.buttonOptions || {}) };
  const radius = b.shape === "custom" ? b.radius : (SHAPES[b.shape] ?? b.radius ?? 8);
  const s = root.style;
  s.setProperty("--btn-bg", b.color || DEFAULT_BUTTONS.color);
  s.setProperty("--btn-bg-hover", b.hoverColor || b.color || DEFAULT_BUTTONS.hoverColor);
  s.setProperty("--btn-bg-active", b.activeColor || b.color || DEFAULT_BUTTONS.activeColor);
  s.setProperty("--btn-text", b.textColor || DEFAULT_BUTTONS.textColor);
  s.setProperty("--btn-radius", `${radius}px`);
  s.setProperty("--btn-border-w", `${b.borderWidth ?? 1}px`);
  s.setProperty("--btn-border-color", b.borderColor || "transparent");
  s.setProperty("--btn-shadow", b.shadow ? "0 2px 6px rgba(0,0,0,.18)" : "none");
  s.setProperty("--btn-font-weight", b.bold ? "900" : "600");
  root.setAttribute("data-anim", b.animation || "none");
  // تفعيل التخصيص فقط لو المستخدم غيّر شيئًا عن الافتراضي
  root.setAttribute("data-btn-custom", JSON.stringify(b) === JSON.stringify(DEFAULT_BUTTONS) ? "0" : "1");
  root.setAttribute("data-table-follow", p.tableHeaderFollowTheme === false ? "manual" : "theme");
  s.setProperty("--row-select", p.rowSelectColor || "#dbeafe");
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
