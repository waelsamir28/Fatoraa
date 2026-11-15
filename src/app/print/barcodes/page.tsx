import { BarcodePrint } from "@/components/print/BarcodePrint";

export default async function BarcodesPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; price?: string; auto?: string; w?: string; h?: string }>;
}) {
  const sp = await searchParams;
  const items = (sp.items ?? "")
    .split(",")
    .map((x) => x.split(":").map(Number))
    .filter(([id, c]) => Number.isInteger(id) && id > 0 && Number.isInteger(c) && c > 0)
    .map(([id, c]) => ({ id, count: Math.min(c, 999) }));
  const w = Math.min(90, Math.max(30, Number(sp.w) || 58));
  const h = Math.min(60, Math.max(20, Number(sp.h) || 38));
  return <BarcodePrint items={items} showPrice={sp.price !== "0"} auto={sp.auto === "1"} widthMm={w} heightMm={h} />;
}
