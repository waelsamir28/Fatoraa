import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LicenseGuard } from "@/components/win/LicenseGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "FATORA - لإدارة المحلات التجارية",
  description:
    "FATORA لإدارة المحلات التجارية: فواتير المبيعات والمشتريات، المخازن، العملاء والموردين، التقارير والنسخ الاحتياطي. للدعم الفني 01222355769",
};

export const viewport: Viewport = {
  themeColor: "#0b4cc2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Cairo+Play:wght@400;700;800&family=Tajawal:wght@400;500;700;800;900&family=Almarai:wght@400;700;800&family=Lalezar&display=swap"
        />
        {/* تطبيق الثيم والخط المحفوظين قبل الرسم لمنع وميض الألوان */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=JSON.parse(localStorage.getItem('aljamal.ui.prefs')||'{}');var r=document.documentElement;if(p.theme)r.setAttribute('data-theme',p.theme);if(p.fontFamily)r.setAttribute('data-font',p.fontFamily);if(p.buttonStyle)r.setAttribute('data-buttons',p.buttonStyle);if(p.tableHeaderColor)r.setAttribute('data-table',p.tableHeaderColor);}catch(e){}`,
          }}
        />
      </head>
      <body>
        <LicenseGuard>{children}</LicenseGuard>
      </body>
    </html>
  );
}
