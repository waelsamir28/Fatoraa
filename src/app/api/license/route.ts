import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { checkLicense, verifyActivationCode, getMachineId } from "@/lib/license";

// حفظ ملف الترخيص في مجلد AppData المخفي بعيداً عن مجلد البرنامج
function getLicenseFilePath() {
  const appData = process.env.APPDATA || os.homedir();
  const dir = path.join(appData, ".fatora-sys");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "lic.dat");
}

function readLicenseData() {
  const file = getLicenseFilePath();
  const now = new Date().toISOString();
  if (!fs.existsSync(file)) {
    const initial = { firstRunAt: now, lastRunAt: now, activationKey: "" };
    fs.writeFileSync(file, JSON.stringify(initial), "utf8");
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    // تحديث آخر وقت فتح للبرنامج إذا كان التاريخ طبيعياً
    if (new Date(now).getTime() >= new Date(parsed.lastRunAt || now).getTime()) {
      parsed.lastRunAt = now;
      fs.writeFileSync(file, JSON.stringify(parsed), "utf8");
    }
    return parsed;
  } catch {
    return { firstRunAt: now, lastRunAt: now, activationKey: "" };
  }
}

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
    data.activationKey = activationKey.trim().toUpperCase();
    fs.writeFileSync(getLicenseFilePath(), JSON.stringify(data), "utf8");

    return NextResponse.json({ ok: true, status: checkLicense(data) });
  } catch {
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء التفعيل" }, { status: 500 });
  }
}
