import { ReportPrintLoader } from "@/components/reports/ReportPrintLoader";

export const dynamic = "force-dynamic";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; auto?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defFrom = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const defTo = iso(now);
  return <ReportPrintLoader from={sp.from || defFrom} to={sp.to || defTo} auto={sp.auto === "1"} />;
}
