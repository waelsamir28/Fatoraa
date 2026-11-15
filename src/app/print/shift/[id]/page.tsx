import { ZReport } from "@/components/finance/ZReport";

export const dynamic = "force-dynamic";

export default async function ShiftPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto } = await searchParams;
  return <ZReport id={Number(id)} auto={auto === "1"} />;
}
