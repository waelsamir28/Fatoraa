import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { setConfig } from "@/lib/server/config-store";
import { getCurrentLicense, getDeviceId } from "@/lib/license-store";
import { PLAN_BY_KEY, type PlanKey } from "@/lib/license-plans";

export const dynamic = "force-dynamic";

/**
 * طلب تجديد الاشتراك.
 * يسجّل الطلب فقط (بدون تفعيل) — الدعم الفني يتحقق من الدفع ويصدر كود التجديد.
 * لو العميل دفع وأدخل كود التجديد بنفسه، يروح لـ POST /api/license.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const plan = String(b.plan || "") as PlanKey;
  if (!PLAN_BY_KEY[plan]) {
    return NextResponse.json({ error: "خطة غير معروفة" }, { status: 400 });
  }

  const [status, deviceId] = await Promise.all([getCurrentLicense(), getDeviceId()]);
  const request = {
    plan,
    planLabel: PLAN_BY_KEY[plan].title,
    price: PLAN_BY_KEY[plan].price,
    deviceId,
    currentPlan: status.plan,
    currentExpiresAt: status.expiresAt,
    at: new Date().toISOString(),
    user: session.name,
  };

  // نحفظ آخر طلب تجديد ليظهر للمالك في لوحة التراخيص
  await setConfig("license.renew_request", JSON.stringify(request));

  return NextResponse.json({ ok: true, request });
}
