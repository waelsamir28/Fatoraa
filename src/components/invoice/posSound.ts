"use client";

import { useCallback } from "react";

/** تشغيل نغمات صوتية نظيفة بواسطة Web Audio API بدون الحاجة لملفات mp3 خارجية */
export function usePosSound() {
  const playBeep = useCallback((freq = 880, type: OscillatorType = "sine", duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore audio errors if blocked by browser policy
    }
  }, []);

  const playAddItem = useCallback(() => {
    // صوت "بيب" الكاشير عند إضافة الصنف
    playBeep(1200, "sine", 0.07);
  }, [playBeep]);

  const playSuccess = useCallback(() => {
    // نغمة نجاح ثنائية
    playBeep(659, "triangle", 0.08);
    setTimeout(() => playBeep(880, "triangle", 0.12), 80);
  }, [playBeep]);

  const playError = useCallback(() => {
    playBeep(240, "sawtooth", 0.18);
  }, [playBeep]);

  return { playAddItem, playSuccess, playError };
}
