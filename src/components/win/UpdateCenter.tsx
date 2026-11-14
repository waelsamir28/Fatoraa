"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Cloud,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Rocket,
  TriangleAlert,
} from "lucide-react";
import { APP_VERSION, RELEASES_PAGE } from "@/lib/version";

/** حالة التحديث القادمة من نسخة الويندوز (electron-updater) */
export interface UpdateState {
  status: "idle" | "checking" | "available" | "none" | "downloading" | "downloaded" | "error";
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes?: string | null;
  progress: number;
  error?: string | null;
}

export interface RuntimeInfo {
  appVersion: string;
  electron?: string;
  chrome?: string;
  node?: string;
  platform?: string;
  arch?: string;
  mode: "cloud" | "local";
  cloudUrl?: string;
  localUrl?: string;
  database?: "cloud" | "embedded";
  databaseHost?: string;
  logFile?: string;
  isPackaged?: boolean;
}

interface UpdateBridge {
  getRuntimeInfo?: () => Promise<RuntimeInfo>;
  getUpdateState?: () => Promise<UpdateState>;
  checkForUpdates?: (manual?: boolean) => Promise<UpdateState | void>;
  downloadUpdate?: () => Promise<{ ok: boolean; error?: string }>;
  installUpdate?: () => Promise<boolean>;
  onUpdateState?: (cb: (s: UpdateState) => void) => () => void;
  openExternal?: (url: string) => Promise<boolean>;
}

function desktopBridge(): UpdateBridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as unknown as { aljamalDesktop?: UpdateBridge }).aljamalDesktop;
  return b && (b as { isDesktop?: boolean }).isDesktop ? b : null;
}

function statusText(s: UpdateState | null, native: boolean) {
  if (!native) return "أنت تستخدم النسخة السحابية — يتم تحديثها تلقائياً من الخادم.";
  if (!s) return "جارٍ قراءة حالة التحديثات...";
  switch (s.status) {
    case "checking":
      return "جارٍ التحقق من وجود إصدار جديد...";
    case "available":
      return `يوجد إصدار جديد (${s.latestVersion}) — اضغط تنزيل التحديث.`;
    case "downloading":
      return `جارٍ تنزيل التحديث... ${s.progress}%`;
    case "downloaded":
      return `تم تنزيل الإصدار ${s.latestVersion} — اضغط تثبيت وإعادة التشغيل.`;
    case "none":
      return "أنت على أحدث إصدار. لا يوجد تحديث متاح.";
    case "error":
      return `تعذر التحقق من التحديثات: ${s.error || "خطأ غير معروف"}`;
    default:
      return "التحديث التلقائي جاهز.";
  }
}

