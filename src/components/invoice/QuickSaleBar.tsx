"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShoppingBasket,
  X,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { useDesktop } from "@/components/win/DesktopProvider";
import { fmt } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * شريط البيع السريع (بضغطة واحدة):
 * - اكتب/امسح الباركود ثم Enter → فاتورة نقدية فورية بصنف واحد
 * - أو امسح بكاميرا الموبايل
 * - الكمية الافتراضية 1 ويمكن تغييرها قبل البيع
 */
export function QuickSaleBar() {
  const { toast } = useDesktop();
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("1");
  const [product, setProduct] = useState<Product | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [chat, setChat] = useState(false);
  const [cam, setCam] = useState(false);
  const [suggest, setSuggest] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const flash = useRef<HTMLSpanElement>(null);

  /** البحث عن الصنف بالباركود (أو بالاسم لو مفيش باركود مطابق) */
  const lookup = useCallback(async (raw: string) => {
    const key = raw.trim();
    if (!key) return null;
    setLooking(true);
    setErr("");
    try {
      const q = encodeURIComponent(key);
      const byCode = await api<{ items: Product[] }>(`/api/products?code=${q}&limit=1`);
      if (byCode.items.length) {
        setProduct(byCode.items[0]);
        return byCode.items[0];
      }
      const byName = await api<{ items: Product[] }>(`/api/products?q=${q}&limit=6`);
      if (!byName.items.length) {
        setProduct(null);
        setErr(`لا يوجد صنف بالباركود/الاسم: ${key}`);
        return null;
      }
      if (byName.items.length === 1) {
        setProduct(byName.items[0]);
        return byName.items[0];
      }
      setProduct(null);
      setSuggest(byName.items);
      return null;
    } catch (e) {
      setErr(errMsg(e));
      return null;
    } finally {
      setLooking(false);
    }
  }, []);

  /** البيع الفوري */
  const sell = async (p: Product | null = product, q = Number(qty) || 1) => {
    if (!p) {
      setErr("امسح الباركود أو اكتبه أولاً");
      inputRef.current?.focus();
      return;
    }
    if (!q || q <= 0) {
      setErr("الكمية غير صحيحة");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const price = p.salePrice;
      const total = Math.round(price * q * 100) / 100;
      const inv = await api<{ id: number; number: number }>("/api/invoices", {
        method: "POST",
        json: {
          type: "sale",
          partyId: null,
          partyName: "عميل نقدي",
          date: new Date().toISOString(),
          paymentType: "cash",
          paymentMethod: "cash",
          priceLevel: "retail",
          extraDiscount: 0,
          taxRate: 0,
          paid: total,
          notes: "فاتورة سريعة",
          items: [
            {
              productId: p.id,
              productName: p.name,
              unit: p.unit,
              qty: q,
              price,
              discount: 0,
            },
          ],
        },
      });
      toast(`تم البيع: ${p.name} × ${q} = ${fmt(total)} ج.م — فاتورة #${inv.number}`, "success");
      setCode("");
      setQty("1");
      setProduct(null);
      setSuggest([]);
      inputRef.current?.focus();
    } catch (e) {
      toast(errMsg(e), "error");
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="quick-sale" dir="rtl">
        <div className="quick-sale__label">
          <ShoppingBasket className="h-4 w-4" />
          بيع سريع
        </div>

        <div className="relative flex-1">
          <Barcode className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2fb3a6]" />
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErr("");
              if (!e.target.value) {
                setProduct(null);
                setSuggest([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (product) void sell();
                else void lookup(code).then((p) => (p ? void sell(p, Number(qty) || 1) : undefined));
              }
            }}
            placeholder="امسح الباركود أو اكتبه ثم Enter — بيع فوري بضغطة واحدة"
            className="h-9 w-full rounded-md border border-[#c9d8ee] bg-white pe-8 ps-2 text-[13px] font-black text-[#0f2942] outline-none focus:border-[#2fb3a6] focus:ring-2 focus:ring-[#2fb3a6]/25"
          />
          <span ref={flash} className="hidden" />
        </div>

        <input
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void sell();
          }}
          inputMode="decimal"
          className="num h-9 w-14 rounded-md border border-[#c9d8ee] bg-white text-center text-[13px] font-black text-[#0f2942] outline-none focus:border-[#2fb3a6]"
          title="الكمية"
        />

        <button
          type="button"
          onClick={() => void lookup(code)}
          className="btn h-9 px-2.5 text-[12px] font-black"
          title="بحث عن الصنف"
        >
          {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setCam((v) => !v)}
          className={`btn h-9 px-2.5 text-[12px] font-black ${cam ? "btn-red" : "btn-blue"}`}
          title="مسح بالكاميرا"
        >
          <Camera className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => void sell()}
          disabled={saving || !product}
          className="btn btn-green h-9 px-3 text-[13px] font-black"
          title="بيع فوري — Enter"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          بيع
        </button>

        <button
          type="button"
          onClick={() => setChat((v) => !v)}
          className="btn h-9 px-2 text-[12px] font-black"
          title="أصناف كثيرة (فاتورة كاملة)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* نتيجة البحث / رسالة الخطأ */}
      {(product || err || suggest.length > 0) && (
        <div className="quick-sale__result" dir="rtl">
          {err && <span className="font-black text-red-600">{err}</span>}
          {product && (
            <>
              <span className="font-black text-[#0f2942]">{product.name}</span>
              <span className="text-slate-500">— {fmt(product.salePrice)} ج.م / {product.unit}</span>
              <span className={`num rounded px-1.5 text-[11px] font-black ${product.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                المخزون: {product.stock}
              </span>
            </>
          )}
          {suggest.length > 0 && !product && (
            <span className="flex flex-wrap items-center gap-1">
              <span className="text-slate-500">أصناف مقترحة:</span>
              {suggest.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setProduct(s);
                    setSuggest([]);
                  }}
                  className="rounded border border-[#c9d8ee] bg-white px-1.5 py-0.5 text-[11.5px] font-black text-[#0f2942] hover:bg-[#eef4fa]"
                >
                  {s.name}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {cam && <CameraScanner onDetect={(c) => { setCam(false); setCode(c); void lookup(c); }} onClose={() => setCam(false)} />}
      {chat && <NewInvoiceHint onClose={() => setChat(false)} />}
    </>
  );
}

/** تلميح: الفاتورة الكاملة تُفتح من زر «فاتورة مبيعات» */
function NewInvoiceHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="quick-sale__result justify-between" dir="rtl">
      <span className="font-bold text-[#0f2942]">
        للأصناف المتعددة استخدم شاشة <b>فاتورة مبيعات</b> (F6) — البيع السريع للأصناف الفردية النقدية فقط.
      </span>
      <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** مسح الباركود بكاميرا الموبايل — BarcodeDetector مع بديل يدوي */
function CameraScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"init" | "running" | "unsupported" | "denied" | "error">("init");
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState("");

  interface BarcodeDetectorLike {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
  }
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const start = async () => {
      try {
        const BD = (window as unknown as {
          BarcodeDetector?: {
            new (opts?: { formats?: string[] }): BarcodeDetectorLike;
            getSupportedFormats?: () => Promise<string[]>;
          };
        }).BarcodeDetector;
        if (!BD) {
          setStatus("unsupported");
          setMsg("متصفحك لا يدعم قراءة الباركود تلقائياً — استخدم قارئ الباركود أو اكتب الرقم يدوياً بالأسفل.");
          return;
        }
        try {
          const formats: string[] = BD.getSupportedFormats ? await BD.getSupportedFormats() : [];
          detectorRef.current = new BD({
            formats: formats.filter((f) => ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "qr_code"].includes(f)),
          });
        } catch {
          detectorRef.current = new BD();
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => undefined);
        setStatus("running");

        let last = "";
        let same = 0;
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2 && detectorRef.current) {
              const codes = await detectorRef.current.detect(videoRef.current);
              if (codes?.length) {
                const val = String(codes[0].rawValue || "");
                if (val) {
                  if (val === last) same++;
                  else {
                    same = 0;
                    last = val;
                  }
                  if (same >= 1) {
                    onDetect(val);
                    return;
                  }
                }
              }
            }
          } catch {
            /* إطار غير صالح — نكمل */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch (e) {
        const name = (e as { name?: string }).name || "";
        setStatus(name === "NotAllowedError" ? "denied" : "error");
        setMsg(
          name === "NotAllowedError"
            ? "تم رفض إذن الكاميرا. اسمح بالوصول للكاميرا من إعدادات المتصفح ثم أعد المحاولة."
            : "تعذّر تشغيل الكاميرا. تأكد أن الموقع يعمل على HTTPS وأن الكاميرا غير مستخدمة في تطبيق آخر.",
        );
      }
    };
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div
      className="fixed inset-0 z-[210] grid place-items-center bg-black/70 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-xl bg-[#0f2942] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="flex items-center gap-1.5 text-[13.5px] font-black text-white">
            <Camera className="h-4 w-4 text-[#7fe3d8]" />
            مسح الباركود بكاميرا الموبايل
          </span>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded text-white/70 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {/* إطار التوجيه */}
          {status === "running" && (
            <>
              <div className="pointer-events-none absolute inset-[18%_] rounded-lg border-2 border-[#7fe3d8] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-[#2fb3a6]/80" />
            </>
          )}
          {status !== "running" && (
            <div className="absolute inset-0 grid place-items-center bg-[#0b1f33]/90 p-4 text-center">
              <div className="space-y-2">
                <CameraOff className="mx-auto h-8 w-8 text-white/50" />
                <p className="text-[12.5px] font-bold leading-relaxed text-white/85">{msg || "جاري تشغيل الكاميرا…"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 p-3">
          <div className="flex items-center gap-1.5">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manual.trim()) onDetect(manual.trim());
              }}
              placeholder="أو اكتب رقم الباركود يدوياً"
              className="num h-9 flex-1 rounded-md border border-white/25 bg-white/10 px-2 text-[13px] font-black text-white placeholder:text-white/40 focus:border-[#2fb3a6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => manual.trim() && onDetect(manual.trim())}
              className="btn btn-green h-9 px-3 text-[12.5px] font-black"
            >
              استخدام
            </button>
          </div>
          <p className="text-[10.5px] font-bold leading-relaxed text-white/55">
            يعمل على الموبايل (أندرويد/آيفون) ومتصفح Chrome. القراءة تلقائية عند تثبيت الكاميرا على الباركود.
          </p>
        </div>
      </div>
    </div>
  );
}
