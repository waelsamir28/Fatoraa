import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";

/**
 * إعدادات تشغيل حساسة تُحفظ في قاعدة البيانات (تتجاوز متغيرات البيئة).
 * الأولوية: قاعدة البيانات → متغير البيئة.
 */

export const CONFIG_KEYS = {
  telegramToken: "telegram.bot_token",
  telegramChat: "telegram.chat_id",
  cronSecret: "cron.secret",
  invoiceSecret: "invoice.public_secret",
} as const;

export async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(appConfig).where(inArray(appConfig.key, [key])).limit(1);
    const value = rows[0]?.value;
    if (value && value.trim()) return value.trim();
  } catch {
    /* الجدول قد لا يكون موجوداً بعد */
  }
  const envMap: Record<string, string | undefined> = {
    [CONFIG_KEYS.telegramToken]: process.env.TELEGRAM_BOT_TOKEN,
    [CONFIG_KEYS.telegramChat]: process.env.TELEGRAM_CHAT_ID,
    [CONFIG_KEYS.cronSecret]: process.env.CRON_SECRET,
    [CONFIG_KEYS.invoiceSecret]: process.env.INVOICE_PUBLIC_SECRET,
  };
  return (envMap[key] || "").trim();
}

export async function setConfig(key: string, value: string): Promise<void> {
  const v = String(value ?? "").trim();
  await db
    .insert(appConfig)
    .values({ key, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appConfig.key, set: { value: v, updatedAt: new Date() } });
}

export async function deleteConfig(key: string): Promise<void> {
  try {
    await db.delete(appConfig).where(inArray(appConfig.key, [key]));
  } catch {
    /* ignore */
  }
}

/** إخفاء معظم التوكن عند عرضه */
export function maskSecret(value: string): string {
  if (!value) return "";
  const v = String(value);
  if (v.length <= 8) return "••••••••";
  return `${v.slice(0, 4)}••••••••${v.slice(-4)}`;
}

export interface TelegramSettings {
  token: string;
  chatId: string;
  configured: boolean;
  source: "database" | "env" | "none";
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const token = await getConfig(CONFIG_KEYS.telegramToken);
  const chatId = await getConfig(CONFIG_KEYS.telegramChat);
  const dbHas = await hasDbRow(CONFIG_KEYS.telegramToken);
  return {
    token,
    chatId,
    configured: Boolean(token && chatId),
    source: dbHas ? "database" : token ? "env" : "none",
  };
}

async function hasDbRow(key: string): Promise<boolean> {
  try {
    const rows = await db.select().from(appConfig).where(inArray(appConfig.key, [key])).limit(1);
    return Boolean(rows[0]?.value?.trim());
  } catch {
    return false;
  }
}

/** اختبار إرسال رسالة حقيقية إلى تيليجرام */
export async function testTelegram(token: string, chatId: string): Promise<{ ok: boolean; error?: string; botName?: string }> {
  if (!token || !chatId) return { ok: false, error: "أدخل التوكن ومعرّف المحادثة" };
  try {
    const text =
      `✅ تم ربط برنامج FATORA بتيليجرام بنجاح\n` +
      `التاريخ: ${new Date().toLocaleString("ar-EG")}\n` +
      `ستصلك هنا نسخة احتياطية تلقائية كل يوم.`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: unknown;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.description || `فشل الإرسال (${res.status})` };
    }

    // اسم البوت للعرض
    let botName = "";
    try {
      const info = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());
      botName = (info as { result?: { username?: string } })?.result?.username || "";
    } catch {
      /* ignore */
    }
    return { ok: true, botName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return {
      ok: false,
      error:
        msg === "fetch failed" || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)
          ? "تعذر الوصول إلى تيليجرام — تأكد من اتصال الإنترنت، أو أن السيرفر يسمح بالاتصال بـ api.telegram.org"
          : msg || "تعذر الاتصال بتيليجرام",
    };
  }
}
