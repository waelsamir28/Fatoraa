import { runBackup } from "@/lib/server/backup";

/**
 * حماية من الحذف الجماعي (أو أي عملية تدميرية):
 * نأخذ نسخة احتياطية تلقائية قبل التنفيذ، ولا نكمل لو فشلت النسخة.
 *
 * مثال:
 *   const guard = await backupBeforeDestructive("حذف مجموعة أصناف: كتب");
 *   if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 500 });
 */

export interface DestructiveGuard {
  ok: boolean;
  /** مسار/مكان النسخة */
  where?: string;
  fileName?: string;
  error?: string;
  at: string;
}

export async function backupBeforeDestructive(reason: string): Promise<DestructiveGuard> {
  const at = new Date().toISOString();
  try {
    const r = await runBackup({ kind: "auto", source: `حذف جماعي — ${reason}` });
    if (!r.ok) {
      return {
        ok: false,
        at,
        error: "تعذّر إنشاء نسخة احتياطية قبل الحذف — تم إلغاء العملية لحماية بياناتك.",
      };
    }
    return { ok: true, where: r.location, fileName: r.fileName, at };
  } catch (e) {
    return {
      ok: false,
      at,
      error: `تعذّر إنشاء نسخة احتياطية قبل الحذف: ${e instanceof Error ? e.message : "خطأ غير معروف"} — تم إلغاء العملية.`,
    };
  }
}
