import { sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties, products, settings } from "@/db/schema";
import { handle, readJson } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * معاينة نسخة احتياطية **قبل** الاستعادة:
 * - هل الملف صالح؟
 * - إمتى اتعمل ومن أي برنامج/إصدار؟
 * - إيه اللي جواه (عدد الأصناف/الفواتير/العملاء) وتاريخ آخر فاتورة؟
 * - مقارنة بالبيانات الحالية عشان المستخدم يعرف هو بيستبدل إيه بإيه.
 */
export function POST(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const body = await readJson(req);
    const raw = body.data ? body : (body.file as Record<string, unknown> | undefined);
    const d = (raw?.data ?? raw) as Record<string, unknown> | undefined;

    if (!d || typeof d !== "object") {
      return Response.json({ valid: false, error: "الملف لا يحتوي بيانات نسخة احتياطية" }, { status: 400 });
    }

    const arr = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]) : []);
    const prods = arr("products");
    const invs = arr("invoices");
    const prts = arr("parties");
    const items = arr("invoiceItems");

    if (!prods.length && !invs.length) {
      return Response.json(
        { valid: false, error: "الملف لا يحتوي أصنافاً أو فواتير — تأكد أنه ملف نسخة احتياطية من FATORA" },
        { status: 400 }
      );
    }

    const settingRow = arr("settings")[0] as Record<string, unknown> | undefined;
    const lastInvoice = invs.reduce<{ date: string; number: unknown } | null>((acc, r) => {
      const row = r as Record<string, unknown>;
      const dt = String(row.date ?? "");
      if (!dt) return acc;
      if (!acc || new Date(dt) > new Date(acc.date)) return { date: dt, number: row.number };
      return acc;
    }, null);

    // الحالة الحالية للمقارنة
    const [[curP], [curI], [curC]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(products),
      db.select({ n: sql<number>`count(*)::int` }).from(invoices),
      db.select({ n: sql<number>`count(*)::int` }).from(parties),
    ]);
    const [curSettings] = await db
      .select({ storeName: settings.storeName })
      .from(settings)
      .limit(1);

    const warnings: string[] = [];
    if (!items.length && invs.length) warnings.push("النسخة لا تحتوي تفاصيل أصناف الفواتير (invoiceItems)");
    if (prts.length === 0) warnings.push("لا يوجد عملاء أو موردون في النسخة");
    if (!prods.length) warnings.push("لا توجد أصناف في النسخة");

    return Response.json({
      valid: true,
      meta: {
        app: String(raw?.app ?? "FATORA"),
        version: raw?.version ?? null,
        exportedAt: raw?.exportedAt ?? null,
      },
      counts: {
        products: prods.length,
        invoices: invs.length,
        invoiceItems: items.length,
        parties: prts.length,
        payments: arr("payments").length,
        expenses: arr("expenses").length,
        cashMoves: arr("cashMoves").length,
      },
      storeName: String(settingRow?.storeName ?? ""),
      lastInvoice,
      current: {
        products: curP?.n ?? 0,
        invoices: curI?.n ?? 0,
        parties: curC?.n ?? 0,
        storeName: curSettings?.storeName ?? "",
      },
      warnings,
    });
  });
}
