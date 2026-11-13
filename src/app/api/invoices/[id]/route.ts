import { HttpError, handle, parseId, readJson } from "@/lib/server/http";
import { deleteInvoice, getInvoice, parseInvoiceInput, updateInvoice } from "@/lib/server/invoices";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const inv = await getInvoice(parseId((await params).id));
    if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
    return inv;
  });
}

export function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    const input = parseInvoiceInput(await readJson(req));
    return updateInvoice(id, input);
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => deleteInvoice(parseId((await params).id)));
}
