import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { qrSvg, publicInvoiceUrl } from "@/lib/qr";
import { resolvePublicBase } from "@/lib/server/public-base";

export const dynamic = "force-dynamic";

/** رابط الفاتورة + صورة QR (SVG) للطباعة */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: "معرّف الفاتورة غير صحيح" }, { status: 400 });
  }

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });

  // أساس الرابط: نفضّل الرابط السحابي دائماً (العميل بيمسح من موبايله)
  const base = resolvePublicBase(req);
  if (!base) {
    // نسخة سطح المكتب بدون رابط سحابي: لا نطبع QR يشير إلى 127.0.0.1
    return NextResponse.json(
      {
        error:
          "لطباعة رمز QR صحيح، اضبط رابط السحابة من شاشة «إعدادات الاتصال» حتى يفتح العميل الفاتورة من موبايله.",
        needsCloudUrl: true,
      },
      { status: 409 },
    );
  }

  const url = publicInvoiceUrl(base, inv.id, inv.number);
  const svg = await qrSvg(url);

  return NextResponse.json({ url, svg, token: url.split("/").pop() });
}
