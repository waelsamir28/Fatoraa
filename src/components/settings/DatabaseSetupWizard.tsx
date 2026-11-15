"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Loader2,
  Plug,
  RefreshCw,
  ServerCog,
  Trash2,
  Zap,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";

interface Status {
  hasSaved: boolean;
  savedMasked: string;
  envConfigured: boolean;
  envMasked: string;
  mode: "embedded" | "postgres";
  isOwner: boolean;
}

type TestResult = { ok: boolean; error?: string; host?: string; ms?: number; version?: string };

/**
 * شاشة «ربط قاعدة البيانات» المبسطة للعميل:
 * يلصق رابط واحد → البرنامج يفحصه → ينزّل ملفات الإعداد الجاهزة.
 * بدون أي أكواد ولا تعديل ملفات يدوي.
 */
export function DatabaseSetupWizard() {
  const { toast, confirm } = useDesktop();
  const [status, setStatus] = useState<Status | null>(null);
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [output, setOutput] = useState<{ envFile: string; settingsFile: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<Status>("/api/server-config");
      setStatus(s);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runTest = async () => {
    if (!url.trim()) return toast("الصق رابط قاعدة البيانات الأول", "error");
    setTesting(true);
    setTest(null);
    setOutput(null);
    try {
      const r = await api<{ test: TestResult }>("/api/server-config", {
        method: "PUT",
        json: { databaseUrl: url },
      });
      setTest(r.test);
      if (r.test.ok) toast(`تم الاتصال بنجاح (${r.test.ms ?? 0} مللي ثانية)`);
      else toast(r.test.error || "فشل الاتصال", "error");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!url.trim()) return toast("الصق رابط قاعدة البيانات الأول", "error");
    setSaving(true);
    setOutput(null);
    try {
      const r = await api<{ envFile: string; settingsFile: string; test: TestResult }>("/api/server-config", {
        method: "POST",
        json: { databaseUrl: url },
      });
      setTest(r.test);
      setOutput({ envFile: r.envFile, settingsFile: r.settingsFile });
      toast("تم الحفظ — نزّل الملفات من تحت");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const download = (name: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} اتنسخ — الصقه في Vercel`);
    } catch {
      toast("المتصفح منع النسخ — استخدم التنزيل", "error");
    }
  };

  const clearSaved = async () => {
    const ok = await confirm("هل تريد مسح رابط قاعدة البيانات المحفوظ؟", {
      title: "مسح الرابط",
      danger: true,
      okText: "مسح",
      cancelText: "إلغاء",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await api("/api/server-config", { method: "DELETE" });
      toast("تم مسح الرابط المحفوظ");
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  return (
    <Window
      title="ربط قاعدة البيانات — إعداد مبسّط"
      icon={<ServerCog className="h-8 w-8 text-[#2fb3a6]" />}
    >
      <div className="h-full w-full overflow-auto p-3">
        <div className="mx-auto max-w-[900px] space-y-4">
          {/* الحالة الحالية */}
          <div
            className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
              status?.mode === "postgres"
                ? "border-emerald-300 bg-emerald-50"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            {status?.mode === "postgres" ? (
              <Cloud className="h-8 w-8 shrink-0 text-emerald-600" />
            ) : (
              <HardDrive className="h-8 w-8 shrink-0 text-amber-600" />
            )}
            <div className="flex-1">
              <div className="text-[17px] font-black text-[#0f2942]">
                {status?.mode === "postgres"
                  ? "متصل بقاعدة بيانات سحابية"
                  : "شغّال على قاعدة البيانات المدمجة (محلي)"}
              </div>
              <div className="text-[14px] font-bold text-slate-700">
                {status?.mode === "postgres"
                  ? `الرابط الحالي: ${status.envMasked || status.savedMasked || "—"}`
                  : "البيانات محفوظة على الجهاز نفسه — اربط قاعدة سحابية لو عايز تشتغل من أكتر من جهاز"}
              </div>
            </div>
            <button type="button" className="btn h-9 px-3" onClick={() => void load()} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* الخطوات */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0f2942] text-[13px] font-black text-white">
                1
              </span>
              <div className="text-[17px] font-black text-[#0f2942]">اعمل قاعدة بيانات مجانية</div>
            </div>
            <p className="mb-2 text-[14px] font-bold leading-relaxed text-slate-700">
              سجّل في <b>Neon</b> (مجاني) واعمل مشروع جديد — بعدها انسخ <b>Connection String</b> من
              لوحة المشروع. لو مش عارف، فريق الدعم يعملهالك.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noreferrer"
                className="btn btn-blue h-9 px-3 !text-[13.5px]"
              >
                <ExternalLink className="h-4 w-4" />
                فتح موقع Neon
              </a>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="btn h-9 px-3 !text-[13.5px]"
              >
                <ExternalLink className="h-4 w-4" />
                أو Supabase
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0f2942] text-[13px] font-black text-white">
                2
              </span>
              <div className="text-[17px] font-black text-[#0f2942]">الصق الرابط هنا واختبره</div>
            </div>
            <textarea
              className="win-input min-h-[80px] w-full font-mono text-[13.5px] leading-relaxed"
              dir="ltr"
              placeholder="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTest(null);
                setOutput(null);
              }}
            />

            {test && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-[14px] font-bold ${
                  test.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                }`}
              >
                {test.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  {test.ok
                    ? `الاتصال ناجح ✅ (${test.host} — ${test.ms} مللي ثانية)`
                    : test.error}
                </span>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-blue h-10 px-4 font-black"
                onClick={() => void runTest()}
                disabled={testing}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                اختبار الاتصال
              </button>
              <button
                type="button"
                className="btn btn-green h-10 px-4 font-black"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                حفظ وتجهيز الملفات
              </button>
            </div>
          </div>

          {/* الملفات الجاهزة */}
          {output && (
            <div className="panel border-2 border-emerald-300 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-[13px] font-black text-white">
                  3
                </span>
                <div className="text-[17px] font-black text-[#0f2942]">نزّل الملفات وارفعها</div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {/* Vercel */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
                    <Cloud className="h-4 w-4 text-blue-700" />
                    لو بتستخدم نسخة الويب (Vercel)
                  </div>
                  <p className="mb-2 text-[13px] font-bold leading-relaxed text-slate-700">
                    انسخ المتغير والصقه في Vercel › Settings › Environment Variables، بعدها اعمل
                    Redeploy.
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn h-8 flex-1 px-2 !text-[13px]"
                      onClick={() => void copy(`DATABASE_URL=${url}\nDB_DRIVER=postgres`, "المتغير")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      نسخ DATABASE_URL
                    </button>
                    <button
                      type="button"
                      className="btn h-8 px-2 !text-[13px]"
                      onClick={() => download(".env", output.envFile)}
                      title="تنزيل ملف .env"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Windows */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
                    <Database className="h-4 w-4 text-emerald-700" />
                    لو بتستخدم نسخة الويندوز
                  </div>
                  <p className="mb-2 text-[13px] font-bold leading-relaxed text-slate-700">
                    نزّل <b>settings.json</b> وحطه في:
                    <br />
                    <span className="font-mono text-[10.5px] text-slate-700" dir="ltr">
                      %APPDATA%\FATORA\settings.json
                    </span>
                    <br />
                    أو استخدم شاشة الإعدادات داخل البرنامج.
                  </p>
                  <button
                    type="button"
                    className="btn h-8 w-full px-2 !text-[13px]"
                    onClick={() => download("settings.json", output.settingsFile)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    تنزيل settings.json
                  </button>
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-bold leading-relaxed text-amber-900">
                <b>مهم:</b> الرابط ده كلمة سر قاعدة بياناتك — متبعتهوش لأي حد ومتحطوش في صورة أو واتساب
                عام.
              </div>
            </div>
          )}

          {/* الرابط المحفوظ */}
          {status?.hasSaved && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[14px] font-bold text-slate-700">
                رابط محفوظ للنسخ الأخرى:{" "}
                <span className="font-mono text-[11.5px] text-slate-800">{status.savedMasked}</span>
              </div>
              <button type="button" className="btn h-8 px-2 !text-[13px]" onClick={() => void clearSaved()}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                مسح
              </button>
            </div>
          )}

          {!status?.isOwner && status && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] font-bold text-slate-700">
              الشاشة دي للمالك فقط. اطلب من صاحب المحل يظبط الرابط.
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}
