import { PrintView } from "@/components/print/PrintView";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto } = await searchParams;
  return <PrintView id={Number(id)} auto={auto === "1"} />;
}
