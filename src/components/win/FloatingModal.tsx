"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

export type FloatingModalTone = "navy" | "blue" | "green" | "red" | "amber" | "violet";

const TONE_BG: Record<FloatingModalTone, string> = {
  navy: "linear-gradient(180deg, #123a63 0%, #0e2e50 100%)",
  blue: "linear-gradient(180deg, #0067c0 0%, #004e94 100%)",
  green: "linear-gradient(180deg, #107c10 0%, #0b5a0b 100%)",
  red: "linear-gradient(180deg, #c42b1c 0%, #991f13 100%)",
  amber: "linear-gradient(180deg, #b45309 0%, #8a3e05 100%)",
  violet: "linear-gradient(180deg, #5c2e91 0%, #431f6d 100%)",
};

interface FloatingModalProps {
  title: string;
  subtitle?: string;
  tone?: FloatingModalTone;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  zIndexClass?: string;
}

/**
 * نافذة عائمة موحدة الحجم:
 * - حجم موحد (920px، حد أقصى 86vh)
 * - ظل ناعم متدرج خلف النافذة
 * - شريط عنوان ملون مع زر إغلاق
 * - أزرار مصغّرة حمراء/صفراء/خضراء
 */
export function FloatingModal({
  title,
  subtitle,
  tone = "navy",
  onClose,
  children,
  footer,
  zIndexClass = "z-[120]",
}: FloatingModalProps) {
  const [maximized, setMaximized] = useState(false);

  return (
    <div
      dir="rtl"
      onClick={onClose}
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 backdrop-blur-xs`}
      style={{
        background:
          "radial-gradient(circle at 50% 35%, rgba(15, 41, 66, 0.58) 0%, rgba(5, 16, 32, 0.78) 100%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-modal-enter flex flex-col overflow-hidden rounded-[16px] border border-white/20 bg-[#f4f8fd] transition-all duration-200 ${
          maximized
            ? "h-[94vh] w-[96vw] max-w-[1320px]"
            : "h-[660px] max-h-[88vh] w-[1080px] max-w-[95vw]"
        }`}
        style={{
          boxShadow:
            "0 30px 75px -12px rgba(4, 18, 42, 0.58), 0 14px 36px -8px rgba(0, 103, 192, 0.25)",
        }}
      >
        {/* شريط عنوان ملون + أزرار حمراء/صفراء/خضراء + زر إغلاق */}
        <div
          className="flex h-[46px] shrink-0 items-center justify-between px-4 select-none"
          style={{ background: TONE_BG[tone] }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* أزرار مصغّرة حمراء / صفراء / خضراء */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                title="إغلاق"
                className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/15 hover:brightness-110 transition"
              />
              <button
                type="button"
                onClick={() => setMaximized(false)}
                title="حجم قياسي"
                className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/15 hover:brightness-110 transition"
              />
              <button
                type="button"
                onClick={() => setMaximized((v) => !v)}
                title="تكبير / استعادة"
                className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/15 hover:brightness-110 transition"
              />
            </div>

            <div className="min-w-0 truncate">
              <span className="text-[14px] font-black text-white">{title}</span>
              {subtitle && (
                <span className="mr-2 text-[11px] font-bold text-white/75">{subtitle}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="إغلاق"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-white/15 text-white hover:bg-[#c42b1c] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>

        {/* تذييل اختياري */}
        {footer && (
          <div className="flex shrink-0 items-center justify-between border-t border-[#d8e4f3] bg-white px-4 py-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
