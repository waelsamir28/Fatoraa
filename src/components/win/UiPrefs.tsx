"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Settings } from "@/lib/types";

export interface UiPrefs {
  theme: string;
  fontFamily: string;
  fontScale: number;
  buttonStyle: string;
  tableHeaderColor: string;
}

export const DEFAULT_PREFS: UiPrefs = {
  theme: "classic-blue",
  fontFamily: "cairo",
  fontScale: 100,
  buttonStyle: "glossy-3d",
  tableHeaderColor: "navy-dark",
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
    label: "أزرق ويندوز كلاسيك",
    hint: "المظهر الافتراضي الأصلي",
    swatch: ["#2b74de", "#0b3fa8", "#0d3b82"],
    homeBg: "linear-gradient(135deg,#0b3370,#0b4fc0 45%,#1b6fe0 62%,#072555)",
  },
  {
    key: "modern-dark",
    label: "كحلي داكن عصري",
    hint: "مريح للعين في الإضاءة المنخفضة",
    swatch: ["#334155", "#0f172a", "#020617"],
    homeBg: "linear-gradient(135deg,#020617,#0f172a 45%,#1e293b 65%,#020617)",
  },
  {
    key: "emerald-green",
    label: "زمردي مالي",
    hint: "أخضر هادئ للأنشطة التجارية",
    swatch: ["#10b981", "#047857", "#022c22"],
    homeBg: "linear-gradient(135deg,#03251c,#065f46 45%,#0f9f6e 65%,#021712)",
  },
  {
    key: "royal-purple",
    label: "بنفسجي ملكي",
    hint: "فخم لمحلات الهدايا والأفراح",
    swatch: ["#8b5cf6", "#5b21b6", "#1e1b4b"],
    homeBg: "linear-gradient(135deg,#1b1240,#4c1d95 45%,#7c3aed 65%,#150e33)",
  },
  {
    key: "dark-gold",
    label: "أسود وذهبي",
    hint: "تباين عالٍ وأرقام واضحة",
    swatch: ["#f59e0b", "#b45309", "#111827"],
    homeBg: "linear-gradient(135deg,#0b0f19,#1f2937 45%,#78350f 70%,#0b0f19)",
  },
  {
    key: "crimson-red",
    label: "قرمزي جريء",
    hint: "هوية حمراء قوية",
    swatch: ["#ef4444", "#b91c1c", "#1c0a0a"],
    homeBg: "linear-gradient(135deg,#1b0606,#7f1d1d 45%,#dc2626 68%,#140404)",
  },
];

export const FONT_OPTIONS: Array<{ key: string; label: string; stack: string }> = [
  { key: "cairo", label: "Cairo — كايرو (الافتراضي)", stack: '"Cairo","Segoe UI",Tahoma,Arial,sans-serif' },
  { key: "tajawal", label: "Tajawal — تجوال", stack: '"Tajawal","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "almarai", label: "Almarai — المراعي", stack: '"Almarai","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "cairo-play", label: "Cairo Play — عريض للعناوين", stack: '"Cairo Play","Cairo","Segoe UI",Tahoma,sans-serif' },
  { key: "tahoma", label: "Tahoma — تاهوما (ويندوز)", stack: "Tahoma,Geneva,Verdana,Arial,sans-serif" },
  { key: "segoe", label: "Segoe UI — سيجو ويندوز", stack: '"Segoe UI",Tahoma,Arial,sans-serif' },
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

export function applyUiPrefs(p: UiPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", p.theme || "classic-blue");
  root.setAttribute("data-buttons", p.buttonStyle || "glossy-3d");
  root.setAttribute("data-table", p.tableHeaderColor || "navy-dark");
  root.setAttribute("data-font", p.fontFamily || "cairo");
  root.setAttribute("data-scale", String(Math.round(p.fontScale || 100)));
  const font = FONT_OPTIONS.find((f) => f.key === p.fontFamily) ?? FONT_OPTIONS[0];
  root.style.setProperty("--ui-font", font.stack);
  root.style.setProperty("--ui-scale", String((p.fontScale || 100) / 100));
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

const fromSettings = (s: Partial<Settings>): UiPrefs => ({
  theme: s.theme || DEFAULT_PREFS.theme,
  fontFamily: s.fontFamily || DEFAULT_PREFS.fontFamily,
  fontScale: typeof s.fontScale === "number" && s.fontScale > 0 ? s.fontScale : DEFAULT_PREFS.fontScale,
  buttonStyle: s.buttonStyle || DEFAULT_PREFS.buttonStyle,
  tableHeaderColor: s.tableHeaderColor || DEFAULT_PREFS.tableHeaderColor,
});

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState<UiPrefs>(DEFAULT_PREFS);

  // تحميل سريع من المتصفح ثم مزامنة مع قاعدة البيانات
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<UiPrefs>) };
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
      await api<Settings>("/api/settings", { method: "PUT", json: next });
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
