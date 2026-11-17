import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, parties } from "@/db/schema";
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
import { audit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** إشارة تأثير كل نوع فاتورة على رصيد الطرف (نفس منطق lib/server/invoices) */
const BALANCE_SIGN: Record<string, number> = { sale: 1, purchase: 1, sale_return: -1, purchase_return: -1 };
const round2 = (n: number) => Math.round(n * 100) / 100;

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const inv = await getInvoice(parseId((await params).id));
    if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
    // رقم تليفون العميل + رصيده قبل وبعد هذه الفاتورة (تظهر في الفاتورة المطبوعة)
    let partyPhone = "";
    let partyBalanceAfter: number | null = null;
    let partyBalanceBefore: number | null = null;
    if (inv.partyId) {
      const [p] = await db
        .select({ phone: parties.phone, balance: parties.balance })
        .from(parties)
        .where(eq(parties.id, inv.partyId));
      partyPhone = p?.phone || "";
      if (p && typeof p.balance === "number") {
        // الرصيد المسجّل في الفاتورة هو المتبقي (total - paid) × إشارة نوع الفاتورة.
        // الرصيد الحالي للعميل يشمل هذه الفاتورة ⇒ نطرح تأثيرها للحصول على رصيد ما قبلها.
        const due = round2(inv.total - inv.paid);
        const effect = round2(due * (BALANCE_SIGN[inv.type] ?? 1) * (inv.deletedAt ? 0 : 1));
        partyBalanceAfter = round2(p.balance);
        partyBalanceBefore = round2(p.balance - effect);
        // فاتورة محذوفة: رصيدها غير محسوب ⇒ الاثنان نفس القيمة
        if (inv.deletedAt) partyBalanceBefore = partyBalanceAfter;
      }
    }
    return { ...inv, partyPhone, partyBalanceBefore, partyBalanceAfter };
  });
}

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const body = await readJson(req);
    const input = parseInvoiceInput(body);
    // تعديل مسودة محفوظة (بدون تأثير على المخزون)
    if (body.isDraft === true) return updateDraft(id, input);

    /**
     * مسودة حفظ تلقائي + المستخدم ضغط «حفظ الفاتورة»:
     * نحدّث بيانات المسودة أولاً ثم نعتمدها ⇒ تصبح فاتورة فعلية بنفس الرقم
     * (مفيش فاتورة مكررة ولا قفزة في الترقيم).
     */
    const [existing] = await db.select({ isDraft: invoices.isDraft }).from(invoices).where(eq(invoices.id, id));
    if (existing?.isDraft) {
      await updateDraft(id, input);
      const { getSession } = await import("@/lib/server/session");
      const session = await getSession();
      return commitDraft(id, session?.name || "");
    }

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
    const result = await deleteInvoice(id, actor, reason);
    await audit({
      action: "delete_invoice",
      entity: "invoice",
      entityId: id,
      label: `حذف فاتورة #${id}${reason ? ` — ${reason}` : ""}`,
      details: { reason, actor },
    });
    return result;
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
