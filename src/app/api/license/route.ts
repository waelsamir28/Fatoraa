import { NextResponse } from "next/server";
import { checkLicense, normalizeDeviceId, verifyActivationCode } from "@/lib/license";
import { getCurrentLicense, getDeviceId, readLicenseData, saveLicenseData } from "@/lib/license-store";

// حالة الترخيص شخصية لكل زيارة - لا تُخزَّن مؤقتاً
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCurrentLicense());
}

export async function POST(req: Request) {
  try {
    const { activationKey, machineId } = await req.json();
    const savedId = await getDeviceId();

    // كود الجهاز: الثابت المحفوظ في قاعدة البيانات (الأساس)
    // أو الكود اللي المستخدم شايفه ونسخه من نفس الشاشة (لو اختلفا نجرّب الاتنين)
    const shownId = normalizeDeviceId(String(machineId || ""));
    const candidates = [savedId, shownId].filter((v, i, a) => v && a.indexOf(v) === i);

    const ok = candidates.some((id) => verifyActivationCode(id, String(activationKey || "")));
    if (!ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "كود التفعيل غير صحيح لهذا الجهاز. تأكد من نسخ كود الجهاز بالكامل (FAT-XXXX-XXXX) وأن الكود مولَّد له",
          machineId: savedId,
        },
        { status: 400 }
      );
    }

    const data = await readLicenseData();
    data.activationKey = String(activationKey).trim().toUpperCase();
    // تاريخ بدء الاشتراك (لحساب انتهاء السنة أو السنتين)
    data.activatedAt = new Date().toISOString();
    // نثبّت كود الجهاز اللي الكود اتحقق بيه لو مختلف
    const usedId = candidates.find((id) => verifyActivationCode(id, data.activationKey || "")) || savedId;
    await saveLicenseData(data);

    return NextResponse.json({
      ok: true,
      saved: true,
      machineId: usedId,
      status: checkLicense(data, usedId),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء التفعيل" }, { status: 500 });
  }
}
