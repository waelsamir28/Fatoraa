import type { NextConfig } from "next";

/** NEXT_OUTPUT=standalone يُستخدم عند تجهيز نسخة الويندوز (desktop/scripts/prepare.cjs) */
const desktopBuild = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  // قاعدة البيانات المدمجة (WASM) لا يتم تجميعها داخل الحزمة
  serverExternalPackages: ["@electric-sql/pglite"],
  ...(desktopBuild
    ? {
        output: "standalone" as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
