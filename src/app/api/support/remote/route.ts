import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

const SUPPORT_KEY = process.env.SUPPORT_API_KEY || "FATORA-SUPPORT-2026";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-support-key",
  };
}

function authorized(req: Request) {
  return (req.headers.get("x-support-key") || "") === SUPPORT_KEY;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "مفتاح الدعم الفني غير صحيح" }, { status: 401, headers: corsHeaders() });
  }
  let devices: unknown[] = [];
  let licenses: unknown[] = [];
  try {
    const r = await db.execute(sql`SELECT * FROM devices ORDER BY id DESC LIMIT 100`);
    devices = (r as { rows?: unknown[] }).rows ?? [];
  } catch { /* ignore */ }
  try {
    const r = await db.execute(sql`SELECT * FROM licenses ORDER BY id DESC LIMIT 100`);
    licenses = (r as { rows?: unknown[] }).rows ?? [];
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true, devices, licenses }, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "مفتاح الدعم الفني غير صحيح" }, { status: 401, headers: corsHeaders() });
  }
  try {
    const body = await req.json();
    const action = String(body?.action || "");
    const id = Number(body?.id || 0);
    const active = Boolean(body?.active);

    if (action === "toggle-device" && id > 0) {
      await db.execute(sql`UPDATE devices SET active = ${active} WHERE id = ${id}`);
      return NextResponse.json({ ok: true }, { headers: corsHeaders() });
    }
    if (action === "toggle-license" && id > 0) {
      await db.execute(sql`UPDATE licenses SET active = ${active} WHERE id = ${id}`);
      return NextResponse.json({ ok: true }, { headers: corsHeaders() });
    }
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400, headers: corsHeaders() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ في التنفيذ" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
