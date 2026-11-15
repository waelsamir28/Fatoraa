import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getSession } from "@/lib/server/session";
import { hasPermission } from "@/lib/server/auth";
import { ACTION_LABELS } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** سجل المراجعة — للمالك أو من لديه صلاحية view_audit */
export async function GET(req: Request) {
  const session = await getSession();
  if (!hasPermission(session, "view_audit")) {
    return NextResponse.json({ error: "ليس لديك صلاحية لعرض سجل المراجعة" }, { status: 403 });
  }

  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  const entity = u.searchParams.get("entity") || "";
  const action = u.searchParams.get("action") || "";
  const days = Number(u.searchParams.get("days") || 30);
  const limit = Math.min(500, Math.max(20, Number(u.searchParams.get("limit") || 200)));

  const from = new Date(Date.now() - Math.max(1, days) * 86_400_000);
  const conds = [gte(auditLog.createdAt, from)];
  if (entity) conds.push(eq(auditLog.entity, entity));
  if (action) conds.push(eq(auditLog.action, action));
  if (q) {
    const like = `%${q}%`;
    const any = or(ilike(auditLog.label, like), ilike(auditLog.userName, like));
    if (any) conds.push(any);
  }

  const items = await db
    .select()
    .from(auditLog)
    .where(and(...conds))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(and(...conds));

  return NextResponse.json({
    items,
    total: count?.n || 0,
    actions: Object.entries(ACTION_LABELS).map(([key, label]) => ({ key, label })),
    entities: [
      { key: "invoice", label: "الفواتير" },
      { key: "product", label: "الأصناف" },
      { key: "party", label: "الحسابات" },
      { key: "user", label: "المستخدمون" },
      { key: "settings", label: "الإعدادات" },
      { key: "shift", label: "الورديات" },
      { key: "backup", label: "النسخ الاحتياطي" },
      { key: "license", label: "الترخيص" },
    ],
  });
}
