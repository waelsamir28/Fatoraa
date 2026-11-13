import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { handle, num, readJson, str } from "@/lib/server/http";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(() => getSettings());
}

export function PUT(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    await getSettings();

    const showBigTitle =
      b.showBigTitle === undefined ? true : Boolean(b.showBigTitle);

    const [row] = await db
      .update(settings)
      .set({
        storeName: str(b.storeName) || DEFAULT_SETTINGS.storeName,
        userName: str(b.userName) || DEFAULT_SETTINGS.userName,
        phone: str(b.phone),
        address: str(b.address),
        taxRate: Math.min(100, Math.max(0, num(b.taxRate, 14))),
        currency: str(b.currency) || "ج.م",
        branchName: str(b.branchName),
        salesRep: str(b.salesRep),
        invoiceFooter: str(b.invoiceFooter),
        // تخصيص المظهر
        theme: str(b.theme) || "classic-blue",
        buttonStyle: str(b.buttonStyle) || "glossy-3d",
        fontFamily: str(b.fontFamily) || "cairo",
        tableHeaderColor: str(b.tableHeaderColor) || "navy-dark",
        customBgUrl: str(b.customBgUrl),
        customLogoUrl: str(b.customLogoUrl),
        phone2: str(b.phone2),
        showBigTitle,
        customBigTitle: str(b.customBigTitle) || "FATORA",
        customTagline: str(b.customTagline) || DEFAULT_SETTINGS.customTagline,
        invoiceTemplate: str(b.invoiceTemplate) || "template-modern-a5",
        fontScale: Math.min(130, Math.max(70, num(b.fontScale, 100))),
        updatedAt: new Date(),
      })
      .where(eq(settings.id, 1))
      .returning();
    return row;
  });
}
