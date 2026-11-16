import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { handle, num, readJson, str } from "@/lib/server/http";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/server/seed";
import { audit } from "@/lib/server/audit";

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
    const showLogo = b.showLogo === undefined ? true : Boolean(b.showLogo);
    const showOnlineDot = b.showOnlineDot === undefined ? true : Boolean(b.showOnlineDot);

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
        theme: [
          "classic-blue",
          "sky-blue",
          "steel-blue",
          "sage-green",
          "warm-sand",
          "muted-purple",
          "soft-teal",
          "slate-gray",
          "dusty-rose",
        ].includes(str(b.theme))
          ? str(b.theme)
          : "classic-blue",
        mode: str(b.mode) === "dark" ? "dark" : "light",
        buttonStyle: str(b.buttonStyle) || "glossy-3d",
        fontFamily: str(b.fontFamily) || "cairo",
        tableHeaderColor: str(b.tableHeaderColor) || "navy-dark",
        customBgUrl: str(b.customBgUrl),
        customLogoUrl: str(b.customLogoUrl),
        phone2: str(b.phone2),
        showBigTitle,
        showLogo,
        showOnlineDot,
        customBigTitle: str(b.customBigTitle) || "FATORA",
        customTagline: str(b.customTagline) || DEFAULT_SETTINGS.customTagline,
        invoiceTemplate: str(b.invoiceTemplate) || "template-modern-a5",
        // إعدادات محرّر القوالب (JSON) — تُحفظ كما هي
        invoiceLayout:
          typeof b.invoiceLayout === "string"
            ? str(b.invoiceLayout).slice(0, 4000)
            : undefined,
        fontScale: Math.min(130, Math.max(70, num(b.fontScale, 100))),
        fontWeight: ["normal", "bold", "black"].includes(str(b.fontWeight)) ? str(b.fontWeight) : "normal",
        buttonOptions: typeof b.buttonOptions === "string" ? str(b.buttonOptions).slice(0, 2000) : "",
        salesLayout: typeof b.salesLayout === "string" ? str(b.salesLayout).slice(0, 2000) : "",
        loginBgUrl: str(b.loginBgUrl).slice(0, 900000),
        lockBgUrl: str(b.lockBgUrl).slice(0, 900000),
        rowSelectColor: /^#[0-9a-fA-F]{3,8}$/.test(str(b.rowSelectColor)) ? str(b.rowSelectColor) : "#dbeafe",
        tableHeaderFollowTheme: b.tableHeaderFollowTheme === undefined ? true : Boolean(b.tableHeaderFollowTheme),
        updatedAt: new Date(),
      })
      .where(eq(settings.id, 1))
      .returning();
    await audit({
      action: "settings_change",
      entity: "settings",
      entityId: 1,
      label: "تغيير إعدادات البرنامج",
      details: { theme: str(b.theme), storeName: str(b.storeName) },
    });
    return row;
  });
}
