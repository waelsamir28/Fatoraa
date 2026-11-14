import { desc } from "drizzle-orm";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { handle } from "@/lib/server/http";
import { requireSession, isAuthEnabled } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** سجل النسخ الاحتياطية */
export async function GET() {
  return handle(async () => {
    if (await isAuthEnabled()) await requireSession("owner", "manager");
    const items = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(50);
    return {
      items: items.map((b) => {
        let counts: Record<string, number> = {};
        try {
          counts = JSON.parse(b.counts || "{}");
        } catch {
          counts = {};
        }
        return { ...b, counts };
      }),
    };
  });
}
