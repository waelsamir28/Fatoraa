"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Hash, Loader2, ScanLine, Wifi } from "lucide-react";

/**
 * صفحة الماسح على الموبايل — تُفتح من متصفح الموبايل على نفس شبكة الواي فاي:
 *   http://<ip-الكمبيوتر>:<port>/scan
 * الكاشير يضغط أيقونة الكاميرا في شاشة المبيعات ⇒ يظهر كود 6 أرقام ⇒ يُدخل هنا
 * ⇒ كل باركود تُمسحه الكاميرا يروح للفاتورة فوراً.
 */
export function PhoneScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "denied" | "error" | "insecure">("idle");
  const [last, setLast] = useState("");
  const [sent, setSent] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // كود الجلسة محفوظ في الموبايل حتى لا يُدخل كل مرة
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem("fatora.scan.code") || "";
        if (saved) setCode(saved);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const send = useCallback(
    async (barcode: string) => {
      if (!code.trim() || !barcode) return;
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim(), barcode }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setLast(barcode);
          setSent((n) => n + 1);
          setErr("");
          if (navigator.vibrate) navigator.vibrate(60);
        } else {
          setErr(data?.error || "تعذّر إرسال الباركود");
        }
      } catch {
        setErr("لا يوجد اتصال بالسيرفر — تأكد إن الموبايل على نفس شبكة الواي فاي");
      }
    },
    [code],
  );

  const start = async () => {
    setErr("");
    if (!code.trim()) {
      setErr("اكتب كود الجلسة اللي ظاهر على شاشة الكاشير");
      return;
    }
    try {
      localStorage.setItem("fatora.scan.code", code.trim());
    } catch {
      /* ignore */
    }

    // تأكيد إن الجلسة موجودة
    setBusy(true);
    try {
      const r = await fetch(`/api/scan?code=${encodeURIComponent(code.trim())}&since=0`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d?.error || "كود الجلسة غير صحيح — اطلب كود جديد من الكاشير");
        setBusy(false);
        return;
      }
    } catch {
      setErr("لا يوجد اتصال — تأكد من الشبكة");
      setBusy(false);
      return;
    }
    setLinked(true);
    setBusy(false);

    interface BDLike {
      detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
    }
    let stream: MediaStream | null = null;
    let raf = 0;
    let controls: { stop?: () => void } | null = null;
    let cooldown = 0;

    const emit = (v: string) => {
      const now = Date.now();
      if (!v || now - cooldown < 1200) return;
      cooldown = now;
      void send(v);
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("insecure");
        return;
      }
      // لازم HTTPS أو localhost — على الشبكة المحلية المتصفح قد يمنع الكاميرا
      if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        setStatus("insecure");
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("running");

      const BD = (window as unknown as { BarcodeDetector?: { new (o?: { formats?: string[] }): BDLike } }).BarcodeDetector;
      if (BD) {
        let detector: BDLike;
        try {
          detector = new BD({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"] });
        } catch {
          detector = new BD();
        }
        const loop = async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) emit(codes[0].rawValue);
          } catch {
            /* ignore */
          }
          raf = requestAnimationFrame(() => void loop());
        };
        void loop();
      } else {
        const mod = await import("@zxing/browser");
        const reader = new mod.BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current as HTMLVideoElement, (r) => {
          if (r) emit(r.getText());
        });
      }
    } catch {
      setStatus("denied");
    }
  };

  const stop = () => {
    const v = videoRef.current;
    const s = v?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setStatus("idle");
    setLinked(false);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0f2942] to-[#081a2b] p-4 text-white" dir="rtl">
      <div className="mx-auto w-full max-w-[420px] space-y-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-7 w-7 text-[#2fb3a6]" />
          <div>
            <div className="text-[17px] font-black">ماسح الموبايل</div>
            <div className="text-[11.5px] font-bold text-blue-200">امسح الباركود ويروح للفاتورة على الكاشير فوراً</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 text-slate-800 shadow-xl">
          <label className="mb-1 flex items-center gap-1.5 text-[12.5px] font-black text-[#0f2942]">
            <Hash className="h-4 w-4" /> كود الجلسة (من شاشة الكاشير)
          </label>
          <div className="flex gap-1.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              dir="ltr"
              className="w-full rounded-lg border-2 border-slate-300 px-2 py-2 text-center font-mono text-[20px] font-black tracking-[0.35em] text-[#0f2942] focus:border-[#2fb3a6] focus:outline-none"
            />
            {status === "running" ? (
              <button type="button" onClick={stop} className="shrink-0 rounded-lg bg-red-600 px-3 text-[13px] font-black text-white">
                إيقاف
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void start()}
                disabled={busy}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-[#2fa86a] to-[#1c7a4a] px-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                تشغيل
              </button>
            )}
          </div>

          {err && <div className="mt-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-[11.5px] font-bold text-red-700">{err}</div>}

          {linked && (
            <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11.5px] font-black text-emerald-700">
              <Wifi className="h-3.5 w-3.5" /> متصل بالكاشير — أرسلنا {sent} باركود
            </div>
          )}

          <div className="relative mt-2 overflow-hidden rounded-xl bg-slate-900">
            <video ref={videoRef} playsInline muted className="h-[240px] w-full object-cover" />
            {status !== "running" && (
              <div className="absolute inset-0 grid place-items-center px-4 text-center text-[12px] font-bold text-slate-300">
                {status === "denied"
                  ? "المتصفح رفض استخدام الكاميرا — اسمح بالوصول للكاميرا من إعدادات الموقع."
                  : status === "insecure"
                    ? "الكاميرا تعمل فقط على https أو localhost — استخدم نسخة الويندوز (تعمل على العنوان المحلي) أو اسمح بالكاميرا من المتصفح."
                    : "اضغط «تشغيل» واسمح بالكاميرا"}
              </div>
            )}
            {status === "running" && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[120px] w-[75%] rounded-lg border-2 border-[#2fb3a6] shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" />
              </div>
            )}
          </div>

          {last && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[12.5px] font-black text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> آخر باركود: <span className="num" dir="ltr">{last}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/10 p-3 text-[11.5px] font-bold leading-6 text-blue-100">
          <b className="text-white">خطوات الربط:</b>
          <br />1) على الكاشير افتح شاشة المبيعات واضغط أيقونة الكاميرا 📷
          <br />2) هيظهر كود من 6 أرقام — اكتبه فوق
          <br />3) اضغط «تشغيل» واسمح بالكاميرا، وابدأ تمسح
        </div>
      </div>
    </div>
  );
}
