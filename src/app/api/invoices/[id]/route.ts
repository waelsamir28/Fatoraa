import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parties } from "@/db/schema";
import { HttpError, handle, parseId, readJson, str } from "@/lib/server/http";
import {
  commitDraft,
  deleteInvoice,
  getInvoice,
  parseInvoiceInput,
  restoreInvoice,
  updateDraft,
  updateInvoice,
} from "@/lib/server/invoices";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const inv = await getInvoice(parseId((await params).id));
    if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
    // رقم تليفون العميل — تحتاجه شاشة مشاركة الفاتورة على واتساب
    let partyPhone = "";
    if (inv.partyId) {
      const [p] = await db.select({ phone: parties.phone }).from(parties).where(eq(parties.id, inv.partyId));
      partyPhone = p?.phone || "";
    }
    return { ...inv, partyPhone };
  });
}

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const body = await readJson(req);
    const input = parseInvoiceInput(body);
    // تعديل مسودة محفوظة (بدون تأثير على المخزون)
    if (body.isDraft === true) return updateDraft(id, input);
    return updateInvoice(id, input);
  });
}

/**
 * حذف آمن: نطلب سبب الحذف ونسجّل مين حذفها.
 * الجسم اختياري — لو مفيش سبب نكتب «حذف بدون سبب مذكور».
 */
export function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    let reason = "";
    try {
      const body = await readJson(req);
      reason = str(body.reason);
    } catch {
      /* الجسم فارغ — مسموح */
    }
    const session = await getSession();
    const actor = session?.name || session?.username || "";
    return deleteInvoice(id, actor, reason);
  });
}

/** استرجاع فاتورة محذوفة */
export function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const body = await readJson(req).catch(() => ({}) as Record<string, unknown>);
    const action = str(body.action);
    // اعتماد مسودة → تصبح فاتورة فعلية وتُطبَّق تأثيراتها
    if (action === "commit") {
      const session = await getSession();
      return commitDraft(id, session?.name || "");
    }
    if (action !== "restore") {
      throw new HttpError(400, "إجراء غير صالح");
    }
    await restoreInvoice(id);
    return NextResponse.json({ ok: true });
  });
}
