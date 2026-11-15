"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  DatabaseBackup,
  Download,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { ThanksMessageEditor } from "@/components/settings/ThanksMessageEditor";
import { Field, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { CartLogo, IconBackup, IconSettings } from "@/components/icons/AppIcons";
import { TemplateEditor } from "@/components/print/TemplateEditor";
import { TEMPLATE_PRESETS } from "@/lib/invoiceLayout";
import { api, errMsg } from "@/lib/client";
import { fmtDate, fmtTime } from "@/lib/format";
import { DEFAULT_LOGO } from "@/lib/constants";
import type { Settings } from "@/lib/types";
import {
  BUTTON_STYLES,
  FONT_OPTIONS,
  TABLE_HEADERS,
  THEMES,
  applyUiPrefs,
  useUiPrefs,
  type UiPrefs,
} from "@/components/win/UiPrefs";

type SForm = Record<Exclude<keyof Settings, "id" | "showBigTitle">, string> & {
  showBigTitle: boolean;
};

const toForm = (s: Settings): SForm => ({
  storeName: s.storeName,
  userName: s.userName,
  phone: s.phone,
  address: s.address,
  taxRate: String(s.taxRate),
  currency: s.currency,
  branchName: s.branchName,
  salesRep: s.salesRep,
  invoiceFooter: s.invoiceFooter,
  theme: s.theme || "classic-blue",
  buttonStyle: s.buttonStyle || "glossy-3d",
  fontFamily: s.fontFamily || "cairo",
  tableHeaderColor: s.tableHeaderColor || "navy-dark",
  customBgUrl: s.customBgUrl || "",
  customLogoUrl: s.customLogoUrl || "",
  phone2: s.phone2 || "",
  showBigTitle: s.showBigTitle ?? true,
  customBigTitle: s.customBigTitle || "FATORA",
  customTagline: s.customTagline || "إدارة احترافية .. لمحل تجاري أكثر نجاحاً",
  invoiceTemplate: s.invoiceTemplate || "template-modern-a5",
  fontScale: String(s.fontScale ?? 100),
  invoiceLayout: s.invoiceLayout || "",
});

export function SettingsForm() {
  const { toast } = useDesktop();
  const { prefs, preview } = useUiPrefs();
  const [f, setF] = useState<SForm | null>(null);
  const [savedForm, setSavedForm] = useState<SForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"appearance" | "store" | "invoices" | "branding" | "thanks">("appearance");
  const [editorOpen, setEditorOpen] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api<Settings>("/api/settings")
      .then((s) => {
        const form = toForm(s);
        setF(form);
        setSavedForm(form);
      })
      .catch((e) => toast(errMsg(e), "error"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof SForm) => (e: { target: { value: string } }) =>
    setF((p) => (p ? { ...p, [k]: e.target.value } : p));

  /** تغيير مظهر مع معاينة فورية قبل الحفظ */
  type VisualKey = "theme" | "buttonStyle" | "fontFamily" | "tableHeaderColor" | "fontScale";
  const setVisual = (patch: Partial<Pick<SForm, VisualKey>>) => {
    setF((p) => (p ? { ...p, ...patch } : p));
    const ui: Partial<UiPrefs> = {};
    if (patch.theme !== undefined) ui.theme = patch.theme;
    if (patch.buttonStyle !== undefined) ui.buttonStyle = patch.buttonStyle;
    if (patch.fontFamily !== undefined) ui.fontFamily = patch.fontFamily;
    if (patch.tableHeaderColor !== undefined) ui.tableHeaderColor = patch.tableHeaderColor;
    if (patch.fontScale !== undefined) ui.fontScale = Number(patch.fontScale);
    void 0;
    if (Object.keys(ui).length) preview(ui);
  };

  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setF((p) => (p ? { ...p, customBgUrl: b64 } : p));
      toast("تم تحميل صورة الخلفية بنجاح — اضغط تطبيق وحفظ لتثبيتها");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setF((p) => (p ? { ...p, customLogoUrl: b64 } : p));
      toast("تم تحميل الشعار الجديد — اضغط تطبيق وحفظ لتثبيته");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!f) return;
    setBusy(true);
    try {
      const payload = { ...f, taxRate: Number(f.taxRate) || 0, fontScale: Number(f.fontScale) || 100 };
      const s = await api<Settings>("/api/settings", { method: "PUT", json: payload });
      const form = toForm(s);
      setF(form);
      setSavedForm(form);
      const applied: UiPrefs = {
        theme: form.theme,
        fontFamily: form.fontFamily,
        fontScale: Number(form.fontScale) || 100,
        buttonStyle: form.buttonStyle,
        tableHeaderColor: form.tableHeaderColor,
      };
      applyUiPrefs(applied);
      preview(applied);
      try {
        localStorage.setItem("aljamal.ui.prefs", JSON.stringify(applied));
      } catch {
        /* ignore */
      }
      toast("تم تطبيق وحفظ كل الإعدادات والمظهر بنجاح ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const cancelPreview = () => {
    if (savedForm) {
      setF(savedForm);
      const applied: UiPrefs = {
        theme: savedForm.theme,
        fontFamily: savedForm.fontFamily,
        fontScale: Number(savedForm.fontScale) || 100,
        buttonStyle: savedForm.buttonStyle,
        tableHeaderColor: savedForm.tableHeaderColor,
      };
      applyUiPrefs(applied);
      preview(applied);
    }
    load();
    toast("تم إلغاء المعاينة واستعادة الإعدادات المحفوظة", "info");
  };

  const activeTheme = THEMES.find((t) => t.key === prefs.theme) ?? THEMES[0];
  const scale = Number(f?.fontScale ?? prefs.fontScale ?? 100);

  // ===== تبويبات الإعدادات =====
  type TabKey = "appearance" | "store" | "invoices" | "branding" | "thanks";
  const TABS: { key: TabKey; label: string; hint: string }[] = [
    { key: "appearance", label: "المظهر والثيمات", hint: "الألوان والخطوط والأزرار" },
    { key: "store", label: "بيانات المحل", hint: "الاسم والهاتف والعنوان والضريبة" },
    { key: "invoices", label: "قوالب الفواتير", hint: "القالب والمقاس والتذييل" },
    { key: "branding", label: "الشعار والخلفية", hint: "اللوجو والشاشة الرئيسية" },
    { key: "thanks", label: "رسالة الترحيب", hint: "شكر وعرض بعد أول فاتورة" },
  ];
  const dirty = Boolean(f && savedForm && JSON.stringify(f) !== JSON.stringify(savedForm));
  const activeTabTheme = THEMES.find((t) => t.key === prefs.theme) ?? THEMES[0];
  const btnStyle = BUTTON_STYLES.find((b) => b.key === prefs.buttonStyle);
  const headerTheme = TABLE_HEADERS.find((t) => t.key === prefs.tableHeaderColor) ?? TABLE_HEADERS[0];

  const pickedTemplate =
    TEMPLATE_PRESETS.find((t) => t.key === f?.invoiceTemplate) ?? TEMPLATE_PRESETS[0];

  return (
    <Window
      title="الإعدادات وتخصيص المظهر والثيمات"
      icon={<IconSettings className="h-9 w-9" />}
      statusBar={
        <>
          <span>المعاينة فورية قبل الحفظ</span>
          <span className="sep" />
          <span>الثيم: {activeTheme.label}</span>
          <span className="sep" />
          <span>حجم الخط: {scale}%</span>
          <span className="ms-auto">
            {dirty ? "⚠ توجد تعديلات غير محفوظة — اضغط تطبيق وحفظ" : "كل التعديلات محفوظة ✓"}
          </span>
        </>
      }
    >
      {!f ? (
        <div className="grid h-full place-items-center text-[18px] font-bold text-slate-500">جاري التحميل...</div>
      ) : (
        <div className="flex h-full w-full flex-col bg-[#eef3fa]">
          {/* ===== شريط العنوان + الأزرار الثابتة ===== */}
          <div className="shrink-0 bg-gradient-to-l from-[#164066] to-[#0f2942] px-3 py-2 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[16.5px] font-black">إعدادات البرنامج</span>
                <span className="text-[11.5px] font-bold text-blue-200">
                  5 أقسام — اختر القسم من التبويبات بالأسفل
                </span>
              </div>
              <div className="ms-auto flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="btn btn-green h-[38px] px-4 text-[14.5px] font-black shadow"
                  onClick={() => void save()}
                  disabled={busy}
                >
                  <Save className="h-4 w-4" />
                  {busy ? "جاري التطبيق..." : "تطبيق وحفظ"}
                </button>
                <button type="button" className="btn h-[38px] px-3 text-[13px] font-black" onClick={cancelPreview}>
                  <RotateCcw className="h-4 w-4 text-blue-700" />
                  تراجع
                </button>
                <button type="button" className="btn h-[38px] px-3 text-[13px] font-black" onClick={() => load()}>
                  <RotateCcw className="h-4 w-4" />
                  إعادة تحميل
                </button>
              </div>
            </div>
          </div>

          {/* ===== التبويبات ===== */}
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b-2 border-[#c9d8ee] bg-white px-3 py-1.5">
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex flex-col items-start rounded-t-lg border-2 border-b-0 px-3 py-1 transition ${
                    on
                      ? "border-[#0f2942] bg-[#0f2942] text-white shadow"
                      : "border-transparent bg-[#eef3fa] text-[#0f2942] hover:bg-[#dbe8f7]"
                  }`}
                >
                  <span className="text-[13.5px] font-black">{t.label}</span>
                  <span className={`text-[10.5px] font-bold ${on ? "text-blue-200" : "text-slate-500"}`}>{t.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px] gap-3 overflow-auto p-3">
            {/* ============ محتوى التبويب ============ */}
            <div className="space-y-3">
              {/* ---------- 1) المظهر ---------- */}
              {tab === "appearance" && (
                <>
                  <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
                      <Palette className="h-4 w-4 text-[#f5c518]" />
                      ثيمات البرنامج — أزرق فقط
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 p-3">
                      {THEMES.map((t) => {
                        const active = prefs.theme === t.key;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setVisual({ theme: t.key })}
                            className={`group relative overflow-hidden rounded-lg border-2 p-0 text-right transition ${
                              active ? "border-[#2fb3a6] shadow-md ring-2 ring-[#2fb3a6]/40" : "border-slate-300 hover:border-[#8fb3e0]"
                            }`}
                            title={`${t.label} — ${t.hint}`}
                          >
                            <div className="h-[58px] w-full" style={{ background: t.homeBg }}>
                              <div className="flex h-[16px] items-center gap-1 px-1.5" style={{ background: t.swatch[0] }}>
                                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 bg-white px-2 py-1">
                              <span className="truncate text-[13px] font-black text-[#0c2340]">{t.label}</span>
                              {active && <Check className="h-4 w-4 shrink-0 text-[#0f8f82]" strokeWidth={3.5} />}
                            </div>
                            <div className="flex gap-0.5 px-2 pb-1.5">
                              {t.swatch.map((c) => (
                                <span key={c} className="h-2 flex-1 rounded-sm" style={{ background: c }} />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
                      <Type className="h-4 w-4 text-[#f5c518]" />
                      الخطوط وحجم الخط
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3">
                      <Field label="نوع الخط (يشمل خط Tahoma)">
                        <select
                          className="win-input w-full font-bold"
                          value={f.fontFamily}
                          onChange={(e) => setVisual({ fontFamily: e.target.value })}
                        >
                          {FONT_OPTIONS.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="form-label !mb-0">تكبير / تصغير الخط</span>
                          <span className="num rounded bg-[#eef3fa] px-2 py-0.5 text-[13px] font-black text-[#0f2942]">{scale}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="btn h-8 w-8 shrink-0 p-0 text-[16px] font-black"
                            onClick={() => setVisual({ fontScale: String(Math.max(70, scale - 5)) })}
                            title="تصغير"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min={70}
                            max={130}
                            step={5}
                            value={scale}
                            onChange={(e) => setVisual({ fontScale: e.target.value })}
                            className="h-2 flex-1 cursor-pointer"
                            style={{ accentColor: "#0f2942" }}
                          />
                          <button
                            type="button"
                            className="btn h-8 w-8 shrink-0 p-0 text-[16px] font-black"
                            onClick={() => setVisual({ fontScale: String(Math.min(130, scale + 5)) })}
                            title="تكبير"
                          >
                            +
                          </button>
                          <button type="button" className="btn h-8 shrink-0 px-2 text-[12px] font-black" onClick={() => setVisual({ fontScale: "100" })}>
                            افتراضي
                          </button>
                        </div>
                      </div>

                      <div className="col-span-2 rounded-md border border-slate-200 bg-[#f8fafd] p-2 text-center" style={{ fontFamily: FONT_OPTIONS.find((o) => o.key === f.fontFamily)?.stack }}>
                        <div className="text-[15px] font-black text-[#0c2340]">معاينة الخط: فاتورة مبيعات — 1,508.00 ج.م</div>
                        <div className="text-[12px] font-bold text-slate-500">أرقام: 0123456789 — ABCdef 123</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
                      <Sliders className="h-4 w-4 text-[#f5c518]" />
                      أشكال الأزرار وألوان ترويسة الجداول
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3">
                      <div>
                        <span className="form-label">شكل الأزرار</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {BUTTON_STYLES.map((b) => {
                            const active = prefs.buttonStyle === b.key;
                            return (
                              <button
                                key={b.key}
                                type="button"
                                onClick={() => setVisual({ buttonStyle: b.key })}
                                className={`rounded-md border-2 px-2 py-1.5 text-right transition ${
                                  active ? "border-[#2fb3a6] bg-[#eefaf8]" : "border-slate-300 hover:border-[#8fb3e0]"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[12.5px] font-black text-[#0c2340]">{b.label}</span>
                                  {active && <Check className="h-3.5 w-3.5 text-[#0f8f82]" strokeWidth={3.5} />}
                                </div>
                                <div className="text-[10.5px] font-bold text-slate-500">{b.hint}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="form-label">لون ترويسة الجداول</span>
                        <div className="space-y-1">
                          {TABLE_HEADERS.map((t) => {
                            const active = prefs.tableHeaderColor === t.key;
                            return (
                              <button
                                key={t.key}
                                type="button"
                                onClick={() => setVisual({ tableHeaderColor: t.key })}
                                className={`flex w-full items-center justify-between rounded-md border-2 px-2 py-1 transition ${
                                  active ? "border-[#2fb3a6]" : "border-slate-300 hover:border-[#8fb3e0]"
                                }`}
                              >
                                <span className="text-[12px] font-black text-[#0c2340]">{t.label}</span>
                                <span className="flex items-center gap-1">
                                  <span className="h-4 w-12 rounded-sm" style={{ background: `linear-gradient(180deg,${t.from},${t.to})` }} />
                                  {active && <Check className="h-3.5 w-3.5 text-[#0f8f82]" strokeWidth={3.5} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ---------- 2) بيانات المحل ---------- */}
              {tab === "store" && (
                <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                  <div className="bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">بيانات المحل والفاتورة</div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    <Field label="اسم المحل / النشاط" className="col-span-2">
                      <input className="win-input w-full font-black text-[16px]" value={f.storeName} onChange={set("storeName")} />
                    </Field>
                    <Field label="رقم الهاتف">
                      <input className="win-input num w-full" dir="ltr" value={f.phone} onChange={set("phone")} />
                    </Field>
                    <Field label="رقم هاتف إضافي (يظهر في الرئيسية)">
                      <input
                        className="win-input num w-full"
                        dir="ltr"
                        value={f.phone2}
                        onChange={set("phone2")}
                        placeholder="اتركه فارغاً لإخفاء الخانة"
                      />
                    </Field>
                    <Field label="العنوان التجاري">
                      <input className="win-input w-full" value={f.address} onChange={set("address")} />
                    </Field>
                    <Field label="اسم المستخدم / الكاشير">
                      <input className="win-input w-full" value={f.userName} onChange={set("userName")} />
                    </Field>
                    <Field label="اسم الفرع">
                      <input className="win-input w-full" value={f.branchName} onChange={set("branchName")} />
                    </Field>
                    <Field label="ضريبة القيمة المضافة %">
                      <input className="win-input num w-full" inputMode="decimal" value={f.taxRate} onChange={set("taxRate")} />
                    </Field>
                    <Field label="رمز العملة">
                      <input className="win-input w-full" value={f.currency} onChange={set("currency")} />
                    </Field>
                    <Field label="اسم المندوب / البائع">
                      <input className="win-input w-full" value={f.salesRep} onChange={set("salesRep")} />
                    </Field>
                  </div>
                </div>
              )}

              {/* ---------- 3) قوالب الفواتير ---------- */}
              {tab === "invoices" && (
                <>
                  <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
                      <LayoutTemplate className="h-4 w-4 text-[#f5c518]" />
                      قالب طباعة الفاتورة
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="grid grid-cols-2 gap-1.5">
                        {TEMPLATE_PRESETS.map((t) => {
                          const on = f.invoiceTemplate === t.key;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setF({ ...f, invoiceTemplate: t.key })}
                              className={`rounded-lg border-2 px-2.5 py-1.5 text-right transition ${
                                on ? "border-[#2fb3a6] bg-[#eefaf8]" : "border-slate-200 hover:border-[#8fb3e0]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[12.5px] font-black text-[#0f2942]">{t.label}</span>
                                {on && <Check className="h-4 w-4 shrink-0 text-[#0f8f82]" strokeWidth={3.5} />}
                              </div>
                              <div className="text-[10.5px] font-bold text-slate-500">{t.hint}</div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="btn btn-blue h-11 w-full text-[15px] font-black shadow"
                        onClick={() => setEditorOpen(true)}
                      >
                        <LayoutTemplate className="h-5 w-5" />
                        فتح محرّر القوالب — شاشة كاملة بمعاينة حية
                      </button>
                      <div className="rounded-md bg-[#eef4fa] px-3 py-1.5 text-[11.5px] font-bold text-slate-600">
                        من المحرر يمكنك: تغيير المقاس (A5 / A4 / حراري)، حجم الخط، لون القالب، الترويسة والتذييل،
                        إظهار أو إخفاء أي جزء من الفاتورة، وإضافة علامة مائية.
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                    <div className="bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">نصوص الفاتورة</div>
                    <div className="grid grid-cols-2 gap-3 p-3">
                      <Field label="نص تذييل الفاتورة" className="col-span-2">
                        <input className="win-input w-full" value={f.invoiceFooter} onChange={set("invoiceFooter")} />
                      </Field>
                      <Field label="الاسم الكبير (شاشة الدخول)" className="col-span-2">
                        <input className="win-input w-full font-black text-red-600" value={f.customBigTitle} onChange={set("customBigTitle")} />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {/* ---------- 5) رسالة الترحيب ---------- */}
              {tab === "thanks" && <ThanksMessageEditor />}

              {/* ---------- 4) الشعار والخلفية ---------- */}
              {tab === "branding" && (
                <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                  <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[15px] font-black text-white">
                    <ImageIcon className="h-4 w-4 text-[#f5c518]" />
                    الشعار والشاشة الرئيسية والخلفية
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    <div className="col-span-2 rounded-lg border-2 border-[#c9d8ee] bg-[#f4f8fd] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div>
                          <div className="text-[14px] font-black text-[#0f2942]">شعار البرنامج (Logo)</div>
                          <div className="text-[11.5px] font-bold text-slate-600">
                            يظهر بدون خلفية في الشاشة الرئيسية وشاشة الدخول والفواتير المطبوعة
                          </div>
                        </div>
                        <span className="rounded bg-white px-2 py-0.5 text-[11px] font-black text-[#0f2942]">PNG شفاف مُفضّل</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-md border border-slate-300 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.customLogoUrl || DEFAULT_LOGO} alt="logo" className="max-h-full max-w-full object-contain" />
                        </div>
                        <input
                          ref={logoFileRef}
                          type="file"
                          accept="image/png,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                        />
                        <button type="button" className="btn btn-blue h-9 px-4 text-[13.5px]" onClick={() => logoFileRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                          رفع شعار جديد
                        </button>
                        {f.customLogoUrl ? (
                          <button type="button" className="btn btn-red h-9 px-3 text-[13px]" onClick={() => setF({ ...f, customLogoUrl: "" })}>
                            <Trash2 className="h-4 w-4" />
                            استعادة الافتراضي
                          </button>
                        ) : (
                          <span className="text-[12px] font-bold text-slate-500">الشعار الافتراضي (FATORA)</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-between rounded-lg border border-[#c9d8ee] bg-[#f4f8fd] p-2.5">
                      <div>
                        <div className="text-[14px] font-black text-[#0f2942]">إظهار أو إخفاء الاسم الكبير</div>
                        <div className="text-[12px] text-slate-600">شعار البرنامج الأحمر الكبير في الشاشة الرئيسية</div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 font-black">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded"
                          checked={f.showBigTitle}
                          onChange={(e) => setF({ ...f, showBigTitle: e.target.checked })}
                        />
                        <span>{f.showBigTitle ? "ظاهر" : "مخفي"}</span>
                      </label>
                    </div>

                    <Field label="السطر الدعائي">
                      <input className="win-input w-full font-bold" value={f.customTagline} onChange={set("customTagline")} />
                    </Field>

                    <div className="col-span-2">
                      <span className="form-label">صورة خلفية مخصصة للرئيسية (اختياري)</span>
                      <div className="flex items-center gap-2">
                        <input
                          ref={bgFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBgUpload(file);
                          }}
                        />
                        <button type="button" className="btn btn-blue h-9 px-4 text-[13.5px]" onClick={() => bgFileRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                          رفع صورة من الكمبيوتر
                        </button>
                        {f.customBgUrl && (
                          <button type="button" className="btn btn-red h-9 px-3 text-[13px]" onClick={() => setF({ ...f, customBgUrl: "" })}>
                            <Trash2 className="h-4 w-4" />
                            حذف الخلفية
                          </button>
                        )}
                        <span className="text-[12px] text-slate-500">
                          {f.customBgUrl ? "✓ صورة خلفية مخصصة" : "تُستخدم الخلفية الافتراضية"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ============ العمود الجانبي: المعاينة الحية ============ */}
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
                <div className="bg-[#0f2942] px-3 py-2 text-[14px] font-black text-white">معاينة حية للمظهر المختار</div>
                <div className="space-y-2 p-3">
                  <div className="overflow-hidden rounded-lg border border-slate-400 shadow">
                    <div
                      className="flex h-[42px] items-center justify-between px-2 text-white"
                      style={{
                        background: `linear-gradient(180deg, ${activeTabTheme.swatch[0]}, ${activeTabTheme.swatch[1]} 50%, ${activeTabTheme.swatch[2]})`,
                      }}
                    >
                      <span className="flex items-center gap-1 text-[11px] font-black">
                        <CartLogo className="h-4 w-4" /> فاتورة مبيعات
                      </span>
                      <span className="flex gap-0.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-white/70" />
                        <span className="h-2.5 w-2.5 rounded-sm bg-white/70" />
                        <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                      </span>
                    </div>
                    <div className="bg-[#edf2f8] p-2">
                      <div className="mb-1.5 flex gap-1">
                        <button type="button" className="btn btn-green h-6 flex-1 text-[10px] font-black">
                          حفظ
                        </button>
                        <button type="button" className="btn h-6 flex-1 text-[10px] font-black">
                          جديد
                        </button>
                        <button type="button" className="btn btn-red h-6 flex-1 text-[10px] font-black">
                          حذف
                        </button>
                      </div>
                      <table className="w-full overflow-hidden rounded border border-slate-300 text-center text-[10px]">
                        <thead>
                          <tr style={{ background: `linear-gradient(180deg,${headerTheme.from},${headerTheme.to})`, color: "#fff" }}>
                            <th className="py-1">الصنف</th>
                            <th className="py-1">الكمية</th>
                            <th className="py-1">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          <tr>
                            <td className="py-1 text-right font-bold">كارت أفراح ليزر</td>
                            <td className="num">3</td>
                            <td className="num font-black">1,260.00</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="due-box mt-1.5 flex h-[30px] items-center justify-between px-2">
                        <span className="text-[10px] font-black text-white">المطلوب دفعه</span>
                        <span className="due-value num text-[15px]">1,508.00</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-[#1a4f9c] to-[#0b3370] px-2 py-1 text-center text-[10px] font-bold text-white">
                      {activeTheme.label}
                    </div>
                  </div>

                  <div className="space-y-0.5 rounded-md border border-slate-200 bg-[#f8fafd] p-2 text-[12px] font-bold text-slate-600">
                    <div className="flex justify-between">
                      <span>الخط:</span>
                      <b>{FONT_OPTIONS.find((o) => o.key === prefs.fontFamily)?.label.split(" — ")[0]}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>حجم الخط:</span>
                      <b className="num">{scale}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>شكل الأزرار:</span>
                      <b>{btnStyle?.label}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>لون الجداول:</span>
                      <b>{headerTheme.label}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>قالب الفاتورة:</span>
                      <b>{pickedTemplate.label.replace(/^[①-⑥]\s*/, "")}</b>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-green h-11 w-full text-[15.5px] font-black shadow"
                    onClick={() => void save()}
                    disabled={busy}
                  >
                    <Save className="h-5 w-5" />
                    {busy ? "جاري التطبيق..." : "تطبيق وحفظ الإعدادات"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <TemplateEditor
          onClose={() => {
            setEditorOpen(false);
            load();
          }}
        />
      )}
    </Window>
  );
}


function Card({
  icon,
  title,
  text,
  children,
  tone,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children: ReactNode;
  tone: string;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-5 text-center shadow-sm">
      <div className={`grid h-16 w-16 place-items-center rounded-2xl ${tone} shadow-md`}>{icon}</div>
      <div className="text-[18px] font-black text-[#0b2350]">{title}</div>
      <p className="min-h-[40px] text-[13px] font-bold text-slate-600">{text}</p>
      {children}
    </div>
  );
}

export function BackupView() {
  const { confirm, toast } = useDesktop();
  const fileRef = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setLast(localStorage.getItem("aljamal.lastBackup"));
    } catch {
      setLast(null);
    }
  }, []);

  const download = () => {
    const a = document.createElement("a");
    a.href = "/api/backup";
    a.download = "";
    a.click();
    const now = new Date().toISOString();
    try {
      localStorage.setItem("aljamal.lastBackup", now);
    } catch {
      /* ignore */
    }
    setLast(now);
    toast("جاري تحميل النسخة الاحتياطية المتكاملة...", "info");
  };

  const restore = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const ok = await confirm(
        `سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف:\n${file.name}\nهل تريد المتابعة؟`,
        {
          title: "استعادة نسخة احتياطية",
          danger: true,
          okText: "استعادة",
          cancelText: "إلغاء",
          kind: "warning",
        },
      );
      if (!ok) return;
      setBusy(true);
      const r = await api<{ message: string }>("/api/backup?action=restore", { method: "POST", json });
      toast(r.message);
    } catch (e) {
      toast(e instanceof SyntaxError ? "الملف ليس نسخة احتياطية صالحة" : errMsg(e), "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const action = async (kind: "reset" | "clear") => {
    const ok = await confirm(
      kind === "reset"
        ? "سيتم استعادة البيانات التجريبية الشاملة (أدوات مدرسية، خردوات، طباعة وتصميم، كروت أفراح، ودعاية وإعلان).\nهل أنت متأكد؟"
        : "سيتم حذف جميع الأصناف والفواتير والعملاء والموردين نهائياً!\nيُنصح بأخذ نسخة احتياطية أولاً.\nهل أنت متأكد؟",
      {
        title: kind === "reset" ? "البيانات التجريبية" : "حذف كل البيانات",
        danger: true,
        okText: "نعم، متابعة",
        cancelText: "إلغاء",
        kind: "warning",
      },
    );
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api<{ message: string }>(`/api/backup?action=${kind}`, { method: "POST", json: {} });
      toast(r.message);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Window
      title="النسخ الاحتياطي وإدارة البيانات"
      icon={<IconBackup className="h-9 w-9" />}
      statusBar={<span>آخر نسخة احتياطية: {last ? `${fmtDate(last)} ${fmtTime(last)}` : "لم يتم أخذ نسخة بعد"}</span>}
    >
      <div className="mx-auto flex h-full max-w-[1200px] flex-col justify-center overflow-auto p-6">
        <div className="panel mb-5 flex items-center gap-5 p-5 shadow-sm">
          <IconBackup className="h-20 w-20 shrink-0" />
          <div>
            <h2 className="text-[22px] font-black text-[#0b2350]">حماية وأمان بيانات محلك التجاري</h2>
            <p className="mt-1 text-[14.5px] font-bold text-slate-600 leading-relaxed">
              احتفظ بنسخة احتياطية من جميع الأصناف والفواتير والأقساط والورديات وحسابات العملاء والموردين بشكل دوري.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            icon={<Download className="h-8 w-8 text-white" />}
            title="أخذ نسخة احتياطية"
            text="تحميل ملف شامل يحتوي على كل بيانات البرنامج"
            tone="bg-gradient-to-b from-[#3d8af0] to-[#0b4cc2]"
          >
            <button type="button" className="btn btn-blue h-9 w-full" onClick={download} disabled={busy}>
              <DatabaseBackup className="h-4 w-4" />
              تحميل النسخة
            </button>
          </Card>
          <Card
            icon={<Upload className="h-8 w-8 text-white" />}
            title="استعادة نسخة"
            text="استرجاع البيانات من ملف نسخة احتياطية سابق"
            tone="bg-gradient-to-b from-[#5fd35f] to-[#1f9a1f]"
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
              }}
            />
            <button
              type="button"
              className="btn btn-green h-9 w-full"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              اختيار ملف
            </button>
          </Card>
          <Card
            icon={<RotateCcw className="h-8 w-8 text-white" />}
            title="بيانات تجريبية شاملة"
            text="إعادة تحميل أصناف الأدوات المدرسية والطباعة والدعاية"
            tone="bg-gradient-to-b from-[#ffb35c] to-[#dd7408]"
          >
            <button type="button" className="btn btn-orange h-9 w-full" onClick={() => void action("reset")} disabled={busy}>
              <RotateCcw className="h-4 w-4" />
              استعادة التجريبية
            </button>
          </Card>
          <Card
            icon={<Trash2 className="h-8 w-8 text-white" />}
            title="بدء بيانات جديدة"
            text="تفريغ كل البيانات لبدء تشغيل البرنامج الفعلي"
            tone="bg-gradient-to-b from-[#ff7a6e] to-[#c8160c]"
          >
            <button type="button" className="btn btn-red h-9 w-full" onClick={() => void action("clear")} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              حذف كل البيانات
            </button>
          </Card>
        </div>
      </div>
    </Window>
  );
}
