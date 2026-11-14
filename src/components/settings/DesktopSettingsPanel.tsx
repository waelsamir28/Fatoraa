"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Info,
  Loader2,
  Power,
  RefreshCw,
  Save,
  TriangleAlert,
  Unplug,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";

export interface DesktopSettings {
  cloudUrl: string;
  databaseUrl: string;
  hasCustomCloud: boolean;
  hasCustomDatabase: boolean;
  effectiveCloudUrl: string;
  mode: "cloud" | "local";
  settingsFile?: string;
  logFile?: string;
}

type TestResult = { ok: boolean; error?: string; host?: string; ms?: number; checked?: string; note?: string } | null;

interface SettingsBridge {
  getSettings?: () => Promise<DesktopSettings>;
  saveSettings?: (p: { cloudUrl?: string; databaseUrl?: string }) => Promise<{
    ok: boolean;
    restartNeeded?: boolean;
    masked?: string;
  }>;
  testCloudUrl?: (url: string) => Promise<TestResult>;
  testDatabaseUrl?: (url: string) => Promise<TestResult>;
  clearDatabaseUrl?: () => Promise<{ ok: boolean; restartNeeded?: boolean }>;
  relaunchApp?: () => Promise<boolean>;
  openExternal?: (url: string) => Promise<boolean>;
}

function settingsBridge(): SettingsBridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as unknown as { aljamalDesktop?: SettingsBridge }).aljamalDesktop;
  return b && (b as { isDesktop?: boolean }).isDesktop ? b : null;
}

