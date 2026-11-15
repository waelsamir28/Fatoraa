"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

/**
 * مسح باركود/QR بكاميرا الموبايل أو اللابتوب.
 * ترتيب المحاولات:
 *  1) BarcodeDetector (Chrome/Edge/أندرويد — أسرع)
 *  2) ZXing (سفاري/آيفون/فايرفوكس)
 *  3) إدخال يدوي أو قارئ USB
 */
export function CameraScan({
  onDetect,
  onClose,
  title = "مسح باركود",
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"init" | "running" | "denied" | "error" | "insecure">("init");
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState("");

  interface BarcodeDetectorLike {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    let zxingControls: { stop?: () => void } | null = null;
    let done = false;

    const emit = (code: string) => {
      if (done || !code) return;
      done = true;
      onDetect(code);
    };

    const startZxing = async () => {
      const mod = await import("@zxing/browser");
      const reader = new mod.BrowserMultiFormatReader();
      setStatus("running");
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current as HTMLVideoElement, (result) => {
        if (result) emit(result.getText());
      });
      zxingControls = controls as unknown as { stop?: () => void };
    };

    const start = async () => {
      const secure = typeof window !== "undefined" && (window.isSecureContext || location.hostname === "localhost");
      if (!navigator.mediaDevices?.getUserMedia || !secure) {
        setStatus("insecure");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("running");

        const BD = (window as unknown as { BarcodeDetector?: { new (o?: { formats?: string[] }): BarcodeDetectorLike } })
          .BarcodeDetector;
        if (BD) {
          const wanted = ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "itf", "codabar", "code_93", "upc_a", "upc_e"];
          let detector: BarcodeDetectorLike;
          try {
            detector = new BD({ formats: wanted });
          } catch {
            detector = new BD();
          }
          const loop = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const v = codes?.[0]?.rawValue;
              if (v) {
                emit(v);
                return;
              }
            } catch {
              /* تجاهل إطار فاشل */
            }
            raf = requestAnimationFrame(() => void loop());
          };
          void loop();
          return;
        }
        await startZxing();
      } catch (e) {
        const name = (e as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else {
          setStatus("error");
          setMsg(String((e as { message?: string })?.message || e));
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try {
        zxingControls?.stop?.();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-black/70 p-3" dir="rtl">
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0f2942] px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-[15px] font-black">
            <Camera className="h-5 w-5" />
            {title}
          </span>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black">
          <video ref={videoRef} className="h-[300px] w-full object-cover" playsInline muted />
          {status === "running" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-[150px] w-[260px] rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
          {status === "init" && (
            <div className="absolute inset-0 grid place-items-center text-white">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          )}
          {status !== "running" && status !== "init" && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 p-4 text-center text-[12.5px] font-bold text-white">
              {status === "denied"
                ? "تم رفض إذن الكاميرا — اسمح بالوصول للكاميرا من إعدادات المتصفح ثم أعد المحاولة."
                : status === "insecure"
                  ? "الكاميرا تحتاج اتصالاً آمناً (https) أو فتح البرنامج على localhost."
                  : `تعذر تشغيل الكاميرا${msg ? `: ${msg}` : ""}`}
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <div className="flex gap-2">
            <input
              autoFocus
              className="win-input h-10 flex-1 text-center text-[15px] font-black"
              placeholder="أو اكتب رقم الفاتورة / الباركود واضغط Enter"
              value={manual}
              onChange={(e) => setManual(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manual) onDetect(manual);
              }}
            />
            <button
              type="button"
              className="btn btn-blue h-10 px-4 font-black"
              disabled={!manual}
              onClick={() => manual && onDetect(manual)}
            >
              تأكيد
            </button>
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            وجّه الكاميرا إلى باركود الفاتورة الأصلية — سيتم تحميل أصنافها تلقائياً.
          </p>
        </div>
      </div>
    </div>
  );
}
