"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

/**
 * خلفيات الشاشات المخصصة (الدخول / القفل)
 * تُقرأ من /api/settings مرة واحدة وتُخزَّن في الذاكرة للجلسة.
 */
type Bg = { loginBgUrl?: string; lockBgUrl?: string };

let cache: Bg | null = null;
let pending: Promise<Bg> | null = null;

function load(): Promise<Bg> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api<Bg>("/api/settings")
      .then((s) => {
        cache = { loginBgUrl: s.loginBgUrl || "", lockBgUrl: s.lockBgUrl || "" };
        return cache;
      })
      .catch(() => ({ loginBgUrl: "", lockBgUrl: "" }));
  }
  return pending;
}

export function useScreenBg(kind: "login" | "lock") {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let alive = true;
    void load().then((b) => {
      if (!alive) return;
      setUrl((kind === "login" ? b.loginBgUrl : b.lockBgUrl) || "");
    });
    return () => {
      alive = false;
    };
  }, [kind]);

  return url;
}

/** إبطال الكاش بعد تغيير خلفيات الشاشات من الإعدادات */
export function resetScreenBgCache() {
  cache = null;
  pending = null;
}
