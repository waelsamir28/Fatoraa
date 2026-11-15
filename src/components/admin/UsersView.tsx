"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  KeyRound,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconCustomers } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, errMsg } from "@/lib/client";
import { Camera, ImageUp, Trash } from "lucide-react";

interface UserRow {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleLabel: string;
  active: boolean;
  branchId: number | null;
  lastLoginAt: string | null;
  permissions: string[];
  hasPin: boolean;
}

interface BranchRow {
  id: number;
  name: string;
  active: boolean;
}

const ROLES = [
  { key: "owner", label: "مالك (كل الصلاحيات)" },
  { key: "manager", label: "مدير" },
  { key: "cashier", label: "كاشير" },
];

/** الصلاحيات التفصيلية القابلة للتخصيص لكل مستخدم */
const GRANULAR: Array<{ key: string; label: string; group: string }> = [
  { key: "view_cost", label: "رؤية سعر التكلفة", group: "الأسعار" },
  { key: "edit_price", label: "تعديل أسعار البيع", group: "الأسعار" },
  { key: "invoice_discount", label: "عمل خصم على الفاتورة", group: "المبيعات" },
  { key: "delete_invoice", label: "حذف فواتير", group: "المبيعات" },
  { key: "edit_saved_invoice", label: "تعديل فاتورة محفوظة", group: "المبيعات" },
  { key: "view_profit", label: "رؤية الأرباح", group: "التقارير" },
  { key: "view_reports", label: "فتح التقارير", group: "التقارير" },
  { key: "manage_products", label: "إضافة/تعديل الأصناف", group: "المخزون" },
  { key: "delete_product", label: "حذف الأصناف", group: "المخزون" },
  { key: "manage_users", label: "إدارة المستخدمين", group: "الإدارة" },
  { key: "manage_settings", label: "تغيير الإعدادات", group: "الإدارة" },
  { key: "manage_backup", label: "النسخ الاحتياطي والاستعادة", group: "الإدارة" },
  { key: "view_audit", label: "فتح سجل المراجعة", group: "الإدارة" },
  { key: "manage_treasury", label: "الخزينة والمصروفات", group: "المالية" },
  { key: "manage_shifts", label: "فتح/تقفيل الورديات", group: "المالية" },
];

const emptyForm = {
  id: 0,
  username: "",
  password: "",
  fullName: "",
  role: "cashier",
  branchId: "",
  active: true,
  pin: "",
  permissions: [] as string[],
};

