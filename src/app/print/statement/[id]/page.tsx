import { StatementPrint } from "@/components/parties/StatementPrint";

export const dynamic = "force-dynamic";

export default async function StatementPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; auto?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return <StatementPrint partyId={Number(id)} from={sp.from} to={sp.to} auto={sp.auto === "1"} />;
}
