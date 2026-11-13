import { BarcodePrint } from "@/components/print/BarcodePrint";

export default async function BarcodesPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; price?: string; auto?: string }>;
}) {
  const sp = await searchParams;
  const items = (sp.items ?? "")
    .split(",")
    .map((x) => x.split(":").map(Number))
    .filter(([id, c]) => Number.isInteger(id) && id > 0 && Number.isInteger(c) && c > 0)
    .map(([id, c]) => ({ id, count: Math.min(c, 999) }));
  return <BarcodePrint items={items} showPrice={sp.price !== "0"} auto={sp.auto === "1"} />;
}
