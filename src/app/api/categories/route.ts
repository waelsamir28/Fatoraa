import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { HttpError, handle, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** جلب جميع المجموعات مع عدد الأصناف في كل مجموعة */
export function GET() {
  return handle(async () => {
    const cats = await db
      .select({
        category: products.category,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(products)
      .groupBy(products.category)
      .orderBy(asc(products.category));

    return {
      categories: cats.filter((c) => c.category && c.category.trim().length > 0),
    };
  });
}

/** إضافة مجموعة جديدة (عن طريق إنشاء صنف افتراضي بها أو تسجيلها) */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const categoryName = str(b.name);
    if (!categoryName) {
      throw new HttpError(400, "يرجى كتابة اسم المجموعة الجديدة");
    }

    // التحقق إن كانت المجموعة موجودة مسبقاً
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.category, categoryName))
      .limit(1);

    if (existing) {
      return { ok: true, message: "المجموعة موجودة بالفعل", name: categoryName };
    }

    // إدراج بند صنف أولي تحت هذه المجموعة لتعريفها في النظام
    const code = `CAT-${Date.now().toString().slice(-6)}`;
    await db.insert(products).values({
      code,
      name: `صنف أولي (${categoryName})`,
      category: categoryName,
      unit: "قطعة",
      costPrice: 0,
      salePrice: 0,
      wholesalePrice: 0,
      stock: 0,
      minStock: 0,
    });

    return { ok: true, message: `تم إضافة مجموعة "${categoryName}" بنجاح`, name: categoryName };
  });
}

/** تعديل اسم مجموعة في جميع الأصناف المرتبطة بها */
export function PUT(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const oldName = str(b.oldName);
    const newName = str(b.newName);

    if (!oldName || !newName) {
      throw new HttpError(400, "يرجى تحديد الاسم القديم والاسم الجديد للمجموعة");
    }

    if (oldName === newName) {
      return { ok: true, message: "لم يتم تغيير الاسم" };
    }

    const res = await db
      .update(products)
      .set({ category: newName })
      .where(eq(products.category, oldName))
      .returning({ id: products.id });

    return {
      ok: true,
      message: `تم تعديل اسم المجموعة من "${oldName}" إلى "${newName}" في ${res.length} صنف بنجاح`,
      updatedCount: res.length,
    };
  });
}

/** حذف مجموعة: تُنقل أصنافها إلى مجموعة (عام) حفاظاً على البيانات */
export function DELETE(req: Request) {
  return handle(async () => {
    const name = str(new URL(req.url).searchParams.get("name"));
    if (!name) throw new HttpError(400, "يرجى تحديد المجموعة المطلوب حذفها");
    const res = await db
      .update(products)
      .set({ category: "عام" })
      .where(eq(products.category, name))
      .returning({ id: products.id });
    return { ok: true, message: `تم حذف مجموعة "${name}" ونقل ${res.length} صنف إلى مجموعة (عام)`, moved: res.length };
  });
}
