"use client";

import { Command } from "lucide-react";
import { Dialog } from "@/components/win/Window";
import { EDITOR_SHORTCUTS, GLOBAL_SHORTCUTS, type Shortcut } from "@/lib/shortcuts";

function KeyCap({ k }: { k: string }) {
  return (
    <kbd className="inline-block min-w-[26px] rounded-md border border-[#9fb4d2] border-b-2 bg-gradient-to-b from-white to-[#e8f0fa] px-1.5 py-0.5 text-center text-[11px] font-black text-[#0f2942] shadow-sm">
      {k}
    </kbd>
  );
}

function Group({ title, items }: { title: string; items: Shortcut[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#c9d8ee] bg-white">
      <div className="bg-[#0f2942] px-2.5 py-1 text-[12px] font-black text-white">{title}</div>
      <div className="divide-y divide-slate-100">
        {items.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 px-2.5 py-1">
            <span className="text-[11.5px] font-bold text-[#0f2942]">{s.label}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {s.keys.map((k, i) => (
                <span key={k} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-[10px] font-black text-slate-400">+</span>}
                  <KeyCap k={k} />
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** نافذة الاختصارات — تفتح بـ F1 من أي مكان */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const globalGroups = [...new Set(GLOBAL_SHORTCUTS.map((s) => s.group))];
  const editorGroups = [...new Set(EDITOR_SHORTCUTS.map((s) => s.group))];

  return (
    <Dialog title="اختصارات لوحة المفاتيح" onClose={onClose} width={720}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#eef4fa] px-3 py-2 text-[12px] font-bold text-[#0f2942]">
          <Command className="h-4 w-4 text-[#2fb3a6]" />
          استخدم هذه الاختصارات لتشغيل البرنامج بالكامل بدون ماوس — سرعة أكبر بكثير في الكاشير.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            {globalGroups.map((g) => (
              <Group key={g} title={g} items={GLOBAL_SHORTCUTS.filter((s) => s.group === g)} />
            ))}
          </div>
          <div className="space-y-2">
            {editorGroups.map((g) => (
              <Group key={g} title={g} items={EDITOR_SHORTCUTS.filter((s) => s.group === g)} />
            ))}
          </div>
        </div>

        <div className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900">
          ملاحظة: داخل شاشة الفاتورة تختلف وظيفة F1–F10 عن باقي الشاشات (كما هو موضّح في العمود الأيسر).
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn btn-blue h-9 px-5 text-[13.5px] font-black" onClick={onClose}>
            تمام
          </button>
        </div>
      </div>
    </Dialog>
  );
}
