"use client";

import { useBackgroundTasks } from "./useBackgroundTasks";

/** مكوّن صامت يشغّل المهام اليومية (نسخة احتياطية + تنبيه نواقص) مرة واحدة */
export function BackgroundTasks() {
  useBackgroundTasks();
  return null;
}
