"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Info,
  Maximize2,
  Minimize2,
  Phone,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  CartLogo,
  IconBox,
  IconCustomers,
  IconDefs,
  IconHome,
  IconReports,
  IconSales,
  IconSettings,
  IconSupport,
  IconWarehouse,
} from "@/components/icons/AppIcons";
import {
  IconCategories,
  IconInstallments,
  IconShifts,
  IconSmartOrders,
  IconTreasury,
} from "@/components/icons/MoreIcons";
import { APP_NAME, SUPPORT_PERSON, SUPPORT_PHONE } from "@/lib/constants";
import { useFullscreen } from "./fullscreen";
import { useAuth } from "@/components/auth/AuthProvider";
import { UpdateBanner } from "./UpdateCenter";

interface DesktopBridge {
  isDesktop: boolean;
  minimize: () => void;
  toggleMaximize: () => void;
  quit: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (cb: (v: boolean) => void) => () => void;
  getRuntimeInfo?: () => Promise<unknown>;
  checkForUpdates?: (manual?: boolean) => Promise<unknown>;
  getUpdateState?: () => Promise<unknown>;
  downloadUpdate?: () => Promise<unknown>;
  installUpdate?: () => Promise<unknown>;
  onUpdateState?: (cb: (s: unknown) => void) => () => void;
  openExternal?: (url: string) => Promise<boolean>;
  switchMode?: (mode: "cloud" | "local") => Promise<string>;
  setCloudUrl?: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    aljamalDesktop?: DesktopBridge;
  }
}

const bridge = () =>
  typeof window !== "undefined" && window.aljamalDesktop?.isDesktop ? window.aljamalDesktop : null;

type MsgKind = "info" | "warning" | "error" | "question" | "success";
export interface MsgOptions {
  title?: string;
  text: string;
  kind?: MsgKind;
  confirm?: boolean;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}
type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}
interface DialogState extends MsgOptions {
  resolve: (v: boolean) => void;
}

interface DesktopCtx {
  native: boolean;
  maximized: boolean;
  showRestore: boolean;
  toggleMaximized: () => void;
  minimized: boolean;
  setMinimized: (v: boolean) => void;
  setWindowTitle: (t: string) => void;
  quitApp: () => void;
  msg: (o: MsgOptions) => Promise<boolean>;
  confirm: (text: string, opts?: Partial<MsgOptions>) => Promise<boolean>;
  toast: (text: string, kind?: ToastKind) => void;
  activeUser: string;
  setActiveUser: (u: string) => void;
}

const Ctx = createContext<DesktopCtx | null>(null);

export function useDesktop() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDesktop must be used inside DesktopProvider");
  return c;
}

