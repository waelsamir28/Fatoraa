import { and, asc, desc, eq, getTableColumns, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { installments, parties, payments } from "@/db/schema";
import { HttpError, handle, num, parseDate, parseId, readJson, round2, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const partyId = num(u.searchParams.get("partyId"), 0);
    const status = str(u.searchParams.get("status")); // pending | paid | late

    const conds: SQL[] = [];
    if (partyId > 0) conds.push(eq(installments.partyId, partyId));
    if (status) conds.push(eq(installments.status, status));

    const items = await db
      .select()
      .from(installments)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(installments.dueDate), asc(installments.id));

    const [totals] = await db
      .select({
        totalAmount: sql<number>`coalesce(sum(${installments.amount}), 0)`.mapWith(Number),
        pendingAmount: sql<number>`coalesce(sum(case when ${installments.status} = 'pending' then ${installments.amount} else 0 end), 0)`.mapWith(Number),
        paidAmount: sql<number>`coalesce(sum(case when ${installments.status} = 'paid' then ${installments.amount} else 0 end), 0)`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(installments)
      .where(conds.length ? and(...conds) : undefined);

    return { items, totals };
  });
}

/** إضافة جدول أقساط لعميل */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const partyId = num(b.partyId, 0);
    if (!partyId) throw new HttpError(400, "يجب تحديد العميل");

    const [party] = await db.select().from(parties).where(eq(parties.id, partyId));
    if (!party) throw new HttpError(404, "العميل غير موجود");

    const totalAmount = round2(num(b.totalAmount));
    const count = Math.max(1, Math.min(60, num(b.count, 1)));
    const intervalDays = num(b.intervalDays, 30);
    const startDate = parseDate(str(b.startDate)) ?? new Date();
    const eachAmount = round2(totalAmount / count);

    const rows: Array<typeof installments.$inferInsert> = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i - 1) * intervalDays);
      rows.push({
        partyId,
        partyName: party.name,
        invoiceId: num(b.invoiceId) || null,
        installmentNo: i,
        totalInstallments: count,
        amount: i === count ? round2(totalAmount - eachAmount * (count - 1)) : eachAmount,
        dueDate,
        status: "pending",
        notes: str(b.notes) || `قسط رقم ${i} من ${count}`,
      });
    }

    const created = await db.insert(installments).values(rows).returning();
    return created;
  });
}

/** سداد قسط محدد أو دفع مبلغ مخصص حر من القسط */
export function PUT(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const id = num(b.id, 0);
    const customAmount = b.customAmount !== undefined ? round2(num(b.customAmount)) : null;

    const [inst] = await db.select().from(installments).where(eq(installments.id, id));
    if (!inst) throw new HttpError(404, "القسط غير موجود");

    // دفع مبلغ مخصص
    if (customAmount !== null && customAmount > 0) {
      if (customAmount >= inst.amount) {
        // إذا كان المبلغ المدفوع يغطي القسط بالكامل أو أكثر
        await db.transaction(async (tx) => {
          await tx.insert(payments).values({
            partyId: inst.partyId,
            amount: customAmount,
            date: new Date(),
            notes: `سداد كامل لقسط رقم ${inst.installmentNo} من ${inst.totalInstallments} بمبلغ ${customAmount} ج.م`,
          });
          await tx
            .update(parties)
            .set({ balance: sql`round((${parties.balance} - ${customAmount})::numeric, 2)::float8` })
            .where(eq(parties.id, inst.partyId));

          await tx
            .update(installments)
            .set({ status: "paid", paidDate: new Date() })
            .where(eq(installments.id, id));
        });
      } else {
        // دفع جزء من القسط: تخصيم المبلغ وخفض قيمة القسط المتبقية
        const remainingForThisInstallment = round2(inst.amount - customAmount);
        await db.transaction(async (tx) => {
          await tx.insert(payments).values({
            partyId: inst.partyId,
            amount: customAmount,
            date: new Date(),
            notes: `سداد جزء من قسط رقم ${inst.installmentNo} من ${inst.totalInstallments} (مدفوع: ${customAmount} ج.م - المتبقي: ${remainingForThisInstallment} ج.م)`,
          });
          await tx
            .update(parties)
            .set({ balance: sql`round((${parties.balance} - ${customAmount})::numeric, 2)::float8` })
            .where(eq(parties.id, inst.partyId));

          await tx
            .update(installments)
            .set({
              amount: remainingForThisInstallment,
              notes: `${inst.notes ? inst.notes + " | " : ""}تم دفع ${customAmount} ج.م بتاريخ ${new Date().toLocaleDateString("ar-EG")}`,
            })
            .where(eq(installments.id, id));
        });
      }

      const [updated] = await db.select().from(installments).where(eq(installments.id, id));
      return updated;
    }

    // التبديل التقليدي بين مسدد وغير مسدد
    const newStatus = inst.status === "paid" ? "pending" : "paid";
    const paidDate = newStatus === "paid" ? new Date() : null;

    if (newStatus === "paid") {
      await db.transaction(async (tx) => {
        await tx.insert(payments).values({
          partyId: inst.partyId,
          amount: inst.amount,
          date: new Date(),
          notes: `سداد قسط رقم ${inst.installmentNo} من ${inst.totalInstallments}`,
        });
        await tx
          .update(parties)
          .set({ balance: sql`round((${parties.balance} - ${inst.amount})::numeric, 2)::float8` })
          .where(eq(parties.id, inst.partyId));

        await tx
          .update(installments)
          .set({ status: "paid", paidDate })
          .where(eq(installments.id, id));
      });
    } else {
      await db
        .update(installments)
        .set({ status: "pending", paidDate: null })
        .where(eq(installments.id, id));
    }

    const [updated] = await db.select().from(installments).where(eq(installments.id, id));
    return updated;
  });
}
