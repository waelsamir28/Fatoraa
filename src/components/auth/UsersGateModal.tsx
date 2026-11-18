"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  User,
  UserPlus,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/client";
import { APP_VERSION, DEFAULT_LOGO } from "@/lib/constants";
import { useAuth, type SessionUser } from "./AuthProvider";

export interface PublicUserCard {
  id: number;
  username: string;
  fullName: string;
  role: "owner" | "manager" | "cashier" | string;
  roleLabel: string;
  active: boolean;
  hasPin: boolean;
}

interface WhoResponse {
  items: PublicUserCard[];
  total: number;
  owners: number;
  dbError?: boolean;
}

const ROLE_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  owner: { border: "#9d5d00", bg: "#fff6e3", text: "#9d5d00" },
  manager: { border: "#0067c0", bg: "#eaf2fc", text: "#0067c0" },
  cashier: { border: "#5c2e91", bg: "#f2edfa", text: "#5c2e91" },
};

const REMEMBER_KEY = "fatora.remembered_username";

export function UsersGateModal({
  onClose,
  logoSrc = DEFAULT_LOGO,
}: {
  onClose?: () => void;
  logoSrc?: string;
}) {
  const { setUser, refresh } = useAuth();

  // قائمة المستخدمين
  const [users, setUsers] = useState<PublicUserCard[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string>("");

  // بيانات الدخول
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // إنشاء مستخدم جديد
  const [createOpen, setCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<"cashier" | "manager" | "owner">("cashier");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const passRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api<WhoResponse>("/api/users/who");
      const items = r.items ?? [];
      setUsers(items);

      // لو فيه اسم محفوظ في المتصفح نختاره تلقائياً
      const saved = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_KEY) || "" : "";
      if (saved && items.some((u) => u.username === saved)) {
        setUsername(saved);
        setSelectedUsername(saved);
      } else if (items.length > 0 && !username) {
        const firstOwner = items.find((u) => u.role === "owner" && u.active) ?? items[0];
        setUsername(firstOwner.username);
        setSelectedUsername(firstOwner.username);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  }, [username]);

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.roleLabel.toLowerCase().includes(q),
    );
  }, [users, query]);

  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  const pickUser = (u: PublicUserCard) => {
    setSelectedUsername(u.username);
    setUsername(u.username);
    setError("");
    setPinMode(false);
    setTimeout(() => passRef.current?.focus(), 30);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (pinMode) {
      const cleanPin = pin.replace(/\s/g, "");
      if (!/^\d{4,6}$/.test(cleanPin)) {
        setError("الـ PIN يجب أن يكون من 4 إلى 6 أرقام");
        return;
      }
      setSubmitting(true);
      try {
        const res = await api<{ ok: boolean; user?: SessionUser }>("/api/auth/login", {
          method: "POST",
          json: { pin: cleanPin },
        });
        if (res.user) setUser(res.user);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "رمز الدخول غير صحيح");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!username.trim() || !password) {
      setError("أدخل اسم المستخدم وكلمة المرور");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api<{ ok: boolean; user?: SessionUser }>("/api/auth/login", {
        method: "POST",
        json: { username: username.trim(), password },
      });
      if (typeof window !== "undefined") {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, username.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      }
      if (res.user) setUser(res.user);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "اسم المستخدم أو كلمة المرور غلط");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    if (!newFullName.trim() || newUsername.trim().length < 3 || newPassword.length < 6) {
      setCreateMsg({ ok: false, text: "أدخل الاسم، اسم مستخدم (٣+ حروف)، وكلمة مرور (٦+ حروف)" });
      return;
    }
    setCreating(true);
    try {
      await api("/api/users", {
        method: "POST",
        json: {
          fullName: newFullName.trim(),
          username: newUsername.trim(),
          password: newPassword,
          pin: newPin.trim() || undefined,
          role: newRole,
        },
      });
      setCreateMsg({ ok: true, text: "تم إنشاء المستخدم بنجاح" });
      const createdUname = newUsername.trim();
      setNewFullName("");
      setNewUsername("");
      setNewPassword("");
      setNewPin("");
      await loadUsers();
      setUsername(createdUname);
      setSelectedUsername(createdUname);
      setTimeout(() => {
        setCreateOpen(false);
        setCreateMsg(null);
      }, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذّر إنشاء المستخدم";
      setCreateMsg({
        ok: false,
        text: msg.includes("401") || msg.includes("دخول") || msg.includes("صلاحية")
          ? "سجّل الدخول بحساب المالك أولاً لإنشاء مستخدم جديد"
          : msg,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto"
      style={{
        background: "linear-gradient(160deg, #0f2942 0%, #081a2b 100%)",
      }}
    >
      {/* هالات خلفية خفيفة */}
      <div
        className="pointer-events-none fixed -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
        style={{ background: "#0067c0" }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -left-40 h-[520px] w-[520px] rounded-full opacity-15 blur-3xl"
        style={{ background: "#2fb3a6" }}
      />

      {/* النافذة العائمة المتوسطة 1040×620 */}
      <div
        className="animate-modal-enter relative flex w-full max-w-[920px] flex-col overflow-hidden rounded-[18px] shadow-2xl"
        style={{
          height: "min(600px, calc(100vh - 32px))",
          background: "#f2f7fd",
          boxShadow: "0 30px 75px -12px rgba(4, 18, 42, 0.58), 0 14px 36px -8px rgba(0, 103, 192, 0.25)",
        }}
      >
        {/* شريط العنوان */}
        <div
          className="flex h-[46px] shrink-0 items-center justify-between px-4 select-none"
          style={{
            background: "linear-gradient(180deg, #123a63 0%, #0e2e50 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src={logoSrc}
              alt="فاتورة"
              className="h-[26px] w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="leading-tight">
              <div className="text-[10px] font-bold text-[#9fc0e2]">نظام فاتورة</div>
              <div className="text-[14px] font-black text-white">إدارة المستخدمين والصلاحيات</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 pl-1">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/15" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/15" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/15" />
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="إغلاق"
                className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-[#c42b1c] text-white hover:brightness-110 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* المحتوى: عمودين (يمين: المستخدمون، شمال: بيانات الدخول) */}
        <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[1fr_372px] gap-3.5 p-3.5">
          {/* العمود اليمين: قائمة المستخدمين أو نموذج مستخدم جديد */}
          <div className="flex min-h-0 flex-col rounded-[12px] border border-[#c9d8ee] bg-white p-4">
            {!createOpen ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[16px] font-black text-[#0b2350]">المستخدمون</h2>
                    <p className="text-[11px] font-bold text-[#5a7593]">
                      دوس على اسم المستخدم لجلب بيانات دخوله
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateOpen(true);
                      setCreateMsg(null);
                    }}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-[#0f7b0f] px-3 text-[11px] font-black text-white hover:brightness-110 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>مستخدم جديد</span>
                  </button>
                </div>

                {/* بحث */}
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a7593]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="بحث بالاسم أو اسم الدخول..."
                    className="h-8 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] pr-8 pl-3 text-[11.5px] font-bold text-[#0b2350] placeholder:text-[#a3b6cd] focus:border-[#0067c0] focus:outline-none"
                  />
                </div>

                {/* كروت المستخدمين */}
                <div className="mt-3 flex-1 min-h-0 overflow-y-auto pl-0.5">
                  {loadingList ? (
                    <div className="flex h-full items-center justify-center text-[12px] font-bold text-[#5a7593]">
                      جاري تحميل المستخدمين...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[12px] font-bold text-[#5a7593]">
                      لا يوجد مستخدمون مطابقون
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filtered.map((u) => {
                        const sel = selectedUsername === u.username;
                        const rs = ROLE_STYLES[u.role] ?? ROLE_STYLES.cashier;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => pickUser(u)}
                            className={`group relative flex items-center gap-3 rounded-[10px] border p-2.5 text-right transition ${
                              sel
                                ? "border-2 border-[#0067c0] bg-[#f4f8fd] shadow-sm"
                                : "border-[#c9d8ee] bg-white hover:border-[#8ab4e8] hover:bg-[#f8fbff]"
                            }`}
                          >
                            {/* أفاتار */}
                            <div className="relative shrink-0">
                              <div
                                className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full border-2 bg-[#eaf2fc]"
                                style={{
                                  borderColor: rs.border,
                                  filter: u.active ? "none" : "grayscale(100%)",
                                }}
                              >
                                <img
                                  src="/images/avatar-user.png"
                                  alt={u.fullName}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <span
                                className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-white"
                                style={{ background: u.active ? "#0f7b0f" : "#b8c6d6" }}
                              />
                            </div>

                            {/* الاسم والدور */}
                            <div className="min-w-0 flex-1">
                              <div
                                className={`truncate text-[12.5px] font-black ${
                                  u.active ? "text-[#0b2350]" : "text-[#8496ab]"
                                }`}
                              >
                                {u.fullName}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span
                                  className="inline-block rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-black"
                                  style={{ background: rs.bg, color: rs.text }}
                                >
                                  {u.roleLabel}
                                </span>
                                {u.hasPin && (
                                  <span className="inline-block rounded-[4px] bg-[#fff4e0] px-1.5 py-0.5 text-[8.5px] font-black text-[#9d5d00]">
                                    PIN
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 truncate text-[10px] font-bold text-[#94a9c4]" dir="ltr">
                                {u.username}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ملاحظة الأمان */}
                <div className="mt-3 flex items-center gap-2 rounded-[7px] bg-[#eef7fd] px-3 py-1.5 text-[10px] font-bold text-[#3f6f9e]">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2fb3a6]" />
                  <span>الصور والأسماء فقط — التحقق من كلمة المرور يتم على الخادم</span>
                </div>
              </>
            ) : (
              /* نموذج إنشاء مستخدم جديد */
              <form onSubmit={handleCreateUser} className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[#e3edf8] pb-2.5">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-[#0f7b0f]" />
                    <h2 className="text-[15px] font-black text-[#0b2350]">إنشاء مستخدم جديد</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="rounded-[6px] border border-[#c9d8ee] px-2.5 py-1 text-[11px] font-bold text-[#5a7593] hover:bg-[#f2f7fd]"
                  >
                    رجوع للقائمة
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 content-start">
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-[#5a7593]">الاسم الكامل</label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="مثال: أحمد علي"
                      className="h-9 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] px-3 text-[12px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-[#5a7593]">اسم المستخدم</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="ahmed"
                      dir="ltr"
                      className="h-9 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] px-3 text-[12px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-[#5a7593]">كلمة المرور</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="٦ حروف على الأقل"
                      className="h-9 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] px-3 text-[12px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-[#5a7593]">الدور</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "cashier" | "manager" | "owner")}
                      className="h-9 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] px-3 text-[12px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    >
                      <option value="cashier">كاشير</option>
                      <option value="manager">مدير</option>
                      <option value="owner">مالك</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-black text-[#5a7593]">
                      رمز PIN سريع (اختياري — ٤ إلى ٦ أرقام)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="مثال: 1234"
                      dir="ltr"
                      className="h-9 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] px-3 text-[12px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    />
                  </div>
                </div>

                {createMsg && (
                  <div
                    className={`mb-2.5 flex items-center gap-2 rounded-[8px] border px-3 py-2 text-[11px] font-black ${
                      createMsg.ok
                        ? "border-[#b5e4b5] bg-[#eefbee] text-[#0f7b0f]"
                        : "border-[#f0b5b0] bg-[#fdeceb] text-[#a01a10]"
                    }`}
                  >
                    {createMsg.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{createMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0f7b0f] text-[13px] font-black text-white hover:brightness-110 disabled:opacity-60 transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{creating ? "جاري الحفظ..." : "حفظ المستخدم الجديد"}</span>
                </button>
              </form>
            )}
          </div>

          {/* العمود الشمال: بيانات الدخول */}
          <form
            onSubmit={handleLogin}
            className="flex min-h-0 flex-col rounded-[12px] border border-[#c9d8ee] bg-white p-4"
          >
            {/* الشعار */}
            <div className="flex flex-col items-center pt-1 pb-2">
              <img
                src={logoSrc}
                alt="فاتورة"
                className="h-[46px] w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="mt-1.5 text-[10.5px] font-black text-[#5a7593]">
                نظام فاتورة — إدارة المستخدمين
              </div>
            </div>

            <div className="mt-1">
              <h2 className="text-[16px] font-black text-[#0b2350]">بيانات الدخول</h2>
              <p className="text-[10.5px] font-bold text-[#5a7593]">
                {pinMode ? "أدخل رمز PIN السريع (٤–٦ أرقام)" : "ادخل باسم المستخدم وكلمة المرور"}
              </p>
            </div>

            {!pinMode ? (
              <div className="mt-3 space-y-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#5a7593]">اسم المستخدم</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0067c0]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      dir="ltr"
                      className="h-10 w-full rounded-[8px] border border-[#c9d8ee] bg-[#f8fbff] pr-3 pl-9 text-right text-[13px] font-bold text-[#0b2350] focus:border-[#0067c0] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black text-[#5a7593]">كلمة المرور</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a7593] hover:text-[#0b2350]"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <input
                      ref={passRef}
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-[8px] border-2 border-[#2fb3a6] bg-white pr-3 pl-9 text-[13px] font-bold text-[#0b2350] shadow-[0_0_0_3px_rgba(47,179,166,0.15)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-[11px] font-black text-[#5a7593]">رمز PIN</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d5d00]" />
                  <input
                    ref={pinRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    dir="ltr"
                    className="h-11 w-full rounded-[8px] border-2 border-[#2fb3a6] bg-white px-3 text-center text-[18px] tracking-[0.4em] font-black text-[#0b2350] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* زر الدخول */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex h-[44px] w-full items-center justify-between rounded-[9px] bg-[#0067c0] px-4 text-[15px] font-black text-white shadow-[0_6px_16px_rgba(0,103,192,0.3)] hover:brightness-110 disabled:opacity-60 transition"
            >
              <span>{submitting ? "جاري الدخول..." : "دخول"}</span>
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* تذكّرني */}
            {!pinMode && (
              <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                <label className="flex cursor-pointer items-center gap-1.5 font-bold text-[#5a7593]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#0067c0] accent-[#0067c0]"
                  />
                  <span>تذكّر اسم المستخدم</span>
                </label>
              </div>
            )}

            <div className="my-2.5 h-px bg-[#e3edf8]" />

            {/* تبديل PIN */}
            <button
              type="button"
              onClick={() => {
                setPinMode((v) => !v);
                setError("");
                setTimeout(() => (pinMode ? passRef.current?.focus() : pinRef.current?.focus()), 30);
              }}
              className="flex h-9 w-full items-center justify-between rounded-[8px] bg-[#eaf2fc] px-3 text-[11px] font-black text-[#0b2350] hover:bg-[#dceafb] transition"
            >
              <span>{pinMode ? "الرجوع للدخول بكلمة المرور" : "دخول سريع برمز PIN (كاشير)"}</span>
              <KeyRound className="h-3.5 w-3.5 text-[#9d5d00]" />
            </button>

            {/* رسالة الخطأ */}
            {error && (
              <div className="mt-2.5 flex items-center gap-2 rounded-[8px] border border-[#f0b5b0] bg-[#fdeceb] px-3 py-2 text-[10.5px] font-black text-[#a01a10]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* أسفل اللوحة */}
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between rounded-[7px] bg-[#eef7fd] px-3 py-1.5 text-[9.5px] font-bold text-[#3f6f9e]">
                <span>اتصال آمن — كلمة المرور مشفّرة (scrypt)</span>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2fb3a6]" />
              </div>
            </div>
          </form>
        </div>

        {/* الشريط السفلي */}
        <div className="flex h-[40px] shrink-0 items-center justify-between px-4 text-[10px] font-bold text-[#94a9c4]">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] border border-[#c9d8ee] bg-white px-4 py-1 text-[11px] font-black text-[#5a7593] hover:bg-[#f8fbff]"
              >
                إغلاق
              </button>
            )}
            <span>
              {users.length} مستخدمين — {activeCount} مفعّلين
            </span>
          </div>
          <div>نسخة {APP_VERSION} • نظام فاتورة</div>
        </div>
      </div>
    </div>
  );
}
