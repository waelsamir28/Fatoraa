import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { licenseActivations } from "@/db/schema";
import { checkLicense, normalizeDeviceId, planOfCode, verifyActivationCode, type LicenseStatus } from "@/lib/license";
import { getCurrentLicense, getDeviceId, readLicenseData, saveLicenseData } from "@/lib/license-store";
import { PLAN_BY_KEY, planStatusOf, renewalPrice, upgradePrice, canUpgrade, extraDevicesPrice } from "@/lib/license-plans";

export const dynamic = "force-dynamic";

/** سجل عمليات التفعيل */
async function logActivation(row: {
  deviceId: string;
  plan: string;
  months: number;
  price: number;
  kind: string;
  key: string;
  expiresAt: Date | null;
  extraDevices?: string[];
}) {
  try {
    await db.insert(licenseActivations).values({
      deviceId: row.deviceId,
      plan: row.plan,
      months: row.months,
      price: row.price,
      kind: row.kind,
      activationKey: row.key,
      expiresAt: row.expiresAt,
      extraDevices: JSON.stringify(row.extraDevices || []),
    });
  } catch {
    /* السجل مساعد فقط — لا يعطّل التفعيل */
  }
}

export async function GET() {
  const status = await getCurrentLicense();
  // عرض سعر التجديد المبكر داخل الواجهة
  const extra = status.plan
    ? renewalPrice(status.plan, status.planDaysLeft)
    : { price: 0, discount: 0, early: false };
  return NextResponse.json({ ...status, renewal: extra });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const activationKey = String(body.activationKey || "").trim().toUpperCase();
    const mode: string = String(body.mode || "activate"); // activate | renew | upgrade | add-device | reissue
    const savedId = await getDeviceId();

    const shownId = normalizeDeviceId(String(body.machineId || ""));
    const candidates = [savedId, shownId].filter((v, i, a) => v && a.indexOf(v) === i);

    const data = await readLicenseData();

    // ============ إضافة جهاز إضافي بنفس الكود (يتطلب كود صحيح للجهاز الحالي) ============
    if (mode === "add-device") {
      const extra = normalizeDeviceId(String(body.extraDeviceId || ""));
      if (!/^FAT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(extra)) {
        return NextResponse.json({ ok: false, error: "كود الجهاز الإضافي غير صالح (FAT-XXXX-XXXX)" }, { status: 400 });
      }
      const keyOk = candidates.some((id) => verifyActivationCode(id, activationKey));
      if (!keyOk) {
        return NextResponse.json({ ok: false, error: "أدخل كود التفعيل الحالي للتحقق أولاً" }, { status: 400 });
      }
      const list = Array.isArray(data.extraDevices) ? data.extraDevices : [];
      if (!list.includes(extra)) list.push(extra);
      data.extraDevices = list;
      await saveLicenseData(data);
      const plan = planOfCode(savedId, activationKey);
      await logActivation({
        deviceId: savedId,
        plan: plan || "",
        months: plan ? PLAN_BY_KEY[plan].months : 0,
        price: extraDevicesPrice(1),
        kind: "reissue",
        key: activationKey,
        expiresAt: null,
        extraDevices: list,
      });
      const status = await getCurrentLicense();
      return NextResponse.json({ ok: true, status, extraDevices: list });
    }

    // ============ التحقق من الكود ============
    const verifiedId = candidates.find((id) => verifyActivationCode(id, activationKey));
    if (!verifiedId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "كود التفعيل غير صحيح لهذا الجهاز. تأكد من نسخ كود الجهاز بالكامل (FAT-XXXX-XXXX) وأن الكود مولَّد له",
          machineId: savedId,
        },
        { status: 400 }
      );
    }

    const newPlan = planOfCode(verifiedId, activationKey);
    const oldPlan = data.activationKey ? planOfCode(savedId, data.activationKey) : null;
    const oldStatus = data.activationKey ? checkLicense(data, verifiedId) : null;

    // منع الترقية لخطة أقل أو مساوية
    if (mode === "upgrade" && !canUpgrade(oldPlan, newPlan || "year")) {
      return NextResponse.json(
        { ok: false, error: "الترقية تكون لخطة أعلى فقط (سنة ← سنتين ← مدى الحياة)" },
        { status: 400 }
      );
    }

    /**
     * تاريخ بداية الاشتراك:
     * - لو الاشتراك القديم **ساري** ⇒ نكمل من تاريخ انتهائه (ما يضيع حق العميل).
     * - لو منتهي أو مفيش اشتراك ⇒ نبدأ من اليوم.
     * - الترقية لخطة أعلى ⇒ تبدأ من اليوم مع رصيد أفضل.
     */
    const oldExpiry = oldStatus?.isActivated && oldStatus.expiresAt ? new Date(oldStatus.expiresAt).getTime() : 0;
    const startFrom = mode === "upgrade" || !oldExpiry || oldExpiry < Date.now() ? Date.now() : oldExpiry;
    data.activationKey = activationKey;
    data.activatedAt = new Date(startFrom).toISOString();

    const saved = await saveLicenseData(data);
    const status = await getCurrentLicense();

    const def = newPlan ? PLAN_BY_KEY[newPlan] : null;
    const isRenew = mode === "renew" || Boolean(oldPlan && oldPlan === newPlan);
    const isUpgrade = Boolean(oldPlan && newPlan && oldPlan !== newPlan);
    const price = isUpgrade && oldPlan && newPlan ? upgradePrice(oldPlan, newPlan).price : def?.price || 0;

    await logActivation({
      deviceId: verifiedId,
      plan: newPlan || "",
      months: def?.months || 0,
      price,
      kind: isUpgrade ? "upgrade" : isRenew ? "renew" : "activate",
      key: activationKey,
      expiresAt: status.expiresAt ? new Date(status.expiresAt) : null,
      extraDevices: data.extraDevices || [],
    });

    // تحذير لو الاشتراك القديم لسه ساري (دفع مكرر)
    const warning =
      oldStatus?.isActivated && !isUpgrade && def && def.months > 0
        ? `كان لديك اشتراك ساري (${oldStatus.planLabel}) — التنشيط الجديد بدأ من اليوم وتم استبدال التاريخ`
        : undefined;

    return NextResponse.json({ ok: true, saved, machineId: verifiedId, status, warning });
  } catch {
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء التفعيل" }, { status: 500 });
  }
}

/** سجل عمليات التفعيل (للمالك) */
export async function PUT() {
  try {
    const rows = await db.select().from(licenseActivations).orderBy(desc(licenseActivations.createdAt)).limit(200);
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

/** أدوات مساعدة للواجهة: أسعار التجديد والترقية */
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => ({}));
  const status = await getCurrentLicense();
  const to = String(b.to || "lifetime") as keyof typeof PLAN_BY_KEY;
  const from = status.plan;
  const renewal = from
    ? renewalPrice(from, status.planDaysLeft)
    : { price: 0, discount: 0, early: false };
  const upgrade = from && PLAN_BY_KEY[to] ? upgradePrice(from, to) : { price: 0, saving: 0 };
  return NextResponse.json({ renewal, upgrade, canUpgrade: canUpgrade(from, to) });
}

export type { LicenseStatus };
