import { asc } from "drizzle-orm";
import { db } from "@/db";
import {
  backups,
  cashMoves,
  expenses,
  installments,
  invoiceItems,
  invoices,
  parties,
  payments,
  products,
  settings,
} from "@/db/schema";

/** الحقول التي يجب تحويلها من نص إلى تاريخ عند الاستعادة */
export const DATE_FIELDS = ["createdAt", "updatedAt", "date", "openedAt", "closedAt", "paidDate", "dueDate"];

export function reviveDates(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const o = { ...(r as Record<string, unknown>) };
    for (const f of DATE_FIELDS) {
      if (typeof o[f] === "string") o[f] = new Date(o[f] as string);
    }
    return o;
  });
}

export interface BackupPayload {
  meta: {
    app: string;
    version: string;
    createdAt: string;
    counts: Record<string, number>;
    source: string;
  };
  data: Record<string, unknown[]>;
}

/** تجميع كل بيانات البرنامج في كائن واحد (للنسخ الاحتياطي) */
export async function collectBackup(source = "server"): Promise<BackupPayload> {
  const [st, pr, pa, inv, itm, pay, exp, cash, inst] = await Promise.all([
    db.select().from(settings),
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(parties).orderBy(asc(parties.id)),
    db.select().from(invoices).orderBy(asc(invoices.id)),
    db.select().from(invoiceItems).orderBy(asc(invoiceItems.id)),
    db.select().from(payments).orderBy(asc(payments.id)),
    db.select().from(expenses).orderBy(asc(expenses.id)),
    db.select().from(cashMoves).orderBy(asc(cashMoves.id)),
    db.select().from(installments).orderBy(asc(installments.id)),
  ]);

  const data = {
    settings: st,
    products: pr,
    parties: pa,
    invoices: inv,
    invoiceItems: itm,
    payments: pay,
    expenses: exp,
    cashMoves: cash,
    installments: inst,
  };

  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) counts[k] = v.length;

  return {
    meta: {
      app: "FATORA",
      version: process.env.APP_VERSION || "1.1.0",
      createdAt: new Date().toISOString(),
      counts,
      source,
    },
    data,
  };
}

/** اسم ملف النسخة بصيغة مرتبة زمنياً */
export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `fatora-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}-${p(
    now.getMinutes(),
  )}-${p(now.getSeconds())}.json`;
}

export interface SaveResult {
  ok: boolean;
  fileName: string;
  sizeBytes: number;
  counts: Record<string, number>;
  location: string;
  message: string;
}

/**
 * حفظ نسخة احتياطية:
 * - دائماً في قاعدة البيانات (سجل backups) — مفيد للمتابعة
 * - وإلى مجلد قابل للكتابة لو متاح
 * - ورفعها إلى Telegram لو مضبوط (BOT token + chat id)
 */
export async function runBackup(opts: { kind?: "auto" | "manual"; source?: string } = {}): Promise<SaveResult> {
  const payload = await collectBackup(opts.source || "server");
  const fileName = backupFileName();
  const json = JSON.stringify(payload, null, 2);
  const sizeBytes = Buffer.byteLength(json, "utf8");
  const counts = payload.meta.counts;

  const locations: string[] = ["db"];
  let message = "";

  // نسخة على القرص (لو متاح)
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");
    const dir = process.env.FATORA_BACKUP_DIR || path.join(os.tmpdir(), "fatora-backups");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), json, "utf8");
    locations.push("local");
    message = dir;
  } catch {
    /* بيئة للقراءة فقط */
  }

  // رفع تلقائي إلى Telegram (الإعدادات من قاعدة البيانات أو متغيرات البيئة)
  let token = "";
  let chatId = "";
  try {
    const { getTelegramSettings } = await import("./config-store");
    const tg = await getTelegramSettings();
    token = tg.token;
    chatId = tg.chatId;
  } catch {
    token = process.env.TELEGRAM_BOT_TOKEN || "";
    chatId = process.env.TELEGRAM_CHAT_ID || "";
  }
  if (token && chatId) {
    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", `نسخة احتياطية FATORA — ${new Date().toLocaleString("ar-EG")}\nالأصناف: ${counts.products} | الفواتير: ${counts.invoices}`);
      form.append(
        "document",
        new Blob([json], { type: "application/json" }),
        fileName,
      );
      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: form,
      });
      if (res.ok) locations.push("telegram");
      else message = `Telegram: ${res.status}`;
    } catch (e) {
      message = `Telegram: ${e instanceof Error ? e.message : "فشل الرفع"}`;
    }
  }

  const status = locations.length > 1 ? "ok" : "ok";
  try {
    await db.insert(backups).values({
      kind: opts.kind || "auto",
      location: locations.join("+"),
      fileName,
      sizeBytes,
      counts: JSON.stringify(counts),
      status,
      message,
    });
  } catch {
    /* لا نفشل العملية بسبب سجل المتابعة */
  }

  return { ok: locations.length > 0, fileName, sizeBytes, counts, location: locations.join("+"), message };
}

/** هل حان وقت النسخة اليومية؟ */
export async function isDailyBackupDue(): Promise<boolean> {
  try {
    const rows = await db
      .select({ createdAt: backups.createdAt, kind: backups.kind })
      .from(backups)
      .orderBy(asc(backups.createdAt))
      .limit(1000);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return !rows.some((r) => r.kind === "auto" && new Date(r.createdAt).getTime() >= dayStart.getTime());
  } catch {
    return false;
  }
}

/** تشغيل النسخة اليومية عند أول طلب في اليوم (لا يعطل الطلب لو فشلت) */
export async function maybeRunDailyBackup(): Promise<boolean> {
  try {
    if (!(await isDailyBackupDue())) return false;
    await runBackup({ kind: "auto", source: "daily" });
    return true;
  } catch (e) {
    console.warn("daily backup skipped", e);
    return false;
  }
}
