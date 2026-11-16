import { NextResponse } from "next/server";
import { APP_PAGES } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** كل صفحات البرنامج القابلة للتحكم (تُستخدم في صفحة «صلاحيات الشاشات»). */
export async function GET() {
  return NextResponse.json({
    items: APP_PAGES.map((p) => ({
      path: p.path,
      label: p.label,
      perm: p.perm || "",
      homeButton: Boolean(p.homeButton),
    })),
  });
}