/** صف حالة التحديث — يُستخدم داخل شاشة "معلومات عن البرنامج" */
export function UpdatePanel() {
  const [native, setNative] = useState(false);
  const [state, setState] = useState<UpdateState | null>(null);
  const [info, setInfo] = useState<RuntimeInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const b = desktopBridge();
    if (!b) return;
    setNative(true);
    b.getUpdateState?.().then(setState).catch(() => undefined);
    b.getRuntimeInfo?.().then(setInfo).catch(() => undefined);
    const off = b.onUpdateState?.((s) => setState(s));
    return () => off?.();
  }, []);

  const check = useCallback(async () => {
    const b = desktopBridge();
    if (!b) return;
    setBusy(true);
    try {
      const s = await b.checkForUpdates?.(true);
      if (s) setState(s);
    } finally {
      setBusy(false);
    }
  }, []);

  const download = useCallback(async () => {
    const b = desktopBridge();
    if (!b) return;
    setBusy(true);
    try {
      await b.downloadUpdate?.();
    } finally {
      setBusy(false);
    }
  }, []);

  const install = useCallback(async () => {
    await desktopBridge()?.installUpdate?.();
  }, []);

  const openDownload = useCallback(() => {
    const b = desktopBridge();
    if (b?.openExternal) b.openExternal(RELEASES_PAGE);
    else window.open(RELEASES_PAGE, "_blank", "noopener");
  }, []);

  const progress = state?.status === "downloading" ? state.progress : state?.status === "downloaded" ? 100 : 0;

  return (
    <div className="rounded-xl border-2 border-[#c9d8ee] bg-[#f7faff] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[15px] font-black text-[#0b2350]">
          <RefreshCw className={`h-5 w-5 text-blue-700 ${state?.status === "checking" ? "animate-spin" : ""}`} />
          <span>تحديثات البرنامج</span>
        </div>
        <span className="num rounded-md bg-white px-2 py-0.5 text-[12px] font-black text-slate-600 ring-1 ring-slate-200">
          إصدارك: {info?.appVersion || APP_VERSION}
        </span>
      </div>

      <p className="mt-2 text-[13.5px] font-bold leading-relaxed text-slate-600">{statusText(state, native)}</p>

      {progress > 0 && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!native ? (
          <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12.5px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> محدَّث تلقائياً من السحابة
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={check}
              disabled={busy || state?.status === "checking" || state?.status === "downloading"}
              className="btn btn-blue flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> التحقق من التحديثات
            </button>

            {(state?.status === "available" || state?.status === "error") && (
              <>
                <button
                  type="button"
                  onClick={download}
                  disabled={busy}
                  className="btn flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-50"
                >
                  <ArrowDownToLine className="h-4 w-4" /> تنزيل التحديث
                </button>
                <button
                  type="button"
                  onClick={openDownload}
                  className="btn flex h-9 items-center gap-1.5 px-3 text-[13px]"
                >
                  <Download className="h-4 w-4" /> تحميل يدوي
                </button>
              </>
            )}

            {state?.status === "downloaded" && (
              <button
                type="button"
                onClick={install}
                className="btn btn-green flex h-9 items-center gap-1.5 px-3 text-[13px]"
              >
                <Rocket className="h-4 w-4" /> تثبيت وإعادة التشغيل
              </button>
            )}

            {state?.status === "none" && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> محدَّث
              </span>
            )}
          </>
        )}
      </div>

      {state?.status === "error" && native && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[12px] font-bold text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>لو التحميل التلقائي فشل، استخدم زر «تحميل يدوي» ونصّب النسخة الجديدة.</span>
        </div>
      )}

      {/* معلومات التشغيل */}
      {native && info && (
        <div className="mt-3 grid gap-1.5 border-t border-[#dbe6f5] pt-3 text-[12.5px] font-bold text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            {info.mode === "cloud" ? <Cloud className="h-4 w-4 text-blue-600" /> : <HardDrive className="h-4 w-4 text-slate-500" />}
            وضع التشغيل: <b className="text-[#0b2350]">{info.mode === "cloud" ? "سحابي (أحدث واجهة)" : "محلي (بدون إنترنت)"}</b>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-slate-500" />
            قاعدة البيانات:{" "}
            <b className="text-[#0b2350]">
              {info.database === "cloud" ? `سحابية${info.databaseHost ? ` (${info.databaseHost})` : ""}` : "مدمجة على الجهاز"}
            </b>
          </div>
          {info.mode === "cloud" && info.cloudUrl && (
            <div className="truncate sm:col-span-2" dir="ltr">
              ☁ {info.cloudUrl}
            </div>
          )}
          <div className="sm:col-span-2" dir="ltr">
            Electron {info.electron} · Chrome {info.chrome?.split(".")[0]} · {info.arch}
          </div>
          <a
            href="/connection"
            className="sm:col-span-2 mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#0b4cc2] px-3 py-1.5 text-[12px] font-black text-white hover:bg-[#0a3fa3]"
          >
            <Cloud className="h-3.5 w-3.5" /> تعديل رابط السحابة وقاعدة البيانات
          </a>
        </div>
      )}
    </div>
  );
}

/** شريط صغير عائم يظهر في نسخة سطح المكتب فقط عند وجود تحديث جاهز */
export function UpdateBanner() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [native, setNative] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const b = desktopBridge();
    if (!b?.onUpdateState) return;
    setNative(true);
    b.getUpdateState?.()
      .then((s) => {
        const current = s?.currentVersion || APP_VERSION;
        const latest = s?.latestVersion || current;
        // لو الحالة القديمة "متاح" وطابقت إصدارك الحالي، معناها اتحدّث بالفعل
        if (s?.status === "available" && latest === current) setState({ ...s, status: "none" });
        else setState(s);
      })
      .catch(() => undefined);
    return b.onUpdateState((s) => setState(s));
  }, []);

  if (!native || hidden) return null;
  const show =
    state?.status === "available" ||
    state?.status === "downloading" ||
    state?.status === "downloaded";
  if (!show) return null;

  const install = () => desktopBridge()?.installUpdate?.();
  const download = () => desktopBridge()?.downloadUpdate?.();

  return (
    <div className="fixed bottom-[62px] left-3 z-[100] w-[320px] overflow-hidden rounded-xl border-2 border-blue-700 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-gradient-to-l from-blue-800 to-blue-600 px-3 py-2 text-white">
        <div className="flex items-center gap-2 text-[13.5px] font-black">
          <Rocket className="h-4 w-4 text-amber-300" />
          <span>{state?.status === "downloaded" ? "التحديث جاهز للتثبيت" : "يوجد إصدار جديد من البرنامج"}</span>
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="rounded px-1.5 text-white/80 hover:bg-white/20"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2 p-3 text-[12.5px] font-bold text-slate-700">
        {state?.status === "downloading" ? (
          <>
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              جارٍ تنزيل الإصدار {state.latestVersion}... {state.progress}%
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${state.progress}%` }} />
            </div>
          </>
        ) : state?.status === "downloaded" ? (
          <button type="button" onClick={install} className="btn btn-green flex h-9 w-full items-center justify-center gap-1.5 text-[13px]">
            <Rocket className="h-4 w-4" /> تثبيت وإعادة التشغيل الآن
          </button>
        ) : (
          <>
            <div>
              الإصدار الجديد: <b className="num text-[#0b2350]">{state?.latestVersion}</b>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={download} className="btn btn-blue flex h-9 flex-1 items-center justify-center gap-1.5 text-[13px]">
                <ArrowDownToLine className="h-4 w-4" /> تنزيل التحديث
              </button>
              <a
                href="/about"
                className="btn flex h-9 items-center justify-center px-3 text-[13px]"
              >
                التفاصيل
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
