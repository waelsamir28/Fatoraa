"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { api } from "@/lib/client";

/**
 * بطاقة «رابط كاميرا الموبايل»:
 * - تعرض الرابط الجاهز للفتح من الموبايل + كود الجلسة.
 * - تشرح بالعربي من فين الرابط ده بيتجيب تلقائياً.
 */
export function CameraLinkCard({
  code,
  onReload,
  compact,
}: {
  code?: string;
  onReload?: () => void;
  compact?: boolean;
}) {
  const [info, setInfo] = useState<{
    url: string;
    ip: string;
    port: string;
    secure: boolean;
    httpsHost: string;
    hint: string;
    cameraWarning: boolean;
  } | null>(null);
  const [copied, setCopied] = useState<"url" | "code" | "">("");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setInfo(await api("/api/scan/link"));
    } catch {
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const copy = async (value: string, kind: "url" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* ignore */
    }
  };

  const url = info?.url || "";

  return (
    <div className="rounded-xl border-2 border-[#8fd3c9] bg-[#f3fdfa] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-black text-[#0c5648]">
          <Smartphone className="h-4 w-4" />
          رابط كاميرا الموبايل
        </span>
        <button
          type="button"
          onClick={() => {
            void load();
            onReload?.();
          }}
          className="flex items-center gap-1 rounded border border-[#8fd3c9] bg-white px-1.5 py-0.5 text-[10.5px] font-black text-[#0c5648] hover:bg-[#e6faf4]"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          تحديث
        </button>
      </div>

      {/* الرابط */}
      <div className="flex items-center gap-1.5">
        <input
          readOnly
          value={busy ? "جارٍ التحضير…" : url || "لا يوجد رابط — الجهاز غير متصل بشبكة"}
          dir="ltr"
          onClick={(e) => e.currentTarget.select()}
          className="w-full select-all rounded-lg border border-[#8fd3c9] bg-white px-2 py-1.5 text-center font-mono text-[12.5px] font-black text-[#0f2942]"
        />
        {url && (
          <>
            <button
              type="button"
              onClick={() => void copy(url, "url")}
              title="نسخ الرابط"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0f2942] text-white hover:bg-[#1b3f5f]"
            >
              {copied === "url" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="فتح صفحة الماسح (للتجربة من نفس الجهاز)"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#8fd3c9] bg-white text-[#0c5648] hover:bg-[#e6faf4]"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        )}
      </div>

      {/* الكود */}
      {code && (
        <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[#c9d8ee] bg-white px-2 py-1">
          <span className="text-[11px] font-bold text-slate-500">كود الربط</span>
          <span className="flex items-center gap-1.5">
            <b className="num font-mono text-[16px] font-black tracking-[0.3em] text-[#0f2942]" dir="ltr">
              {code}
            </b>
            <button
              type="button"
              onClick={() => void copy(code, "code")}
              className="grid h-6 w-6 place-items-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {copied === "code" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </span>
        </div>
      )}

      {/* من فين الرابط */}
      {!compact && (
        <div className="mt-1.5 space-y-1 rounded-lg bg-white/70 px-2 py-1.5 text-[10.5px] font-bold leading-4 text-slate-600">
          <div className="flex items-center gap-1 text-[#0c5648]">
            <Wifi className="h-3.5 w-3.5" />
            <b>الرابط بيتجيب أوتوماتيك — مش بتكتبه بنفسك:</b>
          </div>
          <div>
            • <b>نسخة الويندوز:</b> البرنامج بيقرأ عنوان الجهاز على الواي فاي (`192.168.x.x`) ويحط مكانه الرابط جاهز.
          </div>
          <div>
            • <b>نسخة السحابة (Vercel):</b> الرابط بيكون `https://اسم-الموقع/scan` — وده الأفضل للكاميرا.
          </div>
          <div>• لو الـ IP اتغير (راوتر جديد/إعادة تشغيل): اضغط «تحديث» وهيتحدث لوحده.</div>
          {info?.secure ? (
            <div className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> رابط آمن HTTPS — الكاميرا هتشتغل على كل الموبايلات.
            </div>
          ) : (
            <div className="flex items-start gap-1 text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                الرابط ده محلي (http). بعض متصفحات الموبايل (كروم/سفاري) بتمنع الكاميرا على الروابط غير الآمنة — لو حصل
                كده استخدم رابط السحابة (HTTPS) أو اكتب الباركود يدوي.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
