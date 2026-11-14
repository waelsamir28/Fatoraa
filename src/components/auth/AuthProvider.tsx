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

interface AuthState {
  loading: boolean;
  authEnabled: boolean;
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
  const [user, setUser] = useState<SessionUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ authEnabled: boolean; user: SessionUser | null }>("/api/auth/me");
      setAuthEnabled(Boolean(r.authEnabled));
      setUser(r.user);
    } catch {
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
      if (!user) return !authEnabled; // قبل تفعيل الحسابات: كله مسموح
      if (user.role === "owner") return true;
      return user.permissions.includes("*") || user.permissions.includes(permission);
    },
    [user, authEnabled],
  );

  const value = useMemo(
    () => ({ loading, authEnabled, user, can, refresh, logout, setUser }),
    [loading, authEnabled, user, can, refresh, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
