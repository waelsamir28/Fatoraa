import crypto from "crypto";

/**
 * خطط اشتراك التفعيل: سنة / سنتين / مدى الحياة.
 *
 * الكود يبقى بنفس الصيغة القابلة للإدخال (XXXX-XXXX-XXXX-XXXX) لكن بيشيل معاه
 * نوع الخطة: حرف في آخر مقطع (Y = سنة، T = سنتين، L = مدى الحياة).
 * الخطة تُستنتج من الكود نفسه — فمفيش حاجة اسمها «قول للبرنامج إن ده سنوي».
 */

export type PlanKey = "year" | "tier2" | "lifetime";

export interface PlanDef {
  key: PlanKey;
  months: number; // 0 = مدى الحياة
  letter: "Y" | "T" | "L";
  price: number;
  title: string;
  subtitle: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

/** الأسعار الافتراضية (قابلة للتغيير من كود المولّد) */
export const PLAN_DEFS: PlanDef[] = [
  {
    key: "year",
    months: 12,
    letter: "Y",
    price: 1000,
    title: "اشتراك سنة",
    subtitle: "12 شهراً",
    features: [
      "كل شاشات البرنامج بدون حدود أصناف أو فواتير",
      "تحديثات مجانية خلال مدة الاشتراك",
      "دعم فني على الواتساب والهاتف",
      "نسخة احتياطية سحابية مرة كل يوم",
    ],
  },
  {
    key: "tier2",
    months: 24,
    letter: "T",
    price: 1700,
    title: "اشتراك سنتين",
    subtitle: "24 شهراً — وفّر 300 ج.م",
    badge: "الأكثر طلباً",
    highlight: true,
    features: [
      "كل مزايا اشتراك السنة",
      "خصم 15% على إجمالي السنتين",
      "نسخة احتياطية تلقائية أكثر من مرة يومياً",
      "أولوية في الدعم الفني والرد",
      "تركيب وتدريب مرة على الجهاز مجاناً",
    ],
  },
  {
    key: "lifetime",
    months: 0,
    letter: "L",
    price: 3500,
    title: "تفعيل مدى الحياة",
    subtitle: "دفعة واحدة — بلا تجديد",
    badge: "أفضل قيمة",
    features: [
      "البرنامج مفعّل للأبد على نفس الجهاز",
      "بدون أي تجديد أو رسوم سنوية",
      "كل مزايا اشتراك السنتين",
      "ترحيل البيانات على جهاز جديد مرة مجاناً",
      "دعم فني دائم",
    ],
  },
];

export const PLAN_BY_KEY: Record<PlanKey, PlanDef> = PLAN_DEFS.reduce(
  (acc, p) => ({ ...acc, [p.key]: p }),
  {} as Record<PlanKey, PlanDef>
);

export function planFromLetter(letter: string): PlanKey {
  const l = String(letter || "").toUpperCase();
  if (l === "T") return "tier2";
  if (l === "L") return "lifetime";
  return "year";
}

export function planKeyOf(code: string): PlanKey | null {
  const clean = String(code || "").trim().toUpperCase();
  const last = clean.split("-").pop() || "";
  if (!/^[A-Z0-9]{4}$/.test(last)) return null;
  return planFromLetter(last.charAt(3));
}

/** عدد الأيام المسموحة للخطة (0 = مدى الحياة) */
export function planDays(plan: PlanKey): number {
  const months = PLAN_BY_KEY[plan].months;
  return months === 0 ? 0 : Math.round(months * 30.4375);
}

export interface PlanStatus {
  plan: PlanKey | null;
  planLabel: string;
  /** تاريخ انتهاء التفعيل (null = مدى الحياة أو غير مفعّل) */
  expiresAt: string | null;
  daysLeft: number | null;
}

/** حساب حالة الخطة من تاريخ التفعيل */
export function planStatusOf(plan: PlanKey, activatedAt?: string | null): PlanStatus {
  const def = PLAN_BY_KEY[plan];
  if (def.months === 0) {
    return { plan, planLabel: def.title, expiresAt: null, daysLeft: null };
  }
  const start = activatedAt ? new Date(activatedAt).getTime() : Date.now();
  const end = new Date(start);
  end.setMonth(end.getMonth() + def.months);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  return { plan, planLabel: def.title, expiresAt: end.toISOString(), daysLeft };
}

/**
 * توليد كود التفعيل لخطة معيّنة (السيرفر أو أداة المولّد فقط — لا يُستدعى من المتصفح)
 */
export function buildPlanCode(deviceId: string, plan: PlanKey, salt: string): string {
  const clean = String(deviceId || "").trim().toUpperCase();
  const def = PLAN_BY_KEY[plan];
  const hash = crypto.createHmac("sha256", salt).update(`${clean}|${def.letter}`).digest("hex").toUpperCase();
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 15)}${def.letter}`;
}
