"use client";

import { useCallback, useEffect, useState } from "react";

/** تكبير ملء الشاشة (مثل F11) - يعمل في المتصفح وفي نسخة الويندوز exe */
export function useFullscreen(): [boolean, () => void] {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    h();
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => undefined);
  }, []);

  return [isFs, toggle];
}
