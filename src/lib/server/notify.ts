import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getConfig, CONFIG_KEYS } from "./config-store";

/** إرسال رسالة نصية إلى تيليجرام */
export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getConfig(CONFIG_KEYS.telegramToken);
    const chatId = await getConfig(CONFIG_KEYS.telegramChat);
    if (!token || !chatId) return { ok: false, error: "تيليجرام غير مربوط — اضبط التوكن ومعرّف المحادثة من الإعدادات" };
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !body.ok) return { ok: false, error: body.description || `فشل الإرسال (${res.status})` };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return {
      ok: false,
      error:
        msg === "fetch failed" || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)
          ? "تعذر الوصول إلى تيليجرام — تأكد من اتصال الإنترنت"
          : msg || "تعذر الاتصال بتيليجرام",
    };
  }
}

export interface LowStockItem {
  id: number;
  code: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  salePrice: number;
  costPrice: number;
}

/** الأصناف التي وصلت أو نزلت عن الحد الأدنى (رصيد <= حد أدنى > 0) */
export async function getLowStockItems(): Promise<LowStockItem[]> {
  const rows = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      stock: products.stock,
      minStock: products.minStock,
      unit: products.unit,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
    })
    .from(products)
    .where(and(lte(products.stock, products.minStock), sql`${products.minStock} > 0`))
    .orderBy(asc(products.stock), asc(products.name))
    .limit(200);
  return rows.map((r) => ({ ...r, stock: Number(r.stock), minStock: Number(r.minStock) }));
}

/** الأصناف الناقصة تماماً (رصيد <= 0) */
export async function getOutOfStockItems(): Promise<LowStockItem[]> {
  const rows = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      stock: products.stock,
      minStock: products.minStock,
      unit: products.unit,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
    })
    .from(products)
    .where(lte(products.stock, 0))
    .orderBy(asc(products.name))
    .limit(200);
  return rows.map((r) => ({ ...r, stock: Number(r.stock), minStock: Number(r.minStock) }));
}

const money = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** تجهيز نص تنبيه النواقص لتنسيق HTML في تيليجرام */
export function buildLowStockMessage(storeName: string, items: LowStockItem[], outOfStock: LowStockItem[]) {
  const lines: string[] = [];
  lines.push(`🔔 <b>تنبيه الأصناف الناقصة</b>`);
  lines.push(`🏪 ${storeName || "FATORA"}`);
  lines.push(`📅 ${new Date().toLocaleString("ar-EG")}`);
  lines.push("");
  if (outOfStock.length) {
    lines.push(`❌ <b>نفدت تماماً (${outOfStock.length})</b>`);
    for (const p of outOfStock.slice(0, 15)) {
      lines.push(`• ${p.name} — الكود ${p.code}`);
    }
    if (outOfStock.length > 15) lines.push(`... و${outOfStock.length - 15} صنفاً آخر`);
    lines.push("");
  }
  const low = items.filter((p) => p.stock > 0);
  if (low.length) {
    lines.push(`⚠️ <b>تحت الحد الأدنى (${low.length})</b>`);
    for (const p of low.slice(0, 20)) {
      lines.push(`• ${p.name} — الرصيد ${p.stock} ${p.unit} (الحد ${p.minStock})`);
    }
    if (low.length > 20) lines.push(`... و${low.length - 20} صنفاً آخر`);
    lines.push("");
  }
  const cost = items.reduce((s, p) => s + Math.max(0, p.minStock - p.stock) * p.costPrice, 0);
  lines.push(`💰 تكلفة إعادة التعبئة التقديرية: <b>${money(cost)} ج.م</b>`);
  lines.push(`🖥 من شاشة «النواقص» في البرنامج تفاصيل أكثر.`);
  return lines.join("\n");
}

/** نص واتساب عادي (بدون وسوم) لنسخه وإرساله يدوياً */
export function buildLowStockWhatsApp(storeName: string, items: LowStockItem[], outOfStock: LowStockItem[]) {
  const lines: string[] = [];
  lines.push(`🔔 تنبيه الأصناف الناقصة — ${storeName || "FATORA"}`);
  lines.push(new Date().toLocaleString("ar-EG"));
  lines.push("");
  if (outOfStock.length) {
    lines.push(`❌ نفدت تماماً (${outOfStock.length}):`);
    for (const p of outOfStock.slice(0, 20)) lines.push(`• ${p.name} (كود ${p.code})`);
    lines.push("");
  }
  const low = items.filter((p) => p.stock > 0);
  if (low.length) {
    lines.push(`⚠️ تحت الحد الأدنى (${low.length}):`);
    for (const p of low.slice(0, 25)) lines.push(`• ${p.name} — رصيد ${p.stock} ${p.unit} / حد ${p.minStock}`);
    lines.push("");
  }
  const cost = items.reduce((s, p) => s + Math.max(0, p.minStock - p.stock) * p.costPrice, 0);
  lines.push(`💰 تكلفة إعادة التعبئة: ${money(cost)} ج.م`);
  return lines.join("\n");
}
