"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { CameraLinkCard } from "@/components/invoice/CameraLinkCard";
import { api, errMsg } from "@/lib/client";

/**
 * ربط كاميرا الموبايل بالكاشير:
 * - الكاشير يضغط أيقونة الكاميرا ⇒ نطلب جلسة ونعرض كود 6 أرقام + عنوان الصفحة.
 * - الموبايل يفتح نفس العنوان + /scan ويكتب الكود.
 * - كل باركود يمسحه الموبايل يظهر في الفاتورة تلقائياً.
 */
export function PhoneScannerDialog({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [seq, setSeq] = useState(0);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const scanning = useRef(true);

  const open = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ code: string; seq: number }>("/api/scan", { method: "PUT" });
      setCode(r.code);
      setSeq(r.seq);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => void open(), 0);
    return () => {
      clearTimeout(id);
      scanning.current = false;
    };
  }, []);

  // نستقبل الباركود بالـ polling كل ثانية ونصف
  useEffect(() => {
    if (!code) return;
    let lastSeq = seq;
    const t = setInterval(async () => {
      if (!scanning.current) return;
      try {
        const r = await api<{ seq: number; barcode: string }>(`/api/scan?code=${code}&since=${lastSeq}`);
        if (r.seq > lastSeq) {
          lastSeq = r.seq;
          setSeq(r.seq);
          if (r.barcode) {
            setHits((h) => [r.barcode, ...h].slice(0, 6));
            onDetect(r.barcode);
            if (navigator.vibrate) navigator.vibrate(40);
            // ✅ الموبايل اتصل والكاميرا شغالة: نقفل النافذة فورًا حتى لا
            // تغطي الفاتورة. الكاميرا تفضل شغالة على الموبايل وكل باركود
            // جديد يوصل للفاتورة عبر /api/scan بدون الحاجة للنافذة.
            scanning.current = false;
            onClose();
          }
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [code, seq, onDetect]);

  return (
    <Dialog onClose={onClose} title="كاميرا الموبايل — ماسح باركود">
      <div className="w-[420px] space-y-2.5 p-1 text-[#0f2942]" dir="rtl">
        <CameraLinkCard code={code} onReload={() => void open()} />

        <div>
          <div className="mb-1 text-[12px] font-black">كود الربط</div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 rounded-xl border-2 border-[#2fb3a6] bg-[#eefaf8] py-2 text-center">
              {busy ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#0f8f82]" />
              ) : (
                <span className="num font-mono text-[30px] font-black tracking-[0.35em] text-[#0c2340]" dir="ltr">
                  {code || "------"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void open()}
              title="كود جديد"
              className="grid h-[46px] w-[46px] place-items-center rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11.5px] font-bold text-red-700">{error}</div>}

        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-black">
            <Camera className="h-4 w-4 text-[#1a6fd0]" /> الباركودات الواردة
          </div>
          {hits.length === 0 ? (
            <div className="py-1 text-center text-[11.5px] font-bold text-slate-400">في انتظار أول باركود…</div>
          ) : (
            <div className="space-y-0.5">
              {hits.map((h, i) => (
                <div key={`${h}-${i}`} className="flex items-center gap-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[11.5px] font-black text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="num" dir="ltr">{h}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0f2942] py-2 text-[13px] font-black text-white hover:bg-[#1b3f5f]"
        >
          <X className="h-4 w-4" /> إغلاق
        </button>
      </div>
    </Dialog>
  );
}
