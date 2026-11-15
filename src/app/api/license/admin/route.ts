import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { appConfig, licenseActivations } from "@/db/schema";
import { getSession } from "@/lib/server/session";
import { getConfig, setConfig } from "@/lib/server/config-store";
import { buildPlanCode } from "@/lib/license-plans";
import { normalizeDeviceId } from "@/lib/license";
import type { PlanKey } from "@/lib/license-plans";

export const dynamic = "force-dynamic";

/** المفتاح السري لتوقيع الأكواد (نفس المفتاح في lib/license) */
const SALT = "WAEL_ALGAMMAL_FATORA_2026_PRO";

async function guard() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  if (session.role !== "owner") {
    return NextResponse.json({ error: "هذه الشاشة للمالك فقط" }, { status: 403 });
  }
  return null;
}

/** كل التراخيص: الأجهزة + الخطط + الانتهاء + آخر نشاط */
export function GET() {
  return (async () => {
    const denied = await guard();
    if (denied) return denied;

    const rows = await db.select().from(licenseActivations).orderBy(desc(licenseActivations.createdAt)).limit(500);
    const configs = await db.select().from(appConfig);
    const cfgMap = new Map(configs.map((c) => [c.key, c.value]));

    // آخر عملية لكل جهاز = التراخيص الحالية
    const byDevice = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (!byDevice.has(r.deviceId)) byDevice.set(r.deviceId, r);
    }

    const devices = Array.from(byDevice.values()).map((r) => {
      const now = Date.now();
      const exp = r.expiresAt ? new Date(r.expiresAt).getTime() : null;
      return {
        deviceId: r.deviceId,
        plan: r.plan,
        planLabel: r.plan === "lifetime" ? "مدى الحياة" : r.plan === "tier2" ? "سنتين" : r.plan === "year" ? "سنة" : "—",
        price: r.price,
        kind: r.kind,
        activatedAt: r.createdAt,
        expiresAt: r.expiresAt,
        active: exp === null ? r.plan === "lifetime" : exp > now,
        daysLeft: exp === null ? null : Math.max(0, Math.ceil((exp - now) / 86_400_000)),
        extraDevices: JSON.parse(r.extraDevices || "[]") as string[],
      };
    });

    // ملخص مالي
    const revenue = rows.reduce((s, r) => s + (r.price || 0), 0);
    const active = devices.filter((d) => d.active).length;
    const expiringSoon = devices.filter((d) => d.active && d.daysLeft !== null && d.daysLeft <= 30).length;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRevenue = rows
      .filter((r) => new Date(r.createdAt).toISOString().slice(0, 7) === monthKey)
      .reduce((s, r) => s + (r.price || 0), 0);

    const renewRequest = cfgMap.get("license.renew_request") || "";

    return NextResponse.json({
      devices,
      ops: rows,
      stats: { revenue, monthRevenue, active, expiringSoon, total: devices.length },
      renewRequest: renewRequest ? JSON.parse(renewRequest) : null,
    });
  })();
}

/** توليد كود لأي جهاز (للمالك فقط) — يظهر في اللوحة */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const b = await req.json().catch(() => ({}));
  const deviceId = normalizeDeviceId(String(b.deviceId || ""));
  const plan = String(b.plan || "year") as PlanKey;
  if (!/^FAT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(deviceId)) {
    return NextResponse.json({ error: "كود جهاز غير صالح (FAT-XXXX-XXXX)" }, { status: 400 });
  }
  const code = buildPlanCode(deviceId, plan, SALT);
  return NextResponse.json({ ok: true, deviceId, plan, code });
}

/** حفظ مفتاح التوقيع من الإعدادات (اختياري) */
export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const salt = String(b.salt || "").trim();
  if (salt.length < 16) {
    return NextResponse.json({ error: "المفتاح قصير جداً (16 حرفاً على الأقل)" }, { status: 400 });
  }
  await setConfig("license.salt", salt);
  return NextResponse.json({ ok: true });
}

/** المفتاح الحالي (يُقرأ من قاعدة البيانات إن وُجد) */
export async function PATCH() {
  const denied = await guard();
  if (denied) return denied;
  const salt = (await getConfig("license.salt").catch(() => "")) || "";
  return NextResponse.json({ hasCustomSalt: Boolean(salt) });
}
