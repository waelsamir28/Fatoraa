import { getConfig, setConfig } from "@/lib/server/config-store";

/**
 * رسالة الشكر/العرض التلقائية بعد أول فاتورة للعميل (أو أول فاتورة في اليوم).
 * تُخزَّن نصوصها في app_config حتى يعدّلها صاحب المحل من الإعدادات.
 */

const KEY = "thanks.message";

export interface ThanksTemplate {
  enabled: boolean;
  /** نص الرسالة — {name} اسم العميل، {store} اسم المحل، {total} قيمة الفاتورة */
  text: string;
  /** نسبة خصم العرض التالي */
  offerPercent: number;
  /** عدد أيام صلاحية العرض */
  offerDays: number;
  /** إظهار رابط تقييم/شكر */
  showThanks: boolean;
}

export const DEFAULT_THANKS: ThanksTemplate = {
  enabled: true,
  showThanks: true,
  offerPercent: 5,
  offerDays: 15,
  text:
    "أهلاً {name} 🌟\nشكراً لتعاملك مع {store}\nتم تسجيل فاتورتك بقيمة {total} ج.م بنجاح.\n\n🎁 عرض خاص لأول تعامل: خصم {offer}% على فاتورتك القادمة خلال {days} يوم.\nاذكر الرسالة عند الشراء للاستفادة بالعرض.\n\nالدعم الفني: 01222355769",
};

export async function getThanksTemplate(): Promise<ThanksTemplate> {
  try {
    const raw = await getConfig(KEY);
    if (!raw) return DEFAULT_THANKS;
    const p = JSON.parse(raw) as Partial<ThanksTemplate>;
    return {
      enabled: p.enabled !== false,
      showThanks: p.showThanks !== false,
      offerPercent: clamp(Number(p.offerPercent), 0, 100, DEFAULT_THANKS.offerPercent),
      offerDays: clamp(Number(p.offerDays), 0, 365, DEFAULT_THANKS.offerDays),
      text: typeof p.text === "string" && p.text.trim() ? p.text : DEFAULT_THANKS.text,
    };
  } catch {
    return DEFAULT_THANKS;
  }
}

export async function saveThanksTemplate(patch: Partial<ThanksTemplate>): Promise<ThanksTemplate> {
  const cur = await getThanksTemplate();
  const next: ThanksTemplate = {
    enabled: patch.enabled ?? cur.enabled,
    showThanks: patch.showThanks ?? cur.showThanks,
    offerPercent: clamp(Number(patch.offerPercent ?? cur.offerPercent), 0, 100, cur.offerPercent),
    offerDays: clamp(Number(patch.offerDays ?? cur.offerDays), 0, 365, cur.offerDays),
    text: (patch.text ?? cur.text).slice(0, 1200),
  };
  await setConfig(KEY, JSON.stringify(next));
  return next;
}

function clamp(v: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/** تعبئة المتغيرات في نص الرسالة */
export function renderThanks(
  tpl: ThanksTemplate,
  vars: { name: string; store: string; total: string; isFirst: boolean },
): string {
  const body = vars.isFirst
    ? tpl.text
    : tpl.text.split("\n").filter((l) => !/خصم|عرض/.test(l)).join("\n");
  return body
    .replaceAll("{name}", vars.name || "عميلنا العزيز")
    .replaceAll("{store}", vars.store || "المحل")
    .replaceAll("{total}", vars.total)
    .replaceAll("{offer}", String(tpl.offerPercent))
    .replaceAll("{days}", String(tpl.offerDays))
    .trim();
}

/** رابط واتساب جاهز لإرسال رسالة الشكر */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const withCc = digits.startsWith("0") ? `2${digits}` : digits;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`;
}
