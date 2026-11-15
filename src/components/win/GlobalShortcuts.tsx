"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { HelpCircle, Lock, Search, Wifi, WifiOff, X, CloudUpload, LayoutList } from "lucide-react";
import { ShortcutsDialog } from "@/components/win/ShortcutsDialog";
import { buildNavGroups, type NavItem } from "@/components/home/HomeSidebar";
import { offlineCount, syncOfflineQueue, watchOfflineSync, lastSyncAt } from "@/lib/offline";
import { useDesktop } from "@/components/win/DesktopProvider";

/** مسارات الاختصارات العامة */
const ROUTES = {
  home: "/",
  sale: "/sales",
  invoices: "/sales/list",
  items: "/products-manager",
  reports: "/reports",
} as const;

/**
 * مشغّل الاختصارات العامة (F1/F2/F6/F7/F8/Shift+F9/Ctrl+K/Ctrl+L/Ctrl+B/Esc)
 * + مؤشر الأوفلاين وطابور المزامنة (PWA).
 * يُركّب مرة واحدة داخل تخطيط التطبيق.
 */
export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useDesktop();
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  /** الشاشة الرئيسية فيها بحثها الخاص؛ لا نعطّل الاختصار في الفاتورة (لها اختصاراتها) */
  const inEditor = pathname === "/sales" || pathname === "/purchases" || pathname.startsWith("/returns/");

  // ---- حالة الاتصال والطابور ----
  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setQueued(offlineCount());
    };
    refresh();
    const on = () => refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("fatora:offline-sync", on);
    const stop = watchOfflineSync((r) => {
      setQueued(r.remaining);
      if (r.sent > 0) toast(`تم إرسال ${r.sent} فاتورة محفوظة أوفلاين بنجاح ✓`, "success");
      if (r.remaining > 0) toast(`باقي ${r.remaining} فاتورة في طابور الأوفلاين`, "info");
    });
    const t = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("fatora:offline-sync", on);
      stop();
      clearInterval(t);
    };
  }, [toast]);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await syncOfflineQueue();
      setQueued(r.remaining);
      toast(
        r.sent > 0 ? `تم إرسال ${r.sent} فاتورة — المتبقي ${r.remaining}` : "لا توجد فواتير للإرسال الآن",
        r.sent > 0 ? "success" : "info",
      );
    } finally {
      setSyncing(false);
    }
  }, [syncing, toast]);

  // ---- اختصارات لوحة المفاتيح العامة ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

      // Ctrl+K / Ctrl+L / Ctrl+B تعمل حتى أثناء الكتابة
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "k") {
          e.preventDefault();
          setSearch((v) => !v);
          return;
        }
        if (k === "b") {
          e.preventDefault();
          window.dispatchEvent(new Event("fatora:toggle-nav"));
          return;
        }
        if (k === "l") {
          e.preventDefault();
          window.dispatchEvent(new Event("fatora:lock"));
          return;
        }
      }

      if (typing) {
        if (e.key === "Escape") (el as HTMLInputElement).blur();
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if (e.key === "Escape") {
        setHelp(false);
        setSearch(false);
        return;
      }
      // داخل شاشة الفاتورة: F1–F10 محجوزة لمحرّر الفاتورة
      if (inEditor && /^F\d{1,2}$/.test(e.key)) return;

      switch (e.key) {
        case "F2":
          e.preventDefault();
          router.push(ROUTES.home);
          break;
        case "F6":
          e.preventDefault();
          router.push(ROUTES.sale);
          break;
        case "F7":
          e.preventDefault();
          router.push(ROUTES.invoices);
          break;
        case "F8":
          e.preventDefault();
          router.push(ROUTES.items);
          break;
        case "F9":
          if (e.shiftKey) {
            e.preventDefault();
            router.push(ROUTES.reports);
          }
          break;
        default:
          break;
      }
    };
    const openSearch = () => setSearch(true);
    window.addEventListener("fatora:search", openSearch);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("fatora:search", openSearch);
      window.removeEventListener("keydown", onKey);
    };
  }, [router, inEditor]);

  const syncLabel = lastSyncAt();

  return (
    <>
      {/* شريط حالة الأوفلاين — يظهر فقط عند انقطاع الشبكة أو وجود فواتير معلّقة */}
      {(!online || queued > 0) && (
        <div
          className={`fixed bottom-[54px] left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-black shadow-lg ${
            online
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
          dir="rtl"
        >
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {online ? (
            <span>يوجد {queued} فاتورة محفوظة أوفلاين بانتظار الإرسال</span>
          ) : (
            <span>لا يوجد اتصال — الفواتير تُحفظ محلياً وتُرسل تلقائياً بعد عودة الإنترنت</span>
          )}
          {online && queued > 0 && (
            <button
              type="button"
              onClick={() => void syncNow()}
              className="flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[11.5px] text-white hover:bg-amber-700"
            >
              <CloudUpload className={`h-3.5 w-3.5 ${syncing ? "animate-pulse" : ""}`} />
              إرسال الآن
            </button>
          )}
        </div>
      )}

      {/* زر صغير دائم لحالة الاتصال (يمين أسفل) */}
      <button
        type="button"
        title={online ? `متصل${syncLabel ? ` — آخر مزامنة ${new Date(syncLabel).toLocaleTimeString("ar-EG")}` : ""}` : "غير متصل"}
        onClick={() => (queued > 0 ? void syncNow() : undefined)}
        className={`fixed bottom-[54px] right-3 z-[120] grid h-7 w-7 place-items-center rounded-full border shadow-sm ${
          online ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"
        }`}
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      </button>

      {/* أزرار سريعة في شريط المهام: بحث + قفل + مساعدة */}
      <div className="fixed bottom-[3px] left-2 z-[115] flex items-center gap-1" dir="ltr">
        <button
          type="button"
          onClick={() => setSearch(true)}
          title="بحث سريع (Ctrl+K)"
          className="grid h-7 w-7 place-items-center rounded border border-white/25 bg-white/10 text-white hover:bg-white/25"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("fatora:lock"))}
          title="قفل الشاشة (Ctrl+L)"
          className="grid h-7 w-7 place-items-center rounded border border-white/25 bg-white/10 text-white hover:bg-white/25"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setHelp(true)}
          title="الاختصارات والمساعدة (F1)"
          className="grid h-7 w-7 place-items-center rounded border border-white/25 bg-white/10 text-white hover:bg-white/25"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>

      {help && <ShortcutsDialog onClose={() => setHelp(false)} />}
      {search && <QuickJump onClose={() => setSearch(false)} onNavigate={(h) => { setSearch(false); router.push(h); }} />}
    </>
  );
}

/** لوحة البحث السريع: تبحث في كل شاشات البرنامج وتنتقل بـ Enter */
function QuickJump({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => buildNavGroups(0).flatMap((g) => g.items), []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 12);
    return all
      .filter((it) => `${it.label} ${it.keywords || ""} ${it.href}`.toLowerCase().includes(s))
      .slice(0, 14);
  }, [q, all]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/45 pt-[8vh]" dir="rtl" onClick={onClose}>
      <div
        ref={boxRef}
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[#c9d8ee] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#dbe6f4] bg-[#0f2942] px-3 py-2">
          <Search className="h-4 w-4 text-[#7fe3d8]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((v) => Math.min(results.length - 1, v + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((v) => Math.max(0, v - 1));
              }
              if (e.key === "Enter" && results[sel]) onNavigate(results[sel].href);
            }}
            placeholder="اكتب اسم الشاشة… مثال: فاتورة، مخزن، تقرير، إعدادات"
            className="h-8 flex-1 rounded-md border border-white/25 bg-white/10 px-2 text-[13.5px] font-black text-white placeholder:text-white/50 focus:border-[#2fb3a6] focus:outline-none"
          />
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded text-white/70 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-[12.5px] font-bold text-slate-400">لا توجد نتائج مطابقة</div>
          )}
          {results.map((it: NavItem, i: number) => (
            <button
              key={`${it.href}-${it.label}`}
              type="button"
              onMouseEnter={() => setSel(i)}
              onClick={() => onNavigate(it.href)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-right ${
                i === sel ? "bg-[#2fb3a6] text-white" : "text-[#0f2942] hover:bg-[#eef4fa]"
              }`}
            >
              <it.Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-[13px] font-black">{it.label}</span>
              <span className={`text-[10.5px] font-bold ${i === sel ? "text-white/70" : "text-slate-400"}`}>{it.href}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#dbe6f4] bg-[#f7fbff] px-3 py-1 text-[10.5px] font-bold text-slate-500">
          <span className="flex items-center gap-1">
            <LayoutList className="h-3 w-3" /> ↑ ↓ للتنقل — Enter للفتح
          </span>
          <span>Esc للإغلاق</span>
        </div>
      </div>
    </div>
  );
}
