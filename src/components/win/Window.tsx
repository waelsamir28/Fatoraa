"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Calculator as CalcIcon, Copy, Maximize2, Minimize2, Minus, Square, X } from "lucide-react";
import { CartLogo } from "@/components/icons/AppIcons";
import { DEFAULT_LOGO } from "@/lib/constants";
import { APP_NAME } from "@/lib/constants";
import { useDesktop } from "./DesktopProvider";
import { CalculatorDialog } from "./Calculator";
import { useFullscreen } from "./fullscreen";
import { useUiPrefs } from "./UiPrefs";

export const BASE_W = 1380;
export const BASE_H = 750;

type Box = { s: number; w: number; h: number; x: number; y: number };

export function FitScreen({
  baseW = BASE_W,
  baseH = BASE_H,
  maxScale = 2.0,
  children,
}: {
  baseW?: number;
  baseH?: number;
  maxScale?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const { prefs } = useUiPrefs();
  // تكبير/تصغير الخط: نغيّر مساحة التصميم بنسبة معاكسة فيكبر كل المحتوى بنفس النسبة
  const zoom = Math.min(1.35, Math.max(0.7, (prefs.fontScale || 100) / 100));
  const kW = baseW / zoom;
  const kH = baseH / zoom;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (!W || !H) return;
      const s = Math.min(W / kW, H / kH, maxScale);
      // w absorbs slight horizontal aspect ratio differences up to 1.15x
      const w = Math.min(W / s, kW * 1.15);
      // h is locked to the design height so vertical layouts never stretch into empty gaps
      const h = kH;
      const next: Box = { s, w, h, x: (W - w * s) / 2, y: (H - h * s) / 2 };
      setBox((prev) =>
        prev &&
        Math.abs(prev.s - next.s) < 0.0005 &&
        Math.abs(prev.w - next.w) < 0.5 &&
        Math.abs(prev.h - next.h) < 0.5 &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.y - next.y) < 0.5
          ? prev
          : next,
      );
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kW, kH, maxScale]);

  return (
    <div ref={ref} className="fit-host">
      <div
        className="fit-canvas"
        style={
          box
            ? { left: box.x, top: box.y, width: box.w, height: box.h, transform: `scale(${box.s})` }
            : { inset: 0, visibility: "hidden" }
        }
      >
        {children}
      </div>
    </div>
  );
}

