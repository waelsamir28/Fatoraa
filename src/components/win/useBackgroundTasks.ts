"use client";

import { useEffect } from "react";

/**
 * مشغّل المهام الخلفية اليومية:
 * 1) نسخة احتياطية تلقائية حسب الجدول المحفوظ في الإعدادات (مرة واحدة لكل فترة).
 * 2) تنبيه الأصناف الناقصة على تيليجرام (مرة واحدة في اليوم فقط).
 *
 * يعمل مرة واحدة عند فتح البرنامج — لا يُظهر أي واجهة ولا يعطّل التشغيل لو فشل.
 */
export function useBackgroundTasks() {
  useEffect(() => {
    let cancelled = false;
    const key = "fatora.bg.tasks.last";
    const today = new Date().toISOString().slice(0, 10);

    const run = async () => {
      // نمنع التكرار في نفس اليوم على نفس الجهاز (لتخفيف الضغط على السيرفر)
      let last = "";
      try {
        last = localStorage.getItem(key) || "";
      } catch {
        /* ignore */
      }
      if (last === today) return;

      try {
        // 1) النسخة المجدولة (السيرفر يحدد لو حان الوقت فعلاً)
        await fetch("/api/backups/schedule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run-now" }) });
      } catch {
        /* صامت */
      }
      if (cancelled) return;

      try {
        // 2) تنبيه النواقص اليومي
        await fetch("/api/alerts/low-stock?daily=1", { cache: "no-store" });
      } catch {
        /* صامت */
      }

      try {
        localStorage.setItem(key, today);
      } catch {
        /* ignore */
      }
    };

    // تأخير 4 ثوانٍ حتى يجهز التطبيق ويسجل الدخول
    const t = setTimeout(() => void run(), 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);
}
