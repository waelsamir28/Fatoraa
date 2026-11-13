import { InvoiceEditor } from "@/components/invoice/InvoiceEditor";

export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const n = Number(id);
  return <InvoiceEditor key={id ?? "new"} type="purchase_return" initialId={Number.isInteger(n) && n > 0 ? n : null} />;
}
