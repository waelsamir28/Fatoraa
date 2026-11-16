import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { handle } from "@/lib/server/http";
import { parseType } from "@/lib/server/invoices";
import { getCurrentLicense } from "@/lib/license-store";
import { commitDraft, parseInvoiceInput, saveDraft, updateDraft } from "@/lib/server/invoices";

export const dynamic = "force-dynamic";

/**
 * الحفظ التلقائي للفاتورة (Auto-save Draft)
 *
 *  POST { ...بيانات الفاتورة, draftId?: number }
 *   - لو مفيش draftId: ننشئ مسودة جديدة ونرجّع id.
 *   - لو فيه draftId: نحدّث نفس المسودة (بدون تكرار).
 *
 * ملاحظات مهمة:
 *  - المسودة لا تخصم من المخزون ولا تحرّك أرصدة، ولا تُحسب على حدود النسخة التجريبية.
 *  - تتحول لفاتورة فعلية فقط عندما يضغط الكاشير «حفظ الفاتورة».
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await (async () => {
      try {
        return (await req.json()) as Record<string, unknown>;
      } catch {
        return {};
      }
    })();

    const type = parseType(body.type);
    const input = parseInvoiceInput({ ...body, type });
    const draftId = Number(body.draftId) || 0;

    // مفيش أصناف ⇒ مفيش مسودة (نتجاهل بهدوء)
    if (!input.items?.length) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no-items" });
    }

    const license = await getCurrentLicense();
    if (license.isExpired) {
      return NextResponse.json({ ok: false, reason: "expired" }, { status: 402 });
    }

    try {
      if (draftId > 0) {
        const inv = await updateDraft(draftId, input);
        return NextResponse.json({ ok: true, id: inv?.id ?? draftId, number: inv?.number ?? 0 });
      }
      const inv = await saveDraft(input);
      return NextResponse.json({ ok: true, id: inv?.id ?? 0, number: inv?.number ?? 0 });
    } catch {
      // الحفظ التلقائي مساعد فقط — لا نزعج الكاشير بأخطاء
      return NextResponse.json({ ok: false, reason: "failed" });
    }
  });
}

/**
 * «طباعة آخر فاتورة»:
 *  GET ?type=sale ⇒ آخر فاتورة معتمدة (بدون المسودات والمحذوفة)
 */
export async function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const type = parseType(u.searchParams.get("type"));
    const [row] = await db
      .select({ id: invoices.id, number: invoices.number, partyName: invoices.partyName, total: invoices.total, date: invoices.date })
      .from(invoices)
      .where(and(eq(invoices.type, type), eq(invoices.isDraft, false), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.number))
      .limit(1);
    if (!row) return NextResponse.json({ ok: false, error: "لا توجد فواتير محفوظة بعد" });
    return NextResponse.json({ ok: true, invoice: row, printUrl: `/print/${row.id}?auto=1` });
  });
}

/**
 * اعتماد مسودة تلقائية (نادراً ما تحتاجه الواجهة — الحفظ العادي يكفي)
 *  PUT { id } ⇒ يحوّل المسودة لفاتورة فعلية
 */
export async function PUT(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Number(body.id) || 0;
    if (!id) return NextResponse.json({ ok: false, error: "id مطلوب" }, { status: 400 });
    const inv = await commitDraft(id, String(body.userName || ""));
    return NextResponse.json({ ok: true, invoice: inv });
  });
}
