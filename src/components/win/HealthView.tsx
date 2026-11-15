"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  CircleX,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";

interface Check {
  key: string;
  label: string;
  level: "ok" | "warn" | "fail";
  value: string;
  hint?: string;
}

interface Report {
  at: string;
  level: "ok" | "warn" | "fail";
  checks: Check[];
  alerts: string[];
}

const ICONS: Record<string, React.ReactNode> = {
  db: <Wifi className="h-5 w-5" />,
  backup: <HardDrive className="h-5 w-5" />,
  disk: <HardDrive className="h-5 w-5" />,
  license: <ShieldCheck className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
};

/** شاشة فحص صحة البرنامج */
export function HealthView() {
  const [r, setR] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const d = await api<Report>("/api/health?full=1").catch(async (e) => {
        // الاستجابة قد تكون 503 مع تفاصيل — نحاول قراءتها
        throw e;
      });
      setR(d);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const tone =
    r?.level === "fail"
      ? { bg: "from-red-500 to-red-700", text: "يوجد خطأ حرج" }
      : r?.level === "warn"
        ? { bg: "from-amber-400 to-amber-600", text: "توجد تحذيرات" }
        : { bg: "from-emerald-500 to-emerald-700", text: "كل شيء يعمل بشكل طبيعي" };

  return (
    <div className="h-full overflow-auto bg-[#eef3fa] p-3" dir="rtl">
      <div className="mx-auto w-full max-w-[820px] space-y-3">
        <div className={`flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-l ${tone.bg} px-4 py-3 text-white shadow`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">
            {r?.level === "fail" ? (
              <CircleX className="h-6 w-6" />
            ) : r?.level === "warn" ? (
              <TriangleAlert className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </span>
          <div>
            <div className="text-[16px] font-black">صحة البرنامج</div>
            <div className="text-[11.5px] font-bold opacity-90">
              {r ? tone.text : "جاري الفحص…"}
              {r ? ` — آخر فحص ${new Date(r.at).toLocaleTimeString("ar-EG")}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="ms-auto flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-[12px] font-black hover:bg-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            فحص الآن
          </button>
        </div>

        {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-bold text-red-700">{err}</div>}

        {r?.alerts?.length ? (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-black text-red-900">
              <CircleAlert className="h-4 w-4" />
              يحتاج انتباهك ({r.alerts.length})
            </div>
            {r.alerts.map((a) => (
              <div key={a} className="text-[12px] font-bold text-red-800">
                • {a}
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          {(r?.checks || []).map((c) => (
            <div
              key={c.key}
              className={`flex items-start gap-3 rounded-xl border-2 bg-white p-3 shadow-sm ${
                c.level === "fail" ? "border-red-200" : c.level === "warn" ? "border-amber-200" : "border-[#d9e7f6]"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  c.level === "fail"
                    ? "bg-red-100 text-red-600"
                    : c.level === "warn"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {ICONS[c.key] || <CheckCircle2 className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <b className="text-[13.5px] font-black text-[#0f2942]">{c.label}</b>
                  <span
                    className={`rounded px-1.5 text-[10.5px] font-black ${
                      c.level === "fail"
                        ? "bg-red-100 text-red-700"
                        : c.level === "warn"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.level === "fail" ? "خطأ" : c.level === "warn" ? "تحذير" : "سليم"}
                  </span>
                </div>
                <div className="num text-[12.5px] font-bold text-slate-700">{c.value}</div>
                {c.hint && <div className="text-[11.5px] font-bold text-slate-500">{c.hint}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#c9d8ee] bg-white p-3 text-[11.5px] font-bold text-slate-600">
          <b className="text-[#0f2942]">كيف يعمل التنبيه؟</b> عند وجود خطأ حرج (قاعدة بيانات متوقفة، نسخة احتياطية متأخرة
          أكثر من أسبوع، مساحة تخزين منخفضة، ترخيص منتهٍ) يُرسل تنبيه على تيليجرام مرة واحدة يومياً — واضبط توكن البوت من
          الإعدادات لتفعيله.
        </div>
      </div>
    </div>
  );
}
