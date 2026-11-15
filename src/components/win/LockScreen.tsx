"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound, Lock, LogOut, ShieldCheck, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, errMsg } from "@/lib/client";
import { APP_NAME, DEFAULT_LOGO, SUPPORT_PHONE } from "@/lib/constants";
import { useAuth } from "@/components/auth/AuthProvider";

/** مدة الخمول قبل القفل التلقائي (5 دقائق) */
const IDLE_MS = 5 * 60 * 1000;
/** موضع التخزين: هل القفل التلقائي مفعّل */
const AUTO_LOCK_KEY = "fatora.lock.auto";

/**
 * شاشة قفل البرنامج:
 * - تلقائي بعد 5 دقائق خمول (يمكن إيقافه من الخيار أسفل الشاشة)
 * - يدوي بـ Ctrl+L أو من زر في شريط المهام
 * - لا تُغلق الجلسة: فقط تطلب كلمة السر مرة أخرى للمتابعة
 */
export function LockScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [lastActivity, setLastActivity] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // قراءة الإعداد المحفوظ + بدء عدّاد الخمول
  useEffect(() => {
    const id = setTimeout(() => {
      setLastActivity(Date.now());
      try {
        setAutoLock(localStorage.getItem(AUTO_LOCK_KEY) !== "0");
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /** القفل */
  const lock = useCallback(() => {
    setLocked(true);
    setPassword("");
    setError("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  /** إلغاء القفل بعد التحقق */
  const unlock = async () => {
    if (!password) {
      setError("أدخل كلمة المرور");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<{ ok: boolean; error?: string }>("/api/auth/verify", {
        method: "POST",
        json: { password, username: user?.username || "" },
      });
      if (!r.ok) {
        setError(r.error || "كلمة المرور غير صحيحة");
        setPassword("");
        return;
      }
      setLocked(false);
      setPassword("");
      setLastActivity(Date.now());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // مراقبة الخمول + اختصار Ctrl+L
  useEffect(() => {
    const bump = () => setLastActivity(Date.now());
    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener("keydown", onKey);

    // حدث خارجي (من شريط المهام)
    const onLockEvent = () => lock();
    window.addEventListener("fatora:lock", onLockEvent);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("fatora:lock", onLockEvent);
    };
  }, [lock]);

  // مؤقت القفل التلقائي
  useEffect(() => {
    if (!autoLock || locked) return;
    const t = setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_MS) lock();
    }, 15_000);
    return () => clearInterval(t);
  }, [autoLock, lastActivity, locked, lock]);

  const toggleAutoLock = () => {
    setAutoLock((v) => {
      const next = !v;
      try {
        localStorage.setItem(AUTO_LOCK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!locked) return null;

  return (
    <div className="lock-overlay" dir="rtl">
      <div className="lock-card">
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_LOGO} alt={APP_NAME} className="h-14 w-auto object-contain" />
          <div className="mt-1 flex items-center gap-1.5 text-[17px] font-black text-[#0f2942]">
            <Lock className="h-5 w-5 text-[#d92d20]" />
            الشاشة مقفولة
          </div>
          <div className="text-[11.5px] font-bold text-slate-500">
            البرنامج مقفول مؤقتاً لحماية بياناتك — أدخل كلمة المرور للمتابعة
          </div>
          {user?.name && (
            <div className="mt-1 flex items-center gap-1.5 rounded-full bg-[#eef4fa] px-3 py-1">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b from-[#ffd34d] to-[#e0a800] text-[10px] font-black text-[#3b2503]">
                {user.name.trim().charAt(0)}
              </span>
              <span className="text-[12px] font-black text-[#0f2942]">{user.name}</span>
              <span className="text-[10.5px] font-bold text-slate-500">({user.roleLabel || user.role})</span>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border-2 border-[#c9d8ee] bg-white pe-10 ps-3 text-[15px] font-black text-[#0f2942] outline-none focus:border-[#2fb3a6] focus:ring-4 focus:ring-[#2fb3a6]/20"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void unlock();
              }}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] font-black text-red-700">{error}</div>
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn btn-green h-11 flex-1 text-[15px] font-black"
              onClick={() => void unlock()}
              disabled={busy}
            >
              {busy ? <ShieldCheck className="h-4 w-4 animate-pulse" /> : <Unlock className="h-4 w-4" />}
              {busy ? "جاري التحقق..." : "فتح البرنامج"}
            </button>
            <button
              type="button"
              className="btn btn-red h-11 px-3 text-[12.5px] font-black"
              title="خروج من الحساب"
              onClick={() => {
                void logout().then(() => router.push("/"));
              }}
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-md bg-[#f4f8fd] px-2.5 py-1.5">
            <span className="text-[11.5px] font-bold text-slate-600">
              قفل تلقائي بعد 5 دقائق خمول
            </span>
            <span className="flex items-center gap-1.5">
              {autoLock ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <span className="text-[10.5px] font-black text-red-600">متوقف</span>
              )}
              <input type="checkbox" className="h-4 w-4 accent-[#2fb3a6]" checked={autoLock} onChange={toggleAutoLock} />
            </span>
          </label>

          <div className="text-center text-[10.5px] font-bold text-slate-400">
            دعم فني: <span className="num">{SUPPORT_PHONE}</span> — اضغط Ctrl+L لقفل الشاشة في أي وقت
          </div>
        </div>
      </div>
    </div>
  );
}

/** طلب قفل الشاشة من أي مكان في البرنامج */
export function requestLock() {
  window.dispatchEvent(new Event("fatora:lock"));
}
