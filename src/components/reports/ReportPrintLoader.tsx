"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "@/lib/client";
import type { Settings } from "@/lib/types";
import { ReportPrint } from "@/components/reports/ReportPrint";

/** صفحة طباعة تقرير الأرباح (PDF) — تُفتح في نافذة مستقلة */
export function ReportPrintLoader({ from, to, auto }: { from: string; to: string; auto?: boolean }) {
  const [data, setData] = useState<null | Record<string, unknown>>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const tz = -new Date().getTimezoneOffset();
      const [r, s] = await Promise.all([
        api<Record<string, unknown>>(
          `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to + "T23:59:59")}&tz=${tz}`,
        ),
        api<Settings>("/api/settings").catch(() => null),
      ]);
      setData(r);
      setSettings(s);
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <div style={{ padding: 24, fontFamily: "Cairo, sans-serif" }}>تعذر تحميل التقرير: {err}</div>;
  if (!data) return <div style={{ padding: 24, fontFamily: "Cairo, sans-serif" }}>جاري تحضير التقرير…</div>;

  return (
    <ReportPrint
      data={data as never}
      settings={settings}
      from={from}
      to={to}
      auto={auto}
    />
  );
}
