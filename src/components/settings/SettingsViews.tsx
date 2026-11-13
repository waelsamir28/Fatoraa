"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  DatabaseBackup,
  Download,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Field, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { CartLogo, IconBackup, IconSettings } from "@/components/icons/AppIcons";
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
});

export function SettingsForm() {
  const { toast } = useDesktop();
  const { prefs, preview } = useUiPrefs();
  const [f, setF] = useState<SForm | null>(null);
  const [savedForm, setSavedForm] = useState<SForm | null>(null);
  const [busy, setBusy] = useState(false);
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
          <span className="ms-auto">اضغط «تطبيق وحفظ» لتثبيت التعديلات</span>
        </>
      }
    >
      {!f ? (
        <div className="grid h-full place-items-center text-[18px] font-bold text-slate-500">جاري التحميل...</div>
      ) : (
        <div className="flex h-full w-full flex-col">
          {/* شريط الأزرار الثابت */}
          <div className="panel mx-3 mt-3 flex shrink-0 flex-wrap items-center gap-2 border-2 border-blue-300 bg-white/80 p-2">
            <button type="button" className="btn btn-green h-[40px] px-5 text-[15.5px] font-black shadow" onClick={() => void save()} disabled={busy}>
              <Save className="h-5 w-5" />
              {busy ? "جاري التطبيق..." : "تطبيق وحفظ الإعدادات"}
            </button>
            <button type="button" className="btn h-[40px] px-4 text-[14px] font-black" onClick={cancelPreview}>
              <X className="h-4 w-4 text-red-600" />
              إلغاء المعاينة
            </button>
            <button type="button" className="btn h-[40px] px-4 text-[14px] font-black" onClick={() => load()}>
              <RotateCcw className="h-4 w-4 text-blue-700" />
              إعادة تحميل
            </button>
            <span className="ms-auto rounded-md bg-blue-50 px-3 py-1.5 text-[12.5px] font-bold text-blue-900">
              تغيير أي ثيم أو خط أو حجم يظهر فوراً في المعاينة والشاشات — ولا يُثبّت إلا بالحفظ
            </span>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_370px] gap-3 overflow-auto p-3">
            {/* ======= العمود الأيمن: إعدادات المظهر ======= */}
            <div className="space-y-3">
              {/* الثيمات */}
              <div className="panel overflow-hidden border-2 border-blue-200">
                <div className="navy-head flex items-center gap-2 px-4 py-2 text-[15.5px]">
                  <Palette className="h-4 w-4" />
                  <span>ثيمات البرنامج — معاينة فورية قبل الاختيار</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  {THEMES.map((t) => {
                    const active = prefs.theme === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setVisual({ theme: t.key })}
                        onDoubleClick={() => setVisual({ theme: t.key })}
                        className={`group relative overflow-hidden rounded-lg border-2 p-0 text-right transition ${
                          active ? "border-green-500 shadow-md ring-2 ring-green-300" : "border-slate-300 hover:border-blue-500"
                        }`}
                        title={`${t.label} — ${t.hint}`}
                      >
                        <div className="h-[52px] w-full" style={{ background: t.homeBg }}>
                          <div className="flex h-[16px] items-center gap-1 px-1.5" style={{ background: t.swatch[0] }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1 bg-white px-2 py-1">
                          <span className="truncate text-[12.5px] font-black text-[#0c2340]">{t.label}</span>
                          {active && <Check className="h-4 w-4 shrink-0 text-green-600" strokeWidth={3.5} />}
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

              {/* الخطوط وحجم الخط */}
              <div className="panel overflow-hidden border-2 border-indigo-200">
                <div className="navy-head flex items-center gap-2 px-4 py-2 text-[15.5px]">
                  <Type className="h-4 w-4" />
                  <span>الخطوط وحجم الخط</span>
                </div>
                <div className="space-y-3 p-3">
                  <Field label="نوع الخط (يشمل خط Tahoma)">
                    <select className="win-input w-full font-bold" value={f.fontFamily} onChange={(e) => setVisual({ fontFamily: e.target.value })}>
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
                      <span className="num rounded bg-indigo-50 px-2 py-0.5 text-[13px] font-black text-indigo-800">{scale}%</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="h-2 flex-1 cursor-pointer accent-indigo-600"
                        style={{ accentColor: "#4338ca" }}
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
                    <div className="mt-1 flex justify-between text-[10.5px] font-bold text-slate-400">
                      <span>70% أصغر</span>
                      <span>100%</span>
                      <span>130% أكبر</span>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2 text-center" style={{ fontFamily: FONT_OPTIONS.find((o) => o.key === f.fontFamily)?.stack }}>
                    <div className="text-[15px] font-black text-[#0c2340]">معاينة الخط: فاتورة مبيعات — 1,508.00 ج.م</div>
                    <div className="text-[12px] font-bold text-slate-500">أرقام: 0123456789 — ABCdef 123</div>
                  </div>
                </div>
              </div>

              {/* أشكال الأزرار وألوان الجداول */}
              <div className="panel overflow-hidden border-2 border-emerald-200">
                <div className="navy-head flex items-center gap-2 px-4 py-2 text-[15.5px]">
                  <Sliders className="h-4 w-4" />
                  <span>أشكال الأزرار وألوان ترويسة الجداول</span>
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
                              active ? "border-green-500 bg-green-50" : "border-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[12.5px] font-black text-[#0c2340]">{b.label}</span>
                              {active && <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3.5} />}
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
                              active ? "border-green-500" : "border-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <span className="text-[12px] font-black text-[#0c2340]">{t.label}</span>
                            <span className="flex items-center gap-1">
                              <span className="h-4 w-12 rounded-sm" style={{ background: `linear-gradient(180deg,${t.from},${t.to})` }} />
                              {active && <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3.5} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* الشاشة الرئيسية */}
              <div className="panel overflow-hidden border-2 border-amber-200">
                <div className="navy-head flex items-center gap-2 px-4 py-2 text-[15.5px]">
                  <ImageIcon className="h-4 w-4" />
                  <span>الشعار والشاشة الرئيسية والخلفية</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  {/* شعار البرنامج */}
                  <div className="col-span-2 rounded-lg border-2 border-blue-200 bg-blue-50/60 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div>
                        <div className="text-[14px] font-black text-blue-900">شعار البرنامج (Logo)</div>
                        <div className="text-[11.5px] font-bold text-slate-600">
                          يظهر بدون خلفية في الشاشة الرئيسية وشاشة الدخول والفواتير المطبوعة
                        </div>
                      </div>
                      <span className="rounded bg-white px-2 py-0.5 text-[11px] font-black text-blue-800">PNG شفاف مُفضّل</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-md border border-slate-300 bg-white">
                        {f.customLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.customLogoUrl} alt="logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={DEFAULT_LOGO} alt="logo" className="max-h-full max-w-full object-contain" />
                        )}
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
                        رفع شعار جديد من الكمبيوتر
                      </button>
                      {f.customLogoUrl ? (
                        <button type="button" className="btn btn-red h-9 px-3 text-[13px]" onClick={() => setF({ ...f, customLogoUrl: "" })}>
                          <Trash2 className="h-4 w-4" />
                          استعادة الشعار الافتراضي
                        </button>
                      ) : (
                        <span className="text-[12px] font-bold text-slate-500">الشعار الافتراضي (FATORA)</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-between rounded-lg bg-blue-50 p-2.5">
                    <div>
                      <div className="text-[14px] font-black text-blue-900">إظهار أو إخفاء الاسم الكبير</div>
                      <div className="text-[12px] text-slate-600">شعار البرنامج الأحمر الكبير في الشاشة الرئيسية</div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 font-black">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded text-blue-600"
                        checked={f.showBigTitle}
                        onChange={(e) => setF({ ...f, showBigTitle: e.target.checked })}
                      />
                      <span>{f.showBigTitle ? "ظاهر" : "مخفي"}</span>
                    </label>
                  </div>
                  <Field label="الاسم الكبير">
                    <input className="win-input w-full font-black text-red-600" value={f.customBigTitle} onChange={set("customBigTitle")} />
                  </Field>
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
                        {f.customBgUrl ? "✓ صورة خلفية مخصصة" : "تُستخدم الخلفية الافتراضية الجديدة"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* بيانات المحل */}
              <div className="panel overflow-hidden">
                <div className="navy-head px-4 py-2 text-[15.5px]">بيانات المحل والفاتورة</div>
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
                  <Field label="قالب الفاتورة" className="col-span-2">
                    <select className="win-input w-full font-bold" value={f.invoiceTemplate} onChange={set("invoiceTemplate")}>
                      <option value="template-modern-a5">A5 عصري أنيق</option>
                      <option value="template-classic-a5">A5 كلاسيكي رسمي</option>
                      <option value="template-pos-thermal">إيصال حراري 80mm</option>
                    </select>
                  </Field>
                  <Field label="نص تذييل الفاتورة" className="col-span-2">
                    <input className="win-input w-full" value={f.invoiceFooter} onChange={set("invoiceFooter")} />
                  </Field>
                </div>
              </div>
            </div>

            {/* ======= العمود الأيسر: المعاينة الحية ======= */}
            <div className="space-y-3">
              <div className="panel overflow-hidden shadow-sm">
                <div className="navy-head px-3 py-2 text-[14.5px]">معاينة حية للمظهر المختار</div>
                <div className="space-y-2 p-3">
                  {/* نافذة مصغرة */}
                  <div className="overflow-hidden rounded-lg border border-slate-400 shadow">
                    <div
                      className="flex h-[42px] items-center justify-between px-2 text-white"
                      style={{
                        background: `linear-gradient(180deg, ${activeTheme.swatch[0]}, ${activeTheme.swatch[1]} 50%, ${activeTheme.swatch[2]})`,
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
                          <tr style={{ background: `linear-gradient(180deg,${TABLE_HEADERS.find((t) => t.key === prefs.tableHeaderColor)?.from},${TABLE_HEADERS.find((t) => t.key === prefs.tableHeaderColor)?.to})`, color: "#fff" }}>
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

                  <div className="rounded-md border border-slate-200 bg-white p-2 text-[12px] font-bold text-slate-600">
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
                      <b>{BUTTON_STYLES.find((b) => b.key === prefs.buttonStyle)?.label}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>لون الجداول:</span>
                      <b>{TABLE_HEADERS.find((t) => t.key === prefs.tableHeaderColor)?.label}</b>
                    </div>
                  </div>

                  <button type="button" className="btn btn-green h-11 w-full text-[15.5px] font-black shadow" onClick={() => void save()} disabled={busy}>
                    <Save className="h-5 w-5" />
                    {busy ? "جاري التطبيق..." : "تطبيق وحفظ الإعدادات"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
