import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";

/**
 * وضع قاعدة البيانات:
 * - الافتراضي (نسخة الويب): PostgreSQL عبر DATABASE_URL
 * - DB_DRIVER=pglite (نسخة الويندوز exe): قاعدة بيانات PostgreSQL مدمجة داخل البرنامج
 *   تُحفظ في المجلد PGLITE_DATA_DIR ولا تحتاج تثبيت أي شيء.
 */
export const isPglite = process.env.DB_DRIVER === "pglite";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __aljamalPglite?: PGlite;
};

let database: NodePgDatabase;
let rawExec: (query: string) => Promise<unknown>;

if (isPglite) {
  // نسخة واحدة فقط لكل عملية (فتح نفس المجلد مرتين يفسد البيانات)
  const client = globalForDb.__aljamalPglite ?? new PGlite(process.env.PGLITE_DATA_DIR || "./aljamal-data");
  globalForDb.__aljamalPglite = client;
  database = drizzlePglite(client) as unknown as NodePgDatabase;
  rawExec = (query) => client.exec(query);
} else {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) console.warn("DATABASE_URL is not set");
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
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
