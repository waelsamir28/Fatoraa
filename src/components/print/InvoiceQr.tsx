"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

/**
 * رمز QR للفاتورة — يحوّل العميل إلى صفحة الفاتورة الإلكترونية.
 * يُجلب من الخادم (فيه توقيع HMAC) مرة واحدة ويُعرض كصورة SVG.
 */
export function InvoiceQr({
  invoiceId,
  number,
  size = 88,
  thermal,
  label = "امسح للمراجعة",
}: {
  invoiceId: number;
  number: number;
  size?: number;
  thermal?: boolean;
  label?: string;
}) {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const [needsCloud, setNeedsCloud] = useState(false);

  useEffect(() => {
    let alive = true;
    setSvg("");
    setFailed(false);
    fetch(`/api/invoices/${invoiceId}/qr`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.status === 409 && body?.needsCloudUrl) {
          setNeedsCloud(true);
          throw new Error("needs-cloud");
        }
        if (!r.ok) throw new Error("failed");
        return body;
      })
      .then((d: { svg?: string }) => {
        if (alive && d.svg) setSvg(d.svg);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [invoiceId, number]);

  if (needsCloud) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ width: size }}>
        <QrCode className="h-7 w-7 text-amber-500" />
        <span className="mt-0.5 text-[8.5px] font-bold leading-tight text-amber-700">
          اضبط رابط السحابة لعرض QR
        </span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ width: size }}>
        <QrCode className="h-6 w-6 text-slate-400" />
        <span className="text-[9px] font-bold text-slate-400">QR غير متاح</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      {svg ? (
        <div
          className="overflow-hidden rounded bg-white"
          style={{ width: size, height: size }}
          // SVG موقّع يأتي من خادمنا
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div
          className="animate-pulse rounded bg-slate-200"
          style={{ width: size, height: size }}
          aria-label="جارٍ تحميل رمز QR"
        />
      )}
      <span
        className={`mt-0.5 text-center font-bold leading-tight ${
          thermal ? "text-[7.5px] text-slate-600" : "text-[9px] text-slate-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
