import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { parties, products } from "@/db/schema";
import { HttpError, num, round2, round3, str } from "./http";

export type PartyType = "customer" | "supplier";

export function parsePartyType(v: unknown): PartyType {
  if (v === "customer" || v === "supplier") return v;
  throw new HttpError(400, "نوع الحساب غير صحيح");
}

export function parseProduct(b: Record<string, unknown>) {
  const name = str(b.name);
  if (!name) throw new HttpError(400, "يجب إدخال اسم الصنف");
  const salePrice = round2(num(b.salePrice));
  const costPrice = round2(num(b.costPrice));
  if (salePrice < 0 || costPrice < 0) throw new HttpError(400, "الأسعار يجب أن تكون أكبر من أو تساوي صفر");
  return {
    code: str(b.code),
    name,
    unit: str(b.unit) || "قطعة",
    category: str(b.category) || "عام",
    costPrice,
    salePrice,
    wholesalePrice: round2(num(b.wholesalePrice, salePrice)),
    stock: round3(num(b.stock)),
    minStock: round3(num(b.minStock)),
    imageUrl: str(b.imageUrl),
  };
}

export async function generateProductCode() {
  for (let i = 0; i < 5; i++) {
    const code = `20${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
    const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.code, code));
    if (!exists) return code;
  }
  return `${Date.now()}`;
}

export function parseParty(b: Record<string, unknown>) {
  const name = str(b.name);
  if (!name) throw new HttpError(400, "يجب إدخال الاسم");
  return {
    name,
    phone: str(b.phone),
    address: str(b.address),
    notes: str(b.notes),
  };
}

export async function nextPartyCode(type: PartyType) {
  const base = type === "customer" ? 10000 : 20000;
  const [r] = await db
    .select({ n: sql<number>`coalesce(max(${parties.code}), ${sql.raw(String(base))}) + 1`.mapWith(Number) })
    .from(parties)
    .where(eq(parties.type, type));
  return r?.n ?? base + 1;
}

export function parseExpense(b: Record<string, unknown>) {
  const amount = round2(num(b.amount));
  if (amount <= 0) throw new HttpError(400, "يجب إدخال مبلغ صحيح أكبر من صفر");
  const d = str(b.date) ? new Date(str(b.date)) : new Date();
  return {
    amount,
    category: str(b.category) || "أخرى",
    notes: str(b.notes),
    date: Number.isNaN(d.getTime()) ? new Date() : d,
  };
}
