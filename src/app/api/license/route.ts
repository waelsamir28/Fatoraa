import { NextResponse } from "next/server";
import { checkLicense, verifyActivationCode, getMachineId } from "@/lib/license";
import { readLicenseData, writeLicenseData } from "@/lib/license-store";

// حالة الترخيص شخصية لكل زيارة - لا تُخزَّن مؤقتاً
export const dynamic = "force-dynamic";

export async function GET() {
  const data = readLicenseData();
  const status = checkLicense(data);
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  try {
    const { activationKey } = await req.json();
    const machineId = getMachineId();

    if (!verifyActivationCode(machineId, activationKey)) {
      return NextResponse.json(
        { ok: false, error: "كود التفعيل غير صحيح لهذا الجهاز" },
        { status: 400 }
      );
    }

    const data = readLicenseData();
    data.activationKey = String(activationKey).trim().toUpperCase();
    const saved = writeLicenseData(data);

    return NextResponse.json({ ok: true, saved, status: checkLicense(data) });
  } catch {
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء التفعيل" }, { status: 500 });
  }
}
