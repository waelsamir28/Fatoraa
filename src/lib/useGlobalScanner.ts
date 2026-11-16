"use client";

import { useEffect, useRef } from "react";

/**
 * قارئ الباركود العام (Global Scanner Listener)
 *
 * المشكلة اللي بيحلها: الكاشير كان لازم يضغط على خانة الصنف الأول قبل ما يمسح،
 * وإلا الباركود بيروح في الفاضي.
 *
 * الحل: المستمع شغّال على مستوى الشاشة كلها — بيقرأ الباركود من قارئ USB
 * (اللي بيبعت الحروف بسرعة عالية + Enter) حتى لو مفيش خانة مختارة.
 *
 * قواعد الأمان (عشان ما يتعارضش مع الكتابة العادية):
 *  1) لو التركيز جوه خانة إدخال (input/textarea/select) ⇒ نسيبها تعمل شغلها.
 *  2) الباركود لازم يكون 6 حروف/أرقام أو أكثر.
 *  3) الفرق بين ضغطة وضغطة < 60ms (سرعة القارئ) — مش كتابة بشر.
 *  4) Enter في الآخر، أو انتهاء المهلة القصيرة.
 */
export function useGlobalScanner(onScan: (code: string) => void, enabled = true) {
  const cb = useRef(onScan);

  useEffect(() => {
    cb.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** هل العنصر المركّز عليه بيقبل كتابة؟ */
    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (node.isContentEditable) return true;
      return false;
    };

    const flush = () => {
      const code = buffer.trim();
      buffer = "";
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (code.length >= 6) cb.current(code);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Esc أو اختصارات مع Ctrl/Alt ⇒ ليست باركود
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // الكتابة في خانة إدخال: نسيب المتصفح/المكوّن يتصرف (الشاشة بتقرأ لوحدها)
      if (isTypingTarget(e.target)) {
        buffer = "";
        return;
      }

      const now = Date.now();
      // ضغط بطيء (كتابة بشر) ⇒ نبدأ من الأول
      if (now - last > 120) buffer = "";
      last = now;

      if (e.key === "Enter") {
        if (buffer.length >= 6) {
          e.preventDefault();
          flush();
        }
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        if (timer) clearTimeout(timer);
        // لو القارئ مش بيبعت Enter، نستنى 80ms وبعدها نعتبره كامل
        timer = setTimeout(flush, 80);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
