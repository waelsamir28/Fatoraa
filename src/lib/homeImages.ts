/**
 * صور الشاشة الرئيسية: البانر + خلفية أزرار القائمة.
 * المقاسات الموصى بها بالبكسل وبالسنتيمتر (عند 96 و300 نقطة/بوصة).
 */

export interface ImageSpec {
  key: "banner" | "rail";
  label: string;
  hint: string;
  /** المقاس الموصى به */
  width: number;
  height: number;
  /** الحد الأدنى المقبول */
  minWidth: number;
  /** أقصى حجم ملف مقبول (كيلوبايت) */
  maxKb: number;
}

export const BANNER_SPEC: ImageSpec = {
  key: "banner",
  label: "صورة البانر (الترويسة)",
  hint: "الشريط العلوي اللي فيه اللوجو وصورة المستخدم",
  width: 1600,
  height: 260,
  minWidth: 1200,
  maxKb: 900,
};

export const RAIL_SPEC: ImageSpec = {
  key: "rail",
  label: "خلفية أزرار القائمة اليمين",
  hint: "الشريط الجانبي اللي فيه أزرار الرئيسية والمستخدمين…",
  width: 420,
  height: 1000,
  minWidth: 320,
  maxKb: 900,
};

export const IMAGE_SPECS = [BANNER_SPEC, RAIL_SPEC];

/** تحويل بكسل إلى سنتيمتر عند كثافة معيّنة */
export function pxToCm(px: number, dpi = 96): number {
  return (px / dpi) * 2.54;
}

/** نص المقاس: «1600 × 260 بكسل — 42.3 × 6.9 سم (بمقاس الطباعة)» */
export function sizeText(w: number, h: number): string {
  const cw = pxToCm(w, 96).toFixed(1);
  const ch = pxToCm(h, 96).toFixed(1);
  const pw = pxToCm(w, 300).toFixed(1);
  const ph = pxToCm(h, 300).toFixed(1);
  return `${w} × ${h} بكسل — ${cw} × ${ch} سم (على الشاشة) · ${pw} × ${ph} سم (بمقاس الطباعة 300dpi)`;
}

/** نسبة العرض/الطول المطلوبة */
export function ratioText(w: number, h: number): string {
  const g = gcd(w, h);
  return `${w / g} : ${h / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** قراءة أبعاد صورة من data URL */
export function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("تعذّر قراءة أبعاد الصورة"));
    img.src = dataUrl;
  });
}

/** تصغير صورة (data URL) إلى عرض أقصى مع الحفاظ على النسبة — JPEG */
export function resizeDataUrl(dataUrl: string, maxWidth: number, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => reject(new Error("تعذّر معالجة الصورة"));
    img.src = dataUrl;
  });
}
