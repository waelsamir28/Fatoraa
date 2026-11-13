import type { MetadataRoute } from "next";

/** يسمح بتثبيت البرنامج كتطبيق ويندوز من متصفح Edge / Chrome */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "برنامج FATORA - لإدارة المحلات التجارية",
    short_name: "برنامج FATORA",
    description: "برنامج مبيعات ومشتريات ومخازن وحسابات للمحلات التجارية - الدعم الفني 01222355769",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#0b3a8c",
    theme_color: "#0b4cc2",
    lang: "ar",
    dir: "rtl",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
