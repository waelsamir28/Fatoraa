import QRCode from "qrcode";
import crypto from "crypto";

/**
 * توليد رمز QR لفاتورة:
 * - يحتوي رابط الفاتورة العامة (يفتحها العميل من الموبايل)
 * - ويُوقّع بـ HMAC حتى لا يستطيع أحد تخمين أرقام فواتير الآخرين
 */

const SECRET =
  process.env.INVOICE_PUBLIC_SECRET ||
  process.env.AUTH_SECRET ||
  "FATORA_PUBLIC_INVOICE_SECRET";

/** توقيع قصير للفاتورة (8 حروف) */
export function invoiceToken(invoiceId: number, number: number): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`inv:${invoiceId}:${number}`)
    .digest("hex")
    .slice(0, 10);
}

export function verifyInvoiceToken(invoiceId: number, number: number, token: string): boolean {
  const expected = invoiceToken(invoiceId, number);
  if (!token || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** رابط الفاتورة العامة */
export function publicInvoiceUrl(baseUrl: string, invoiceId: number, number: number): string {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}/i/${invoiceId}-${number}-${invoiceToken(invoiceId, number)}`;
}

/** بيانات QR كصورة (data URL) */
export async function qrDataUrl(text: string, size = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b2350", light: "#ffffff" },
  });
}

/** QR كـ SVG جاهز للطباعة بجودة عالية */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b2350", light: "#ffffff" },
  });
}
