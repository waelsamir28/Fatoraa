import { ShelfLabels } from "@/components/print/ShelfLabels";

export const dynamic = "force-dynamic";

export default async function ShelfLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; w?: string; h?: string; price?: string; store?: string; auto?: string }>;
}) {
  const sp = await searchParams;
  const items = (sp.items ?? "")
    .split(",")
    .map((x) => x.split(":").map(Number))
    .filter(([id, c]) => Number.isInteger(id) && id > 0 && Number.isInteger(c) && c > 0)
    .map(([id, c]) => ({ id, count: Math.min(c, 500) }));

  const w = Math.min(160, Math.max(40, Number(sp.w) || 70));
  const h = Math.min(120, Math.max(25, Number(sp.h) || 45));

  return (
    <ShelfLabels
      items={items}
      widthMm={w}
      heightMm={h}
      showPrice={sp.price !== "0"}
      showStore={sp.store !== "0"}
      auto={sp.auto === "1"}
    />
  );
}
