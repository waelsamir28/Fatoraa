import { and, desc, eq, getTableColumns, gte, ilike, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices } from "@/db/schema";
import { getCurrentLicense } from "@/lib/license-store";
import { handle, num, parseDate, readJson, str } from "@/lib/server/http";
import { commitDraft, createInvoice, parseInvoiceInput, parseType, saveDraft, updateDraft } from "@/lib/server/invoices";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const type = parseType(u.searchParams.get("type"));
    const from = parseDate(u.searchParams.get("from"));
    const to = parseDate(u.searchParams.get("to"));
    const q = str(u.searchParams.get("q"));
    const partyId = num(u.searchParams.get("partyId"), 0);
    const limit = Math.min(2000, Math.max(1, num(u.searchParams.get("limit"), 500)));

    // الفواتير المحذوفة (soft delete) لا تظهر في القوائم الافتراضية
    const conds: SQL[] = [eq(invoices.type, type), isNull(invoices.deletedAt)];
    // المسودات لا تظهر إلا لو طُلبت صراحة (?drafts=1)
    if (u.searchParams.get("drafts") !== "1") conds.push(eq(invoices.isDraft, false));
    else conds.push(eq(invoices.isDraft, true));
    if (from) conds.push(gte(invoices.date, from));
    if (to) conds.push(lt(invoices.date, to));
    if (partyId > 0) conds.push(eq(invoices.partyId, partyId));
    if (q) {
      const like = `%${q}%`;
      const c = or(ilike(invoices.partyName, like), sql`${invoices.number}::text ilike ${like}`);
      if (c) conds.push(c);
    }
    const where = and(...conds);

    const items = await db
      .select({
        ...getTableColumns(invoices),
        itemsCount: sql<number>`(select count(*) from ${invoiceItems} where ${invoiceItems.invoiceId} = ${invoices.id})`.mapWith(Number),
      })
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.date), desc(invoices.number))
      .limit(limit);

    const [totals] = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
        paid: sql<number>`coalesce(sum(${invoices.paid}), 0)`.mapWith(Number),
        tax: sql<number>`coalesce(sum(${invoices.tax}), 0)`.mapWith(Number),
        discount: sql<number>`coalesce(sum(${invoices.discount}), 0)`.mapWith(Number),
        profit: sql<number>`coalesce(sum(${invoices.subtotal} - ${invoices.discount} - ${invoices.cost}), 0)`.mapWith(Number),
      })
      .from(invoices)
      .where(where);

    return { items, totals };
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const input = parseInvoiceInput(body);
    const isDraftSave = body.isDraft === true;

    // وضع المسودة: حفظ بدون أي تأثير على المخزون أو الأرصدة ولا يُحتسب في حدود النسخة التجريبية
    if (isDraftSave) {
      try {
        const { getSession } = await import("@/lib/server/session");
        const session = await getSession();
        if (session) {
          if (input.branchId == null && session.branchId != null) input.branchId = session.branchId;
          if (!input.userName) input.userName = session.name;
        }
      } catch {
        /* ignore */
      }
      return saveDraft(input);
    }

    const license = await getCurrentLicense();

    // التحقق من حالة النسخة التجريبية وحدود الفواتير
    if (!license.isActivated) {
      if (license.isExpired) {
        throw new Error("انتهت الفترة التجريبية (15 يوماً). يرجى تفعيل البرنامج للمتابعة.");
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(and(isNull(invoices.deletedAt), eq(invoices.isDraft, false)));

      if (count >= license.limits.maxInvoices) {
        throw new Error(
          `وصلت للحد الأقصى للفواتير في النسخة التجريبية (${license.limits.maxInvoices} فاتورة). يرجى تفعيل البرنامج لإصدار فواتير بلا حدود.`
        );
      }
    }

    // ربط الفاتورة بالفرع والمستخدم من الجلسة (لو موجودة)
    try {
      const { getSession } = await import("@/lib/server/session");
      const session = await getSession();
      if (session) {
        if (input.branchId == null && session.branchId != null) input.branchId = session.branchId;
        if (!input.userName) input.userName = session.name;
      }
    } catch {
      /* ignore */
    }

    return createInvoice(input);
  });
}