export function Window({
  title,
  icon,
  children,
  statusBar,
  onClose,
  bodyClassName = "",
  fit = true,
  baseW,
  baseH,
  showBackBtn = true,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  statusBar?: ReactNode;
  onClose?: () => void;
  bodyClassName?: string;
  fit?: boolean;
  baseW?: number;
  baseH?: number;
  showBackBtn?: boolean;
}) {
  const { maximized, showRestore, native, toggleMaximized, minimized, setMinimized, setWindowTitle } = useDesktop();
  const router = useRouter();
  const [isFs, toggleFs] = useFullscreen();
  const [calc, setCalc] = useState(false);

  useEffect(() => {
    setWindowTitle(title);
    document.title = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`;
  }, [title, setWindowTitle]);

  const handleClose = onClose ?? (() => router.push("/"));

  return (
    <div
      className={`win-window ${maximized ? "win-max" : "win-normal"}`}
      style={minimized ? { display: "none" } : undefined}
    >
      <div className="win-titlebar app-drag" dir="ltr" onDoubleClick={native ? undefined : toggleMaximized}>
        <div className="flex min-w-0 items-center gap-2 px-2.5">
          {/* زر رجوع صغير ومضغوط للعودة السريعة للرئيسية */}
          {showBackBtn && (
            <button
              type="button"
              className="app-no-drag win-back mr-1 flex h-6 w-6 items-center justify-center rounded-md transition"
              title="رجوع إلى الشاشة الرئيسية"
              onClick={() => router.push("/")}
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.8} />
            </button>
          )}

          <span className="win-titlebar__icon shrink-0">
            {icon ?? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={DEFAULT_LOGO} alt="logo" className="h-6 w-auto object-contain drop-shadow" />
            )}
          </span>
          <span dir="rtl" className="truncate text-[13px] font-extrabold pr-1 leading-none">
            {title}
          </span>
        </div>

        <div className="app-no-drag flex h-full shrink-0" onDoubleClick={(e) => e.stopPropagation()}>
          <button type="button" className="win-ctrl" onClick={() => setCalc(true)} title="الآلة الحاسبة">
            <CalcIcon className="h-3.5 w-3.5" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="win-ctrl"
            onClick={() => {
              if (!isFs && !maximized) toggleMaximized();
              toggleFs();
            }}
            title={isFs ? "إنهاء ملء الشاشة (Esc)" : "تكبير ملء الشاشة (F11)"}
          >
            {isFs ? <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.8} /> : <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.8} />}
          </button>
          <span className="mx-1 my-2 w-px bg-white/30" />
          {native && (
            <button type="button" className="win-ctrl" onClick={() => setMinimized(true)} title="تصغير">
              <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          )}
          <button type="button" className="win-ctrl" onClick={toggleMaximized} title={showRestore ? "استعادة" : "تكبير"}>
            {showRestore ? (
              <Copy className="h-[13px] w-[13px]" strokeWidth={2.6} />
            ) : (
              <Square className="h-[13px] w-[13px]" strokeWidth={2.8} />
            )}
          </button>
          <button type="button" className="win-ctrl close" onClick={handleClose} title="إغلاق">
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className={`win-body ${fit ? "overflow-hidden" : ""} ${bodyClassName}`}>
        {fit ? (
          <FitScreen baseW={baseW} baseH={baseH}>
            {children}
          </FitScreen>
        ) : (
          children
        )}
      </div>
      {statusBar && <div className="win-status">{statusBar}</div>}
      {calc && <CalculatorDialog onClose={() => setCalc(false)} />}
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  width = 520,
  icon,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  icon?: ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=alertdialog]")) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(5,20,55,.45)] p-4 backdrop-blur-xs">
      <div className="win-dialog flex max-h-full w-full flex-col shadow-2xl" style={{ maxWidth: width }} role="dialog">
        <div className="win-titlebar win-titlebar-sm" dir="ltr">
          <div className="flex min-w-0 items-center gap-2 px-3">
            {icon ?? <CartLogo className="h-5 w-5" />}
            <span dir="rtl" className="truncate text-[15px] font-extrabold">
              {title}
            </span>
          </div>
          <button type="button" className="win-ctrl close" onClick={onClose} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#f7f9fc] p-4">{children}</div>
        {footer && <div className="win-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  title,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={() => onChange(!on)}
      className="panel flex h-[34px] items-center gap-2 px-2.5 shadow-sm"
    >
      <span className="text-[14px] font-extrabold text-[#0c2340]">{label}</span>
      <span className={`toggle ${on ? "on" : ""}`} dir="ltr">
        <span className="txt">{on ? "ON" : "OFF"}</span>
        <span className="knob" />
      </span>
    </button>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

export function Kpi({
  label,
  value,
  color = "blue",
  icon,
  sub,
}: {
  label: string;
  value: ReactNode;
  color?: "blue" | "green" | "red" | "orange" | "purple" | "teal" | "navy" | "gold";
  icon?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className={`kpi kpi-${color}`}>
      {/* التسمية فوق والرقم تحتها — بمساحة كافية فمفيش تداخل */}
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
        <div className="flex w-full items-center justify-center gap-1">
          {icon}
          <span className="truncate text-[12.5px] font-bold leading-tight opacity-95">{label}</span>
        </div>
        <div className="num w-full truncate text-center text-[26px] font-black leading-none tracking-tight">
          {value}
        </div>
        {sub && <span className="truncate text-[10.5px] font-bold leading-none opacity-80">{sub}</span>}
      </div>
    </div>
  );
}
