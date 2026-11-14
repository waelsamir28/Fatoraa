"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client";

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: "owner" | "manager" | "cashier";
  roleLabel: string;
  branchId: number | null;
  permissions: string[];
}

interface MeResponse {
  authEnabled: boolean;
  dbError?: boolean;
  dbErrorMessage?: string;
  user: SessionUser | null;
}

interface AuthState {
  loading: boolean;
  authEnabled: boolean;
  dbError: boolean;
  dbErrorMessage: string;
  user: SessionUser | null;
  can: (permission: string) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      // نقرأ الرد الخام لأن 503 يعني خطأ قاعدة بيانات وليس فشل شبكة
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const r = (await res.json().catch(() => ({}))) as MeResponse;

      if (r.dbError) {
        setDbError(true);
        setDbErrorMessage(r.dbErrorMessage || "تعذّر الاتصال بقاعدة البيانات");
        setAuthEnabled(false);
        setUser(null);
        return;
      }

      setDbError(false);
      setDbErrorMessage("");
      setAuthEnabled(Boolean(r.authEnabled));
      setUser(r.user ?? null);
    } catch {
      // فشل شبكة فعلي: لا نفتح البرنامج، نُظهر خطأ
      setDbError(true);
      setDbErrorMessage("تعذّر الاتصال بالخادم. تحقّق من الاتصال بالإنترنت.");
      setAuthEnabled(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    try {
      sessionStorage.removeItem("aljamal_session_logged");
      localStorage.removeItem("aljamal_active_user");
    } catch {
      /* ignore */
    }
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!user) return !authEnabled; // قبل إنشاء الحساب الأول: كله مسموح
      if (user.role === "owner") return true;
      return user.permissions.includes("*") || user.permissions.includes(permission);
    },
    [user, authEnabled],
  );

  const value = useMemo(
    () => ({
      loading,
      authEnabled,
      dbError,
      dbErrorMessage,
      user,
      can,
      refresh,
      logout,
      setUser,
    }),
    [loading, authEnabled, dbError, dbErrorMessage, user, can, refresh, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
