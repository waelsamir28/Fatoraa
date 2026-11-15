import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { handle, readJson, str } from "@/lib/server/http";
import { getConfig, setConfig, deleteConfig } from "@/lib/server/config-store";

export const dynamic = "force-dynamic";

export const DB_CONFIG_KEY = "server.database_url";

/** إخفاء كلمة المرور عند عرض الرابط */
export function maskDatabaseUrl(v: string): string {
  if (!v) return "";
  try {
    const u = new URL(v);
    const auth = u.password ? `${u.username}:••••••••` : u.username;
    return `${u.protocol}//${auth ? `${auth}@` : ""}${u.host}${u.pathname}`;
  } catch {
    return v.length > 20 ? `${v.slice(0, 12)}••••••••` : "••••••••";
  }
}

/** فحص صحة رابط قاعدة البيانات: الصيغة + الاتصال الفعلي */
async function testDatabaseUrl(url: string): Promise<{ ok: boolean; error?: string; host?: string; ms?: number; version?: string }> {
  const clean = url.trim();
  if (!/^postgres(ql)?:\/\//i.test(clean)) {
    return { ok: false, error: "الرابط لازم يبدأ بـ postgresql:// — انسخه من Neon أو Supabase كامل." };
  }
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { ok: false, error: "الرابط غير صالح — تأكد إنك نسخته كامل بدون مسافات." };
  }
  const started = Date.now();
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: clean,
    ssl: /localhost|127\.0\.0\.1/.test(clean) ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
  });
  try {
    await client.connect();
    const r = await client.query("select version() as v");
    const ms = Date.now() - started;
    return { ok: true, host: parsed.host, ms, version: String(r.rows[0]?.v ?? "").slice(0, 40) };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = err?.code ?? "";
    let error = "تعذّر الاتصال بقاعدة البيانات";
    if (code === "ENOTFOUND" || /getaddrinfo/.test(err?.message ?? "")) {
      error = "اسم الخادم غير موجود — تأكد إنك نسخت الرابط كامل وصحيح.";
    } else if (code === "28P01" || /password authentication failed/i.test(err?.message ?? "")) {
      error = "كلمة المرور غير صحيحة — انسخ الرابط من لوحة Neon من جديد.";
    } else if (code === "3D000") {
      error = "قاعدة البيانات غير موجودة على الخادم.";
    } else if (code === "ECONNREFUSED") {
      error = "الخادم رفض الاتصال — جرّب تصحّح رابط قاعدة البيانات.";
    } else if (/timeout|ETIMEDOUT/i.test(err?.message ?? "")) {
      error = "انتهت مهلة الاتصال — النت بطيء أو الرابط غلط.";
    } else if (err?.message) {
      error = err.message.slice(0, 160);
    }
    return { ok: false, error };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** حالة الاتصال الحالية + الرابط المحفوظ */
export function GET() {
  return handle(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }
    const saved = (await getConfig(DB_CONFIG_KEY).catch(() => "")) || "";
    const envUrl = process.env.DATABASE_URL || "";
    const driver = process.env.DB_DRIVER || (envUrl ? "postgres" : "pglite");
    const localChoice = ((await getConfig("db.local.mode").catch(() => "")) || "") === "1";
    const dataDir = process.env.PGLITE_DATA_DIR || (process.env.VERCEL ? "/tmp/fatora-data" : "./aljamal-data");
    const embedded = driver === "pglite";
    // حجم ملف قاعدة البيانات المدمجة (لو موجود)
    let dbSizeBytes = 0;
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const walk = (dir: string): number => {
        let total = 0;
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, f.name);
          if (f.isDirectory()) total += walk(full);
          else if (f.isFile()) total += fs.statSync(full).size;
        }
        return total;
      };
      if (fs.existsSync(dataDir)) dbSizeBytes = walk(dataDir);
    } catch {
      /* بيئة للقراءة فقط */
    }
    return NextResponse.json({
      hasSaved: Boolean(saved),
      savedMasked: maskDatabaseUrl(saved),
      envConfigured: Boolean(envUrl),
      envMasked: maskDatabaseUrl(envUrl),
      mode: embedded ? "embedded" : "postgres",
      activeMode: embedded ? "local" : "cloud",
      localChoice,
      dataDir,
      dbSizeBytes,
      canSwitchLocal: process.platform !== "win32" || !process.env.VERCEL,
      serverless: Boolean(process.env.VERCEL),
      isOwner: session.role === "owner",
    });
  });
}

