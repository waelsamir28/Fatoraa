import { handle, readJson, str } from "@/lib/server/http";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { settings } from "@/db/schema";
import { CONFIG_KEYS, getConfig, setConfig } from "@/lib/server/config-store";
import {
  buildLowStockMessage,
  buildLowStockWhatsApp,
  getLowStockItems,
  getOutOfStockItems,
  sendTelegram,
  type LowStockItem,
} from "@/lib/server/notify";

export const dynamic = "force-dynamic";

/** مفتاح تذكّر آخر تاريخ أُرسل فيه تنبيه النواقص */
const LAST_SENT_KEY = "alerts.lowStock.lastSent";

async function storeName(): Promise<string> {
  const [s] = await db.select({ name: settings.storeName }).from(settings).where(eq(settings.id, 1));
  return s?.name || "FATORA";
}

/** GET: حالة التنبيه + قائمة النواقص (تُستخدم في شريط التنبيه أعلى البرنامج) */
export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const daily = u.searchParams.get("daily") === "1";

    const [low, out] = await Promise.all([getLowStockItems(), getOutOfStockItems()]);
    const name = await storeName();

    // إرسال التنبيه اليومي التلقائي (مرة واحدة في اليوم فقط)
    if (daily) {
      const today = new Date().toISOString().slice(0, 10);
      const lastSent = await getConfig(LAST_SENT_KEY);
      const configured = Boolean(
        (await getConfig(CONFIG_KEYS.telegramToken)) && (await getConfig(CONFIG_KEYS.telegramChat)),
      );
      if (configured && lastSent !== today && (low.length || out.length)) {
        const res = await sendTelegram(buildLowStockMessage(name, low, out));
        if (res.ok) await setConfig(LAST_SENT_KEY, today);
        return {
          sent: res.ok,
          error: res.ok ? "" : res.error,
          items: mergeItems(low, out),
          text: buildLowStockWhatsApp(name, low, out),
          lastSent: res.ok ? today : lastSent,
        };
      }
      return {
        sent: false,
        error: configured ? "" : "تيليجرام غير مربوط — التنبيه اليومي يحتاج ربط البوت",
        items: mergeItems(low, out),
        text: buildLowStockWhatsApp(name, low, out),
        lastSent,
      };
    }

    return {
      items: mergeItems(low, out),
      count: low.length,
      outOfStock: out.length,
      text: buildLowStockWhatsApp(name, low, out),
    };
  });
}

function mergeItems(low: LowStockItem[], out: LowStockItem[]) {
  const map = new Map<number, LowStockItem>();
  for (const p of out) map.set(p.id, p);
  for (const p of low) if (!map.has(p.id)) map.set(p.id, p);
  return [...map.values()].sort((a, b) => a.stock - b.stock);
}

/** POST: إرسال فوري على تيليجرام أو إرجاع نص واتساب جاهز */
export async function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const action = str(b.action) || "telegram";
    const [low, out] = await Promise.all([getLowStockItems(), getOutOfStockItems()]);
    const name = await storeName();

    if (action === "whatsapp" || action === "text") {
      return { ok: true, text: buildLowStockWhatsApp(name, low, out), count: low.length };
    }

    if (!low.length && !out.length) {
      return { ok: false, error: "لا توجد أصناف ناقصة حالياً — كل الأصناف فوق الحد الأدنى ✓" };
    }

    const res = await sendTelegram(buildLowStockMessage(name, low, out));
    if (res.ok) await setConfig(LAST_SENT_KEY, new Date().toISOString().slice(0, 10));
    return { ok: res.ok, error: res.error || "", count: low.length, outOfStock: out.length };
  });
}
