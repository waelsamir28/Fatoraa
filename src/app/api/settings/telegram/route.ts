import { NextResponse } from "next/server";
import { handle, readJson, str } from "@/lib/server/http";
import { requireSession, isAuthEnabled } from "@/lib/server/session";
import {
  CONFIG_KEYS,
  deleteConfig,
  getConfig,
  getTelegramSettings,
  maskSecret,
  setConfig,
  testTelegram,
} from "@/lib/server/config-store";

export const dynamic = "force-dynamic";

/** حالة إعدادات تيليجرام (التوكن مخفي) */
export async function GET() {
  return handle(async () => {
    if (await isAuthEnabled()) await requireSession("owner", "manager");
    const tg = await getTelegramSettings();
    const cronSecret = await getConfig(CONFIG_KEYS.cronSecret);
    return {
      configured: tg.configured,
      source: tg.source,
      tokenMasked: maskSecret(tg.token),
      hasToken: Boolean(tg.token),
      chatId: tg.chatId,
      cronSecretSet: Boolean(cronSecret),
      // تعليمات للمستخدم
      help: {
        botFatherUrl: "https://t.me/BotFather",
      },
    };
  });
}

/** حفظ / اختبار / حذف */
export async function POST(req: Request) {
  return handle(async () => {
    if (await isAuthEnabled()) await requireSession("owner", "manager");
    const b = await readJson(req);
    const action = str(b.action) || "save";

    // ---------- اختبار قبل الحفظ ----------
    if (action === "test") {
      const saved = await getTelegramSettings();
      const token = str(b.token).trim() || saved.token;
      const chatId = str(b.chatId).trim() || saved.chatId;
      const result = await testTelegram(token, chatId);
      return NextResponse.json(result);
    }

    // ---------- اكتشاف معرّف المحادثة تلقائياً ----------
    if (action === "detect-chat") {
      const saved = await getTelegramSettings();
      const token = str(b.token).trim() || saved.token;
      if (!token) return NextResponse.json({ error: "أدخل توكن البوت أولاً" }, { status: 400 });
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=20`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          description?: string;
          result?: Array<{
            message?: {
              chat?: { id?: number; first_name?: string; title?: string; username?: string };
            };
            channel_post?: {
              chat?: { id?: number; first_name?: string; title?: string; username?: string };
            };
          }>;
        };
        if (!res.ok || !body.ok) {
          return NextResponse.json({ error: body.description || "تعذر قراءة التحديثات من تيليجرام" }, { status: 400 });
        }
        const chats = new Map<number, string>();
        for (const upd of body.result || []) {
          const chat = upd.message?.chat || upd.channel_post?.chat;
          if (chat?.id != null) {
            const label = chat.title || chat.first_name || chat.username || String(chat.id);
            chats.set(chat.id, label);
          }
        }
        const list = Array.from(chats.entries()).map(([id, name]) => ({ id: String(id), name }));
        return NextResponse.json({
          ok: true,
          chats: list,
          hint: list.length ? "" : "افتح المحادثة مع البوت في تيليجرام واضغط Start أو أرسل رسالة، ثم أعد المحاولة",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        return NextResponse.json(
          {
            error:
              msg === "fetch failed" || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)
                ? "تعذر الوصول إلى تيليجرام — تأكد من اتصال الإنترنت أو من صحة التوكن"
                : msg || "تعذر الاتصال بتيليجرام",
          },
          { status: 400 },
        );
      }
    }

    // ---------- حذف الإعدادات ----------
    if (action === "clear") {
      await deleteConfig(CONFIG_KEYS.telegramToken);
      await deleteConfig(CONFIG_KEYS.telegramChat);
      return { ok: true, cleared: true };
    }

    // ---------- حفظ ----------
    const token = str(b.token).trim();
    const chatId = str(b.chatId).trim();

    // لو المستخدم ترك خانة التوكن كما هي (نقاط) لا نلمسها
    const isMasked = token.includes("•") || token.includes("****");
    if (token && !isMasked) {
      if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
        return NextResponse.json(
          { error: "صيغة التوكن غير صحيحة — انسخه كاملاً من @BotFather (مثال: 123456789:AA...)" },
          { status: 400 },
        );
      }
      await setConfig(CONFIG_KEYS.telegramToken, token);
    }

    if (chatId) {
      if (!/^-?\d{5,}$/.test(chatId)) {
        return NextResponse.json(
          { error: "معرّف المحادثة يجب أن يكون أرقاماً (قد يبدأ بعلامة - للجروبات)" },
          { status: 400 },
        );
      }
      await setConfig(CONFIG_KEYS.telegramChat, chatId);
    }

    const tg = await getTelegramSettings();
    return { ok: true, configured: tg.configured, source: tg.source };
  });
}