/**
 * حفظ الرابط + إرجاع ملفات جاهزة.
 * الرابط يُحفظ في قاعدة البيانات الحالية كمرجع، مع إمكانية تنزيل:
 *  - .env لـ Vercel
 *  - settings.json لنسخة الويندوز
 */
export function POST(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "الإعداد ده للمالك فقط" }, { status: 403 });
    }

    const b = await readJson(req);

    // ===== اختيار قاعدة بيانات محلية (مدمجة — تعمل بدون إنترنت ولا تحتاج سيرفر) =====
    if (str(b.mode) === "local") {
      await setConfig("db.local.mode", "1").catch(() => undefined);
      await deleteConfig(DB_CONFIG_KEY).catch(() => undefined);
      const winnerJson = JSON.stringify(
        {
          databaseUrl: "",
          note: "البرنامج يستخدم قاعدة البيانات المحلية المدمجة (PGlite) — لا حاجة لأي سيرفر.",
          mode: "local",
          savedAt: new Date().toISOString(),
        },
        null,
        2,
      );
      const newEnv = [
        "# قاعدة بيانات محلية مدمجة (بدون إنترنت) — FATORA",
        "DB_DRIVER=pglite",
        "# اختياري: مكان تخزين البيانات",
        "# PGLITE_DATA_DIR=C:\\FATORA\\data",
        "",
      ].join("\n");
      return NextResponse.json({
        ok: true,
        mode: "local",
        message: "تم اختيار قاعدة البيانات المحلية المدمجة — البرنامج يعمل بدون إنترنت وبلا أي سيرفر.",
        envFile: newEnv,
        settingsFile: winnerJson,
        steps: [
          "نسخة الويندوز: لا تحتاج أي إعداد — البرنامج بيستخدم القاعدة المدمجة تلقائياً.",
          "نسخة الويب/سيرفر: ضع DB_DRIVER=pglite في .env (أو امسح DATABASE_URL) ثم أعد التشغيل.",
          "البيانات تُحفظ في مجلد DATA على الجهاز — اعمل نسخة احتياطية دورية من شاشة النسخ الاحتياطي.",
        ],
      });
    }

    // إلغاء الوضع المحلي لو المستخدم اختار السحابة
    await deleteConfig("db.local.mode").catch(() => undefined);

    const url = str(b.databaseUrl).trim();
    if (!url) {
      return NextResponse.json({ error: "الصق رابط قاعدة البيانات الأول" }, { status: 400 });
    }

    const test = await testDatabaseUrl(url);
    if (!test.ok) {
      return NextResponse.json({ error: test.error || "تعذّر الاتصال", test }, { status: 400 });
    }

    // نحفظه كمرجع للنسخ الأخرى (ويندوز / نسخة ويب جديدة)
    try {
      await setConfig(DB_CONFIG_KEY, url);
    } catch {
      /* لو القاعدة الحالية مدمجة ولا تقبل الكتابة نكمل — الملفات هتتنزّل برضه */
    }

    const envFile = [
      `# رابط قاعدة البيانات — ضعه في Vercel › Settings › Environment Variables`,
      `DATABASE_URL=${url}`,
      `DB_DRIVER=postgres`,
      `AUTH_SECRET=${str(b.authSecret) || "غيّره-بسلسلة-عشوائية-طويلة"}`,
      "",
    ].join("\n");

    const settingsFile = JSON.stringify({ databaseUrl: url }, null, 2);

    return NextResponse.json({
      ok: true,
      test,
      envFile,
      settingsFile,
      savedMasked: maskDatabaseUrl(url),
    });
  });
}

/** مسح الرابط المحفوظ */
export function DELETE() {
  return handle(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }
    await deleteConfig(DB_CONFIG_KEY).catch(() => undefined);
    return NextResponse.json({ ok: true });
  });
}

/** اختبار رابط بدون حفظ */
export function PUT(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }
    const b = await readJson(req);
    const test = await testDatabaseUrl(str(b.databaseUrl));
    return NextResponse.json({ test });
  });
}
