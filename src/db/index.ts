import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import path from "path";
import os from "os";

/**
 * وضع قاعدة البيانات:
 * - PostgreSQL عبر DATABASE_URL (السحابة / Vercel / نسخة سطح المكتب المتصلة)
 * - DB_DRIVER=pglite: قاعدة بيانات PostgreSQL مدمجة داخل البرنامج (تعمل بدون إنترنت)
 * - لو لم يوجد DATABASE_URL نستخدم pglite تلقائياً حتى لا يفشل التشغيل
 */
const requestedDriver = process.env.DB_DRIVER;
const databaseUrl = process.env.DATABASE_URL?.trim();

export const isPglite =
  requestedDriver === "pglite" || (requestedDriver !== "postgres" && !databaseUrl);

/** مجلد بيانات pglite: قابل للكتابة دائماً (Vercel للقراءة فقط فيما عدا /tmp) */
function pgliteDir(): string {
  if (process.env.PGLITE_DATA_DIR) return process.env.PGLITE_DATA_DIR;
  if (process.env.VERCEL || process.platform !== "win32") {
    return path.join(os.tmpdir(), "fatora-data");
  }
  return "./aljamal-data";
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __aljamalPglite?: PGlite;
};

let database: NodePgDatabase;
let rawExec: (query: string) => Promise<unknown>;

if (isPglite) {
  // نسخة واحدة فقط لكل عملية (فتح نفس المجلد مرتين يفسد البيانات)
  const client = globalForDb.__aljamalPglite ?? new PGlite(pgliteDir());
  globalForDb.__aljamalPglite = client;
  database = drizzlePglite(client) as unknown as NodePgDatabase;
  rawExec = (query) => client.exec(query);
} else {
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl && !/localhost|127\.0\.0\.1/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  database = drizzlePg(pool);
  rawExec = (query) => pool.query(query);
}

export const db = database;
/** تنفيذ SQL خام متعدد الأوامر (لإنشاء الجداول) */
export const execRaw = rawExec;