export function UsersView() {
  const { toast, confirm } = useDesktop();
  const { user: me, can } = useAuth();
  const [items, setItems] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  /** صورة المستخدم الظاهرة في الشاشة الرئيسية */
  const [avatar, setAvatar] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([
        api<{ items: UserRow[] }>("/api/users"),
        api<{ items: BranchRow[] }>("/api/branches").catch(() => ({ items: [] })),
      ]);
      setItems(u.items);
      setBranches(b.items);
      const av = await api<{ avatar: string }>("/api/users/avatar").catch(() => ({ avatar: "" }));
      setAvatar(av.avatar);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    if (!form.id && (form.username.trim().length < 3 || form.password.length < 6)) {
      return toast("اسم المستخدم 3 أحرف على الأقل وكلمة المرور 6 أحرف", "error");
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        username: form.username,
        fullName: form.fullName,
        role: form.role,
        active: form.active,
        branchId: form.branchId ? Number(form.branchId) : null,
      };
      if (form.password) payload.password = form.password;
      if (form.pin) payload.pin = form.pin;
      if (form.id) payload.permissions = form.permissions;
      if (form.id) {
        payload.id = form.id;
        await api("/api/users", { method: "PATCH", json: payload });
        toast("تم تحديث بيانات المستخدم ✓");
      } else {
        await api("/api/users", { method: "POST", json: payload });
        toast("تم إنشاء المستخدم ✓");
      }
      setForm(null);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  /** رفع صورة المستخدم للعرض في الشاشة الرئيسية */
  const uploadAvatar = (file: File) => {
    if (file.size > 700 * 1024) return toast("الصورة كبيرة — اختار صورة أصغر من 700 كيلوبايت", "error");
    const reader = new FileReader();
    reader.onload = async () => {
      setAvatarBusy(true);
      try {
        const r = await api<{ avatar: string }>("/api/users/avatar", {
          method: "PUT",
          json: { avatar: reader.result as string },
        });
        setAvatar(r.avatar);
        toast("تم تحديث صورة المستخدم ✓ — ستظهر في أعلى الشاشة الرئيسية");
      } catch (e) {
        toast(errMsg(e), "error");
      } finally {
        setAvatarBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = async () => {
    setAvatarBusy(true);
    try {
      await api("/api/users/avatar", { method: "PUT", json: { avatar: "" } });
      setAvatar("");
      toast("تمت استعادة الصورة الافتراضية");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setAvatarBusy(false);
    }
  };

  const remove = async (u: UserRow) => {
    const ok = await confirm(`حذف المستخدم «${u.fullName || u.username}» نهائياً؟`);
    if (!ok) return;
    try {
      await api(`/api/users?id=${u.id}`, { method: "DELETE" });
      toast("تم حذف المستخدم");
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const toggle = async (u: UserRow) => {
    try {
      await api("/api/users", { method: "PATCH", json: { id: u.id, active: !u.active } });
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  if (!can("users") && me?.role !== "owner") {
    return (
      <Window title="المستخدمون" icon={<UsersIcon className="h-9 w-9" />}>
        <div className="grid h-full place-items-center p-6">
          <div className="panel flex max-w-[460px] flex-col items-center gap-2 p-6 text-center">
            <ShieldAlert className="h-12 w-12 text-red-500" />
            <div className="text-[17px] font-black text-[#0b2350]">ليس لديك صلاحية</div>
            <p className="text-[13.5px] font-bold text-slate-600">إدارة المستخدمين متاحة للمالك فقط.</p>
          </div>
        </div>
      </Window>
    );
  }

  return (
    <Window
      title="المستخدمون والصلاحيات"
      icon={<IconCustomers className="h-9 w-9" />}
      statusBar={<span>عدد المستخدمين: {items.length}</span>}
    >
      <div className="h-full overflow-auto p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[14px] font-bold text-slate-600">
            كل مستخدم له دور وصلاحيات محددة. الكاشير لا يرى التقارير أو الإعدادات.
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...emptyForm })}
            className="btn btn-blue flex h-9 items-center gap-1.5 px-3 text-[13.5px]"
          >
            <UserPlus className="h-4 w-4" /> مستخدم جديد
          </button>
        </div>

        {/* صورة المستخدم في الشاشة الرئيسية */}
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border-2 border-[#c9d8ee] bg-[#f4f8fd] p-2.5">
          <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar || "/images/avatar-user.png"} alt="صورة المستخدم" className="h-full w-full object-cover object-[center_18%]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-black text-[#0b2350]">صورة المستخدم في الشاشة الرئيسية</div>
            <div className="text-[11.5px] font-bold text-slate-600">
              ارفع صورة شخصية (JPG/PNG حتى 700 كيلوبايت) — تظهر داخل الدائرة أعلى الشاشة الرئيسية.
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <label className={`btn btn-blue flex h-9 cursor-pointer items-center gap-1.5 px-3 text-[13px] font-black ${avatarBusy ? "opacity-60" : ""}`}>
              {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              اختيار صورة
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </label>
            {avatar && (
              <button type="button" className="btn h-9 px-2.5 text-[13px] font-black" onClick={() => void clearAvatar()} title="استعادة الافتراضية">
                <Trash className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#c9d8ee] bg-white">
            <table className="w-full text-right text-[13px]">
              <thead>
                <tr className="bg-[#0b2350] text-white">
                  <th className="px-3 py-2 font-black">الاسم</th>
                  <th className="px-3 py-2 font-black">اسم الدخول</th>
                  <th className="px-3 py-2 font-black">الدور</th>
                  <th className="px-3 py-2 font-black">الفرع</th>
                  <th className="px-3 py-2 font-black">الصلاحيات</th>
                  <th className="px-3 py-2 font-black">PIN</th>
                  <th className="px-3 py-2 font-black">الحالة</th>
                  <th className="px-3 py-2 font-black">آخر دخول</th>
                  <th className="px-3 py-2 font-black">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 font-bold last:border-0 hover:bg-[#f5f9ff]">
                    <td className="px-3 py-2 text-[#0b2350]">
                      {u.fullName || u.username}
                      {u.id === me?.id && (
                        <span className="mr-1 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[10px] text-blue-800">
                          <BadgeCheck className="h-3 w-3" /> أنت
                        </span>
                      )}
                    </td>
                    <td className="num px-3 py-2 text-slate-600" dir="ltr">
                      {u.username}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11.5px] ${
                          u.role === "owner"
                            ? "bg-amber-100 text-amber-900"
                            : u.role === "manager"
                              ? "bg-blue-100 text-blue-900"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.roleLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {branches.find((b) => b.id === u.branchId)?.name || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-[#eef5fd] px-1.5 py-0.5 text-[10.5px] font-black text-[#0f2942]">
                        {u.role === "owner" ? "كل الصلاحيات" : `${(u.permissions || []).length} إضافية`}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10.5px] font-black ${
                          u.hasPin ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.hasPin ? "محدد ✓" : "بدون"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggle(u)}
                        className={`rounded px-1.5 py-0.5 text-[11.5px] font-black ${
                          u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.active ? "مفعّل" : "موقوف"}
                      </button>
                    </td>
                    <td className="num px-3 py-2 text-[11.5px] text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              id: u.id,
                              username: u.username,
                              password: "",
                              fullName: u.fullName,
                              role: u.role,
                              branchId: u.branchId ? String(u.branchId) : "",
                              active: u.active,
                              pin: "",
                              permissions: u.permissions || [],
                            })
                          }
                          className="rounded bg-slate-100 p-1 text-slate-700 hover:bg-slate-200"
                          title="تعديل"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(u)}
                          disabled={u.id === me?.id}
                          className="rounded bg-red-50 p-1 text-red-600 hover:bg-red-100 disabled:opacity-30"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      لا يوجد مستخدمون بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(5,20,55,.45)] p-4">
          <div className="w-full max-w-[460px] overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0b2350] px-4 py-2.5 text-white">
              <div className="flex items-center gap-2 text-[15px] font-black">
                <UsersIcon className="h-4 w-4" />
                {form.id ? "تعديل مستخدم" : "مستخدم جديد"}
              </div>
              <button type="button" onClick={() => setForm(null)} className="rounded px-2 hover:bg-white/20">
                ✕
              </button>
            </div>
            <div className="space-y-2.5 p-4">
              <FormRow label="الاسم الكامل">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none"
                  placeholder="مثال: محمد أحمد"
                />
              </FormRow>
              <FormRow label="اسم الدخول">
                <input
                  dir="ltr"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={Boolean(form.id)}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                  placeholder="username"
                />
              </FormRow>
              <FormRow label={form.id ? "كلمة مرور جديدة (اتركها فارغة بدون تغيير)" : "كلمة المرور"}>
                <div className="relative">
                  <KeyRound className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    dir="ltr"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 pr-8 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none"
                    placeholder="••••••"
                  />
                </div>
              </FormRow>
              <FormRow label="الدور">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="رمز الدخول السريع PIN (4-6 أرقام — اختياري)">
                <input
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-center font-mono text-[15px] font-black tracking-[0.4em] focus:border-blue-600 focus:outline-none"
                  placeholder={form.id ? "اتركه فارغاً بدون تغيير" : "1234"}
                />
              </FormRow>

              {form.role !== "owner" && (
                <div className="rounded-lg border border-[#c9d8ee] bg-[#f7faff] p-2">
                  <div className="mb-1 text-[12px] font-black text-slate-600">صلاحيات إضافية لهذا المستخدم</div>
                  <div className="grid max-h-[170px] grid-cols-2 gap-x-3 gap-y-0.5 overflow-auto">
                    {GRANULAR.map((g) => {
                      const on = form.permissions.includes(g.key);
                      return (
                        <label
                          key={g.key}
                          className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-bold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={on}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                permissions: e.target.checked
                                  ? [...form.permissions, g.key]
                                  : form.permissions.filter((k) => k !== g.key),
                              })
                            }
                          />
                          {g.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <FormRow label="الفرع">
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 text-[13.5px] font-bold focus:border-blue-600 focus:outline-none"
                >
                  <option value="">بدون فرع محدد</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FormRow>
            </div>
            <div className="flex justify-end gap-2 border-t bg-[#f7faff] px-4 py-2.5">
              <button type="button" onClick={() => setForm(null)} className="btn h-9 px-3 text-[13px]">
                إلغاء
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="btn btn-green flex h-9 items-center gap-1.5 px-4 text-[13px] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </Window>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-[12px] font-black text-slate-600">{label}</label>
      {children}
    </div>
  );
}
