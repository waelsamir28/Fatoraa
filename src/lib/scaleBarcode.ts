/**
 * محلل باركود الميزان الإلكتروني (EAN-13 للموازين: السوبر ماركت / العطارة / الخضروات).
 *
 * الصيغة القياسية:
 *   PP IIIII VVVVV C
 *   - PP: بادئة الميزان (20..29)
 *     - 20, 21, 23, 25, 27, 29 => القيمة وزن بالجرام (يُقسم على 1000 للكيلو)
 *     - 22, 24, 26, 28         => القيمة سعر (يُقسم على 100 للجنيه/الريال)
 *   - IIIII: كود الصنف (5 أرقام، أو 4 أرقام مع 6 أرقام للوزن حسب طول الكود)
 *   - VVVVV: الوزن أو السعر (5 أرقام)
 *   - C: رقم التحقق (Check digit)
 */
export interface ParsedScaleBarcode {
  isScale: boolean;
  itemCode: string;
  mode: "weight" | "price";
  /** الوزن بالكيلو (عند mode === "weight") أو السعر الإجمالي (عند mode === "price") */
  value: number;
  raw: string;
}

const PRICE_PREFIXES = new Set(["22", "24", "26", "28"]);

export function parseScaleBarcode(rawInput: string): ParsedScaleBarcode | null {
  const code = rawInput.replace(/\s+/g, "");
  if (!/^\d{13}$/.test(code)) return null;

  const prefix = code.slice(0, 2);
  const pNum = Number(prefix);
  if (pNum < 20 || pNum > 29) return null;

  const itemCode = code.slice(2, 7).replace(/^0+/, "") || code.slice(2, 7);
  const valRaw = Number(code.slice(7, 12));
  if (!Number.isFinite(valRaw) || valRaw <= 0) return null;

  const mode = PRICE_PREFIXES.has(prefix) ? "price" : "weight";
  const value = mode === "weight" ? valRaw / 1000 : valRaw / 100;

  return {
    isScale: true,
    itemCode,
    mode,
    value,
    raw: code,
  };
}
