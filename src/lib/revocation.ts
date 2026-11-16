"use client";

import { useEffect } from "react";

/**
 * فحص إلغاء التفعيل من لوحة التحكم السحابية.
 * - يعمل على نسخة الويندوز (تتصل بالسحابة) وعلى النسخة السحابية نفسها.
 * - لو الجهاز موقوف ⇒ يظهر حدث fatora:device-revoked ويقفل البرنامج.
 * - الفحص كل 10 دقائق، ومع كل مرة يفتح البرنامج.
 */
const CLOUD_URL = process.env.NEXT_PUBLIC_FATORA_CLOUD || "https://fatoraa.vercel.app";

export function useDeviceRevocationCheck() {
  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const lic = await fetch("/api/license", { cache: "no-store" }).then((r) => r.json());
        const deviceId = String(lic?.machineId || "");
        if (!deviceId || !alive) return;

        const onCloud = typeof window !== "undefined" && window.location.origin.includes("vercel.app");
        if (onCloud) return; // النسخة السحابية نفسها لا تسأل نفسها
        const res = await fetch(`${CLOUD_URL}/api/device-control/check?deviceId=${encodeURIComponent(deviceId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { revoked?: boolean };
        if (data.revoked && alive) {
          window.dispatchEvent(new CustomEvent("fatora:device-revoked", { detail: { deviceId } }));
        }
      } catch {
        /* أوفلاين: لا نوقف البرنامج */
      }
    };

    void check();
    const t = setInterval(() => void check(), 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
}
