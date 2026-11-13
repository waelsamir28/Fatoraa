import { handle, num, str } from "@/lib/server/http";
import { findInvoice, nextNumber, parseType } from "@/lib/server/invoices";

export const dynamic = "force-dynamic";

/** البحث برقم الفاتورة أو التنقل (الأولى / السابقة / التالية / الأخيرة) */
export function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const type = parseType(u.searchParams.get("type"));
    const dir = str(u.searchParams.get("dir")) || "exact";
    const number = num(u.searchParams.get("number"), 0);
    const next = await nextNumber(type);
    if (dir === "new") return { invoice: null, nextNumber: next };
    const invoice = await findInvoice(type, number, dir);
    return { invoice, nextNumber: next };
  });
}