const TASK_APPS = [
  { href: "/", label: "الرئيسية", Icon: IconHome },
  { href: "/sales", label: "المبيعات", Icon: IconSales },
  { href: "/purchases", label: "المشتريات", Icon: IconBox },
  { href: "/products-manager", label: "الأصناف والمجموعات", Icon: IconCategories },
  { href: "/inventory", label: "المخازن", Icon: IconWarehouse },
  { href: "/customers", label: "العملاء", Icon: IconCustomers },
  { href: "/treasury", label: "الخزينة", Icon: IconTreasury },
  { href: "/shifts", label: "الورديات", Icon: IconShifts },
  { href: "/stock-movements", label: "حركات المخزون", Icon: IconWarehouse },
  { href: "/low-stock", label: "النواقص", Icon: IconWarehouse },
  { href: "/barcode", label: "طباعة الباركود", Icon: IconWarehouse },
  { href: "/deleted-invoices", label: "سجل المحذوفات", Icon: IconReports },
  { href: "/installments", label: "الأقساط", Icon: IconInstallments },
  { href: "/smart-orders", label: "طلبات الشراء الذكية", Icon: IconSmartOrders },
  { href: "/reports", label: "التقارير", Icon: IconReports },
  { href: "/settings", label: "الإعدادات", Icon: IconSettings },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [native, setNative] = useState(false);
  const [nativeMax, setNativeMax] = useState(true);
  const [maximized, setMaximized] = useState(true);
  const [minimized, setMinimizedState] = useState(false);
  const [, setWindowTitle] = useState(APP_NAME);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // المستخدم الحالي: من جلسة الخادم الحقيقية
  const { user: sessionUser } = useAuth();
  const activeUser = sessionUser?.name || "FATORA";
  const setActiveUser = useCallback(() => undefined, []);

  useEffect(() => {
    const b = bridge();
    if (b) {
      setNative(true);
      document.documentElement.classList.add("is-desktop-app");
      b.isMaximized().then(setNativeMax).catch(() => undefined);
      return b.onMaximizedChange(setNativeMax);
    }
    // البرنامج يفتح دائماً بوضع التكبير (ملء الشاشة) — يمكن التصغير يدوياً بعد الفتح
    try {
      localStorage.removeItem("aljamal.max");
    } catch {
      /* ignore */
    }
    const id = setTimeout(() => setMaximized(true), 0);
    void id;
    // تسجيل الـ service worker (يعمل أيضاً على localhost و روابط المشاركة https)
    if ("serviceWorker" in navigator) {
      const secure = window.location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (secure) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return undefined;
  }, []);

  useEffect(() => {
    setMinimizedState(false);
  }, [pathname]);

  const toggleMaximized = useCallback(() => {
    const b = bridge();
    if (b) {
      b.toggleMaximize();
      return;
    }
    setMaximized((m) => !m);
  }, []);

  const setMinimized = useCallback((v: boolean) => {
    const b = bridge();
    if (v && b) {
      b.minimize();
      return;
    }
    setMinimizedState(v);
  }, []);

  const quitApp = useCallback(() => {
    bridge()?.quit();
  }, []);

  const msg = useCallback(
    (o: MsgOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    [],
  );
  const confirm = useCallback(
    (text: string, opts?: Partial<MsgOptions>) => msg({ kind: "question", confirm: true, ...opts, text }),
    [msg],
  );
  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const closeDialog = useCallback((v: boolean) => {
    setDialog((d) => {
      d?.resolve(v);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      native,
      maximized: native ? true : maximized,
      showRestore: native ? nativeMax : maximized,
      toggleMaximized,
      minimized: native ? minimized : false,
      setMinimized,
      setWindowTitle,
      quitApp,
      msg,
      confirm,
      toast,
      activeUser,
      setActiveUser,
    }),
    [native, maximized, nativeMax, toggleMaximized, minimized, setMinimized, quitApp, msg, confirm, toast, activeUser],
  );

  return (
    <Ctx.Provider value={value}>
      <IconDefs />
      <div className="desktop">
        {children}

      </div>

      <UpdateBanner />
      {dialog && <MessageBox dialog={dialog} onClose={closeDialog} />}

      <div className="pointer-events-none fixed bottom-[62px] right-4 z-[130] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="toast pointer-events-auto">
            {t.kind === "success" && <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />}
            {t.kind === "error" && <XCircle className="h-6 w-6 shrink-0 text-red-600" />}
            {t.kind === "info" && <Info className="h-6 w-6 shrink-0 text-blue-600" />}
            <div>
              <div className="text-[12px] font-extrabold text-slate-500">{APP_NAME}</div>
              <div className="text-[11px] font-bold text-slate-400">الدعم الفني: {SUPPORT_PERSON} — {SUPPORT_PHONE}</div>
              <div className="text-[14.5px] leading-snug">{t.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function MessageBox({ dialog, onClose }: { dialog: DialogState; onClose: (v: boolean) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const kind = dialog.kind ?? "info";
  const icon =
    kind === "warning" ? (
      <AlertTriangle className="h-11 w-11 shrink-0 fill-yellow-300 text-yellow-600" />
    ) : kind === "error" ? (
      <XCircle className="h-11 w-11 shrink-0 fill-red-500 text-white" />
    ) : kind === "question" ? (
      <HelpCircle className="h-11 w-11 shrink-0 fill-blue-500 text-white" />
    ) : kind === "success" ? (
      <CheckCircle2 className="h-11 w-11 shrink-0 fill-green-500 text-white" />
    ) : (
      <Info className="h-11 w-11 shrink-0 fill-blue-500 text-white" />
    );

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(5,20,55,.35)] p-4">
      <div className="win-dialog w-full max-w-[460px]" role="alertdialog">
        <div className="win-titlebar win-titlebar-sm" dir="ltr">
          <div className="flex items-center gap-2 px-3">
            <CartLogo className="h-4 w-4" />
            <span dir="rtl" className="text-[12.5px] font-extrabold">
              {dialog.title ?? APP_NAME}
            </span>
          </div>
          <button type="button" className="win-ctrl close" onClick={() => onClose(false)} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* الكلام في وسط الرسالة */}
        <div className="flex flex-col items-center gap-3 bg-white px-6 py-5 text-center">
          {icon}
          <p className="whitespace-pre-line text-center text-[16px] font-bold leading-relaxed text-[#0b2350]">
            {dialog.text}
          </p>
        </div>
        <div className="win-dialog-footer">
          <button
            type="button"
            autoFocus
            className={`btn ${dialog.danger ? "btn-red" : "btn-blue"} h-9 min-w-[100px] px-4`}
            onClick={() => onClose(true)}
          >
            {dialog.okText ?? (dialog.confirm ? "نعم" : "موافق")}
          </button>
          {dialog.confirm && (
            <button type="button" className="btn h-9 min-w-[100px] px-4" onClick={() => onClose(false)}>
              {dialog.cancelText ?? "لا"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
