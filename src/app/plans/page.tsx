import type { Metadata } from "next";
import { PlansPageClient } from "./PlansPageClient";

export const metadata: Metadata = {
  title: "أنظمة تفعيل FATORA — سنة / سنتين / مدى الحياة",
  description:
    "أسعار ومدد تفعيل برنامج FATORA لإدارة المحلات التجارية: اشتراك سنة، اشتراك سنتين، وتفعيل مدى الحياة.",
};

export const dynamic = "force-dynamic";

export default function PlansPage() {
  return <PlansPageClient />;
}
