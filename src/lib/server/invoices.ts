import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices, parties, products } from "@/db/schema";
import { HttpError, num, round2, round3, str } from "./http";

export type InvoiceType = "sale" | "purchase" | "sale_return" | "purchase_return";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const START_NUMBER: Record<InvoiceType, number> = { sale: 1001, purchase: 1001, sale_return: 1, purchase_return: 1 };
const STOCK_SIGN: Record<InvoiceType, number> = { sale: -1, purchase: 1, sale_return: 1, purchase_return: -1 };
const BALANCE_SIGN: Record<InvoiceType, number> = { sale: 1, purchase: 1, sale_return: -1, purchase_return: -1 };
const LOCK_ID: Record<InvoiceType, number> = { sale: 7001, purchase: 7002, sale_return: 7003, purchase_return: 7004 };
export const isCustomerType = (t: InvoiceType) => t === "sale" || t === "sale_return";
const METHODS = ["cash", "installments", "wallet", "card", "transfer", "cheque"];

export interface ItemInput {
  productId: number | null;
  productName: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
}

export interface InvoiceInput {
  type: InvoiceType;
  partyId: number | null;
  partyName: string;
  date: Date;
  paymentType: "cash" | "credit";
  paymentMethod: string;
  priceLevel: string;
  extraDiscount: number;
  taxRate: number;
  paid: number;
  notes: string;
  userName: string;
  /** الفرع (يأتي من جلسة المستخدم إن لم يُحدَّد) */
  branchId?: number | null;
  items: ItemInput[];
}

export function parseType(v: unknown): InvoiceType {
  if (v === "sale" || v === "purchase" || v === "sale_return" || v === "purchase_return") return v;
  throw new HttpError(400, "نوع الفاتورة غير صحيح");
}

export function parseInvoiceInput(body: Record<string, unknown>): InvoiceInput {
  const type = parseType(body.type);
  const rawItems = Array.isArray(body.items) ? (body.items as unknown[]) : [];
  const items: ItemInput[] = rawItems
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const pid = num(o.productId, 0);
      return {
        productId: pid > 0 ? pid : null,
        productName: str(o.productName),
        unit: str(o.unit),
        qty: round3(num(o.qty)),
        price: round2(num(o.price)),
        discount: round2(num(o.discount)),
      };
    })
    .filter((it) => it.productName && it.qty > 0);

  if (!items.length) throw new HttpError(400, "لا يمكن حفظ فاتورة بدون أصناف");
  if (items.some((it) => it.price < 0 || it.discount < 0)) {
    throw new HttpError(400, "قيم الأسعار أو الخصم غير صحيحة");
  }
  const dateRaw = str(body.date);
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "تاريخ الفاتورة غير صالح");

  const paymentType = body.paymentType === "credit" ? "credit" : "cash";
  const method = str(body.paymentMethod);
  const pid = num(body.partyId, 0);
  const partyId = pid > 0 ? pid : null;
  if (paymentType === "credit" && !partyId) {
    throw new HttpError(
      400,
      isCustomerType(type) ? "يجب اختيار العميل في حالة الدفع الآجل" : "يجب اختيار المورد في حالة الدفع الآجل",
    );
  }
  return {
    type,
    partyId,
    partyName: str(body.partyName) || (isCustomerType(type) ? "عميل نقدي" : "مورد نقدي"),
    date,
    paymentType,
    paymentMethod: METHODS.includes(method) ? method : "cash",
    priceLevel: body.priceLevel === "wholesale" ? "wholesale" : "retail",
    extraDiscount: Math.max(0, round2(num(body.extraDiscount))),
    taxRate: Math.min(100, Math.max(0, num(body.taxRate))),
    paid: Math.max(0, round2(num(body.paid))),
    notes: str(body.notes),
    userName: str(body.userName),
    items,
  };
}

export function computeTotals(input: Pick<InvoiceInput, "items" | "extraDiscount" | "taxRate" | "paymentType" | "paid">) {
  const subtotal = round2(input.items.reduce((s, it) => s + it.qty * it.price, 0));
  const discount = round2(input.items.reduce((s, it) => s + it.discount, 0) + input.extraDiscount);
  const taxable = Math.max(0, round2(subtotal - discount));
  const tax = round2((taxable * input.taxRate) / 100);
  const total = round2(taxable + tax);
  const paid = input.paymentType === "cash" ? total : Math.min(total, input.paid);
  return { subtotal, discount, tax, total, paid };
}

type EffectInvoice = { type: string; partyId: number | null; total: number; paid: number };
type EffectItem = { productId: number | null; qty: number };

/** تأثير الفاتورة على المخزون وأرصدة العملاء/الموردين (sign = 1 تطبيق، -1 عكس) */
async function applyEffects(tx: Tx, inv: EffectInvoice, items: EffectItem[], sign: 1 | -1) {
  for (const it of items) {
    if (!it.productId) continue;
    const delta = round3(it.qty * (STOCK_SIGN[inv.type as InvoiceType] ?? 0) * sign);
    await tx
      .update(products)
      .set({ stock: sql`round((${products.stock} + ${delta})::numeric, 3)::float8` })
      .where(eq(products.id, it.productId));
  }
  const due = round2(inv.total - inv.paid);
  if (inv.partyId && due !== 0) {
    await tx
      .update(parties)
      .set({ balance: sql`round((${parties.balance} + ${round2(due * (BALANCE_SIGN[inv.type as InvoiceType] ?? 1) * sign)})::numeric, 2)::float8` })
      .where(eq(parties.id, inv.partyId));
  }
}