function ResultLine({ result, label }: { result: TestResult; label: string }) {
  if (!result) return null;
  return (
    <div
      className={`flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold ${
        result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="leading-relaxed">
        {result.ok
          ? result.checked === "saved"
            ? result.note || "الرابط المحفوظ جاهز للاستخدام"
            : `${label} متصل بنجاح${result.host ? ` (${result.host})` : ""}${
                result.ms ? ` — ${result.ms} مللي ثانية` : ""
              }`
          : result.error || `${label} غير متاح`}
      </span>
    </div>
  );
}

/** شاشة إعدادات الاتصال — تظهر في نسخة سطح المكتب فقط */
export function DesktopSettingsPanel() {
  const { msg } = useDesktop();
  const [native, setNative] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [cloudUrl, setCloudUrl] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [hasDb, setHasDb] = useState(false);

  const [testingCloud, setTestingCloud] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [cloudResult, setCloudResult] = useState<TestResult>(null);
  const [dbResult, setDbResult] = useState<TestResult>(null);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const load = useCallback(async () => {
    const b = settingsBridge();
    if (!b?.getSettings) {
      setLoading(false);
      return;
    }
    setNative(true);
    try {
      const s = await b.getSettings();
      setSettings(s);
      setCloudUrl(s.cloudUrl || s.effectiveCloudUrl || "");
      setDatabaseUrl(s.databaseUrl || "");
      setHasDb(s.hasCustomDatabase);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testCloud = async () => {
    const b = settingsBridge();
    if (!b?.testCloudUrl) return;
    setTestingCloud(true);
    setCloudResult(null);
    try {
      setCloudResult(await b.testCloudUrl(cloudUrl));
    } finally {
      setTestingCloud(false);
    }
  };

  const testDb = async () => {
    const b = settingsBridge();
    if (!b?.testDatabaseUrl) return;
    setTestingDb(true);
    setDbResult(null);
    try {
      setDbResult(await b.testDatabaseUrl(databaseUrl));
    } finally {
      setTestingDb(false);
    }
  };

  const save = async () => {
    const b = settingsBridge();
    if (!b?.saveSettings) return;
    setSaving(true);
    try {
      const r = await b.saveSettings({ cloudUrl, databaseUrl });
      if (r.ok) {
        setRestartNeeded(Boolean(r.restartNeeded));
        await msg({
          kind: "success",
          title: "تم الحفظ",
          text: r.restartNeeded
            ? "تم حفظ الإعدادات.\nلازم تعيد تشغيل البرنامج لتطبيق قاعدة البيانات الجديدة."
            : "تم حفظ الإعدادات بنجاح.",
        });
        await load();
      } else {
        await msg({ kind: "error", text: "تعذر حفظ الإعدادات، حاول مرة أخرى." });
      }
    } finally {
      setSaving(false);
    }
  };

  const clearDb = async () => {
    const b = settingsBridge();
    if (!b?.clearDatabaseUrl) return;
    const ok = await msg({
      kind: "question",
      confirm: true,
      title: "القاعدة المدمجة",
      text: "هل تريد حذف رابط قاعدة البيانات والرجوع إلى القاعدة المدمجة على الجهاز؟\n(البيانات السحابية لن تُحذف، لكن البرنامج سيعمل على بيانات محلية) ",
    });
    if (!ok) return;
    const r = await b.clearDatabaseUrl();
    if (r.ok) {
      setDatabaseUrl("");
      setHasDb(false);
      setRestartNeeded(true);
      await load();
    }
  };

  const relaunch = async () => {
    await settingsBridge()?.relaunchApp?.();
  };

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex items-center gap-2 text-[15px] font-bold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> جارٍ قراءة الإعدادات...
        </div>
      </div>
    );
  }

  if (!native) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="panel max-w-[560px] p-6 text-center">
          <Info className="mx-auto h-10 w-10 text-blue-600" />
          <div className="mt-2 text-[17px] font-black text-[#0b2350]">إعدادات الاتصال خاصة بنسخة الويندوز</div>
          <p className="mt-2 text-[14px] font-bold leading-relaxed text-slate-600">
            في النسخة السحابية تكون قاعدة البيانات ورابط الموقع مضبوطين على الخادم تلقائياً.
            <br />
            افتح برنامج FATORA المثبّت على الجهاز لتعديلها من هنا.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto w-full max-w-[900px] space-y-4">
        {/* الوضع الحالي */}
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[16px] font-black text-[#0b2350]">
              <IconSettings className="h-6 w-6" />
              <span>إعدادات الاتصال</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12.5px] font-black ${
                  settings?.mode === "cloud"
                    ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {settings?.mode === "cloud" ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                {settings?.mode === "cloud" ? "وضع سحابي" : "وضع محلي"}
              </span>
              <button
                type="button"
                onClick={load}
                className="btn flex h-8 items-center gap-1 px-2.5 text-[12.5px]"
                title="تحديث"
              >
                <RefreshCw className="h-3.5 w-3.5" /> تحديث
              </button>
            </div>
          </div>
          <p className="mt-1 text-[12.5px] font-bold text-slate-500" dir="ltr">
            {settings?.settingsFile}
          </p>
        </div>

        {/* رابط السحابة */}
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-[15px] font-black text-[#0b2350]">
            <Cloud className="h-5 w-5 text-blue-600" />
            <span>رابط نسخة الويب (Vercel)</span>
          </div>
          <p className="mt-1 text-[12.5px] font-bold leading-relaxed text-slate-600">
            البرنامج يفتح هذه الواجهة أولاً، فأي تعديل على الموقع يظهر فوراً بدون تحديث البرنامج.
            ولو مفيش إنترنت يشتغل على النسخة المدمجة.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="url"
              dir="ltr"
              value={cloudUrl}
              onChange={(e) => {
                setCloudUrl(e.target.value);
                setCloudResult(null);
              }}
              placeholder="https://your-app.vercel.app"
              className="h-9 min-w-[260px] flex-1 rounded-lg border-2 border-[#c9d8ee] px-3 font-mono text-[13px] text-slate-800 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={testCloud}
              disabled={testingCloud}
              className="btn flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-50"
            >
              {testingCloud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              اختبار
            </button>
            <button
              type="button"
              onClick={() => {
                const b = settingsBridge();
                if (b?.openExternal && cloudUrl) b.openExternal(cloudUrl);
              }}
              className="btn flex h-9 items-center gap-1.5 px-3 text-[13px]"
              title="فتح في المتصفح"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <ResultLine result={cloudResult} label="رابط السحابة" />
          </div>
        </div>

        {/* قاعدة البيانات */}
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[15px] font-black text-[#0b2350]">
              <Database className="h-5 w-5 text-emerald-600" />
              <span>قاعدة البيانات (PostgreSQL)</span>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[11.5px] font-black ${
                hasDb ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
              }`}
            >
              {hasDb ? "سحابية" : "مدمجة على الجهاز"}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] font-bold leading-relaxed text-slate-600">
            نفس القاعدة للويب وسطح المكتب = نفس البيانات في كل مكان. اتركها فارغة لاستخدام القاعدة المدمجة
            (بيانات محلية على هذا الجهاز فقط).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={databaseUrl}
              onChange={(e) => {
                setDatabaseUrl(e.target.value);
                setDbResult(null);
              }}
              placeholder="postgresql://user:password@host/db?sslmode=require"
              className="h-9 min-w-[260px] flex-1 rounded-lg border-2 border-[#c9d8ee] px-3 font-mono text-[12.5px] text-slate-800 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={testDb}
              disabled={testingDb || !databaseUrl}
              className="btn flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-50"
            >
              {testingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              اختبار
            </button>
            {hasDb && (
              <button
                type="button"
                onClick={clearDb}
                className="btn flex h-9 items-center gap-1.5 px-3 text-[13px] text-red-700"
              >
                <HardDrive className="h-4 w-4" /> الرجوع للمدمجة
              </button>
            )}
          </div>
          <div className="mt-2">
            <ResultLine result={dbResult} label="قاعدة البيانات" />
          </div>
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11.5px] font-bold leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>كلمة السر تُعرض مخفية (****) بعد الحفظ. أي تغيير يحتاج إعادة تشغيل البرنامج.</span>
          </div>
        </div>

        {/* أزرار */}
        <div className="panel flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn btn-blue flex h-10 items-center gap-2 px-5 text-[14px] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ الإعدادات
            </button>
            <button
              type="button"
              onClick={relaunch}
              className={`btn flex h-10 items-center gap-2 px-4 text-[14px] ${restartNeeded ? "btn-green" : ""}`}
            >
              <Power className="h-4 w-4" />
              إعادة تشغيل البرنامج
            </button>
          </div>
          {settings?.logFile && (
            <span className="flex items-center gap-1 text-[11.5px] font-bold text-slate-500" dir="ltr">
              <FolderOpen className="h-3.5 w-3.5" />
              {settings.logFile}
            </span>
          )}
        </div>

        {restartNeeded && (
          <div className="flex items-start gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-[13px] font-bold text-amber-950">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>تم الحفظ. اضغط «إعادة تشغيل البرنامج» لتطبيق قاعدة البيانات الجديدة.</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** غلاف بنافذة البرنامج (شريط عنوان موحد) */
export function DesktopSettingsView() {
  return (
    <Window title="إعدادات الاتصال" icon={<IconSettings className="h-9 w-9" />} statusBar={<span>نسخة سطح المكتب</span>}>
      <DesktopSettingsPanel />
    </Window>
  );
}
