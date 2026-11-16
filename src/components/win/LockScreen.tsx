"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound, Lock, LogOut, ShieldCheck, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, errMsg } from "@/lib/client";
import { APP_NAME, DEFAULT_LOGO, SUPPORT_PERSON, SUPPORT_PHONE } from "@/lib/constants";
import { useAuth } from "@/components/auth/AuthProvider";

/** مدة الخمول قبل القفل التلقائي (5 دقائق) */
const IDLE_MS = 5 * 60 * 1000;
/** موضع التخزين: هل القفل التلقائي مفعّل */
const AUTO_LOCK_KEY = "fatora.lock.auto";

/**
 * شاشة قفل البرنامج:
 * - تلقائي بعد 5 دقائق خمول (يمكن إيقافه من أسفل الشاشة)
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
  const [show, setShow] = useState(false);
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
    setTimeout(() => {
      setShow(true);
      inputRef.current?.focus();
    }, 30);
  }, []);

  /** إلغاء القفل بعد التحقق */
  const unlock = async () => {
    if (!password) {
      setError("مطلوب إدخال كلمة المرور للمتابعة");
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
        setTimeout(() => inputRef.current?.focus(), 40);
        return;
      }
      setShow(false);
      setTimeout(() => setLocked(false), 180);
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
      if (lastActivity && Date.now() - lastActivity >= IDLE_MS) lock();
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
    <div className={`lock-overlay ${show ? "is-in" : ""}`} dir="rtl">
      {/* خلفية زخرفية */}
      <span className="lock-blob lock-blob--1" />
      <span className="lock-blob lock-blob--2" />
      <span className="lock-blob lock-blob--3" />

      <div className="lock-card">
        {/* اللوجو */}
        <div className="lock-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_LOGO} alt={APP_NAME} />
        </div>

        {/* أيقونة القفل */}
        <div className="lock-badge">
          <Lock className="h-[22px] w-[22px]" strokeWidth={2.4} />
        </div>

        <h1 className="lock-title">الشاشة مقفولة</h1>
        <p className="lock-sub">
          البرنامج مقفول مؤقتاً لحماية بياناتك
          <br />
          أدخل كلمة المرور للمتابعة
        </p>

        {/* المستخدم الحالي */}
        {user?.name && (
          <div className="lock-user">
            <span className="lock-user__avatar">{user.name.trim().charAt(0)}</span>
            <span className="lock-user__name">{user.name}</span>
            <span className="lock-user__role">({user.roleLabel || user.role})</span>
          </div>
        )}

        {/* كلمة المرور */}
        <div className="lock-field">
          <KeyRound className="lock-field__ico h-[18px] w-[18px]" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            className="lock-input"
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

        {error && <div className="lock-error">{error}</div>}

        {/* الأزرار */}
        <div className="lock-actions">
          <button type="button" className="lock-btn lock-btn--primary" onClick={() => void unlock()} disabled={busy}>
            {busy ? <ShieldCheck className="h-[18px] w-[18px] animate-pulse" /> : <Unlock className="h-[18px] w-[18px]" />}
            {busy ? "جاري التحقق…" : "فتح البرنامج"}
          </button>
          <button
            type="button"
            className="lock-btn lock-btn--danger"
            title="الخروج من الحساب"
            onClick={() => {
              void logout().then(() => router.push("/"));
            }}
          >
            <LogOut className="h-[18px] w-[18px]" />
            خروج
          </button>
        </div>

        {/* القفل التلقائي */}
        <button type="button" className="lock-auto" onClick={toggleAutoLock}>
          <span className={`lock-auto__box ${autoLock ? "is-on" : ""}`}>{autoLock && <CheckCircle2 className="h-3.5 w-3.5" />}</span>
          <span className="lock-auto__text">قفل تلقائي بعد 5 دقائق خمول</span>
          <span className={`lock-auto__state ${autoLock ? "" : "is-off"}`}>{autoLock ? "مفعّل" : "متوقف"}</span>
        </button>

        <div className="lock-foot">
          الدعم الفني: <b>{SUPPORT_PERSON}</b> — <b className="num">{SUPPORT_PHONE}</b>
          <span className="lock-foot__dot">•</span>
          اضغط <kbd>Ctrl</kbd> + <kbd>L</kbd> لقفل الشاشة في أي وقت
        </div>
      </div>
    </div>
  );
}

/** طلب قفل الشاشة من أي مكان في البرنامج */
export function requestLock() {
  window.dispatchEvent(new Event("fatora:lock"));
}