async function resolveParty(tx: Tx, input: InvoiceInput) {
  if (!input.partyId) return { partyId: null, partyName: input.partyName };
  const [p] = await tx.select().from(parties).where(eq(parties.id, input.partyId));
  const expected = isCustomerType(input.type) ? "customer" : "supplier";
  if (!p || p.type !== expected) {
    throw new HttpError(400, isCustomerType(input.type) ? "العميل غير موجود" : "المورد غير موجود");
  }
  return { partyId: p.id, partyName: p.name };
}

async function buildItems(tx: Tx, input: InvoiceInput) {
  const ids = [...new Set(input.items.map((i) => i.productId).filter((x): x is number => !!x))];
  const costMap = new Map<number, number>();
  if (ids.length) {
    const rows = await tx
      .select({ id: products.id, cost: products.costPrice })
      .from(products)
      .where(inArray(products.id, ids));
    rows.forEach((r) => costMap.set(r.id, r.cost));
  }
  return input.items.map((it) => {
    const productId = it.productId && costMap.has(it.productId) ? it.productId : null;
    const cost = input.type === "purchase" ? it.price : productId ? (costMap.get(productId) ?? 0) : 0;
    return {
      productId,
      productName: it.productName,
      unit: it.unit,
      qty: it.qty,
      price: it.price,
      discount: it.discount,
      cost,
      total: round2(it.qty * it.price - it.discount),
    };
  });
}

async function updatePurchaseCosts(tx: Tx, type: InvoiceType, items: { productId: number | null; price: number }[]) {
  if (type !== "purchase") return;
  for (const it of items) {
    if (it.productId && it.price > 0) {
      await tx.update(products).set({ costPrice: it.price }).where(eq(products.id, it.productId));
    }
  }
}

export async function nextNumber(type: InvoiceType, executor: Pick<typeof db, "select"> = db) {
  const [r] = await executor
    .select({
      n: sql<number>`coalesce(max(${invoices.number}), ${sql.raw(String(START_NUMBER[type] - 1))}) + 1`.mapWith(Number),
    })
    .from(invoices)
    .where(eq(invoices.type, type));
  return r?.n ?? START_NUMBER[type];
}

export async function getInvoice(id: number) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return null;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.id));
  return { ...inv, items };
}

export async function findInvoice(type: InvoiceType, number: number, dir: string) {
  const base = eq(invoices.type, type);
  const q = db.select({ id: invoices.id }).from(invoices);
  let rows: { id: number }[];
  switch (dir) {
    case "first":
      rows = await q.where(base).orderBy(asc(invoices.number)).limit(1);
      break;
    case "last":
      rows = await q.where(base).orderBy(desc(invoices.number)).limit(1);
      break;
    case "prev":
      rows = await q.where(and(base, lt(invoices.number, number))).orderBy(desc(invoices.number)).limit(1);
      break;
    case "next":
      rows = await q.where(and(base, gt(invoices.number, number))).orderBy(asc(invoices.number)).limit(1);
      break;
    default:
      rows = await q.where(and(base, eq(invoices.number, number))).limit(1);
  }
  return rows[0] ? getInvoice(rows[0].id) : null;
}

export async function createInvoice(input: InvoiceInput) {
  const id = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${LOCK_ID[input.type]})`);
    const party = await resolveParty(tx, input);
    const items = await buildItems(tx, input);
    const t = computeTotals(input);
    const number = await nextNumber(input.type, tx);
    const now = new Date();
    const [inv] = await tx
      .insert(invoices)
      .values({
        type: input.type,
        number,
        partyId: party.partyId,
        partyName: party.partyName,
        date: input.date,
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        priceLevel: input.priceLevel,
        subtotal: t.subtotal,
        discount: t.discount,
        extraDiscount: input.extraDiscount,
        taxRate: input.taxRate,
        tax: t.tax,
        total: t.total,
        paid: t.paid,
        cost: round2(items.reduce((s, it) => s + it.qty * it.cost, 0)),
        notes: input.notes,
        userName: input.userName,
        branchId: input.branchId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(invoiceItems).values(items.map((it) => ({ ...it, invoiceId: inv.id })));
    await applyEffects(tx, inv, items, 1);
    await updatePurchaseCosts(tx, input.type, items);
    return inv.id;
  });
  return getInvoice(id);
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
    if (!old) throw new HttpError(404, "الفاتورة غير موجودة");
    if (old.type !== input.type) throw new HttpError(400, "لا يمكن تغيير نوع الفاتورة");
    const oldItems = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await applyEffects(tx, old, oldItems, -1);
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    const party = await resolveParty(tx, input);
    const items = await buildItems(tx, input);
    const t = computeTotals(input);
    const [inv] = await tx
      .update(invoices)
      .set({
        partyId: party.partyId,
        partyName: party.partyName,
        date: input.date,
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        priceLevel: input.priceLevel,
        subtotal: t.subtotal,
        discount: t.discount,
        extraDiscount: input.extraDiscount,
        taxRate: input.taxRate,
        tax: t.tax,
        total: t.total,
        paid: t.paid,
        cost: round2(items.reduce((s, it) => s + it.qty * it.cost, 0)),
        notes: input.notes,
        userName: input.userName || old.userName,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    await tx.insert(invoiceItems).values(items.map((it) => ({ ...it, invoiceId: id })));
    await applyEffects(tx, inv, items, 1);
    await updatePurchaseCosts(tx, input.type, items);
  });
  return getInvoice(id);
}

export async function deleteInvoice(id: number) {
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
    if (!old) throw new HttpError(404, "الفاتورة غير موجودة");
    const oldItems = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await applyEffects(tx, old, oldItems, -1);
    await tx.delete(invoices).where(eq(invoices.id, id));
  });
  return { ok: true };
}
