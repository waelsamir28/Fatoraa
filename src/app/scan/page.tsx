import { PhoneScanner } from "@/components/scan/PhoneScanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FATORA — ماسح الموبايل",
};

export default function ScanPage() {
  return <PhoneScanner />;
}
