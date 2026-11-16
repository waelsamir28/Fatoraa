"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  MonitorSmartphone,
  RotateCcw,
  Save,
  ShieldCheck,
  Square,
  SquareCheckBig,
  UserRound,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, errMsg } from "@/lib/client";

interface PageRow {
  path: string;
  label: string;
  perm: string;
  homeButton: boolean;
}

interface UserRow {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleLabel?: string;
  active: boolean;
  permissions: string[] | string;
  allowedPages: string[] | string;
}

const toArr = (v: string[] | string | undefined | null): string[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const a = JSON.parse(v);
      return Array.isArray(a) ? a.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const GROUPS: Array<{ title: string; match: (p: string) => boolean }> = [
  { title: "البيع والشراء", match: (p) => /^\/(sales|purchases|returns)/.test(p) },
  { title: "المخزون والأصناف", match: (p) => /^\/(products-manager|item-card|inventory|stock-movements|low-stock|barcode)/.test(p) },
  { title: "الحسابات والخزينة", match: (p) => /^\/(customers|suppliers|treasury|expenses|installments|shifts)/.test(p) },
  { title: "التقارير", match: (p) => /^\/(reports|profit|dashboard|smart-orders|deleted-invoices)/.test(p) },
  { title: "الإدارة والنظام", match: (p) => /^\/(settings|users|branches|health|connection|audit|backup|backup-schedule|licenses|subscription|support|about|price-checker)/.test(p) || p === "/" },
];

/**
 * «صلاحيات الشاشات» — شاشة واحدة تتحكم في:
 * 1) أي صفحة يفتحها كل حساب.
 * 2) أي زر يظهر له في الشاشة الرئيسية (نفس الاختيار = نفس الأزرار).
 */
export function PagesPermissionsView() {
  const { toast } = useDesktop();
  const { user: me } = useAuth();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selId, setSelId] = useState<number>(0);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        api<{ items: PageRow[] }>("/api/pages"),
        api<{ items: UserRow[] }>("/api/users"),
      ]);
      setPages(p.items);
      setUsers(u.items);
      // نختار أول حساب غير المالك تلقائياً
      setTimeout(() => {
        setSelId((prev) => prev || u.items.find((x) => x.role !== "owner")?.id || u.items[0]?.id || 0);
      }, 0);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const current = useMemo(() => users.find((u) => u.id === selId) || null, [users, selId]);

  // عند اختيار مستخدم: نحمّل صفحاته (فاضي = كل الصفحات)
  useEffect(() => {
    if (!current) return;
    const saved = toArr(current.allowedPages);
    const next = saved.length ? saved : pages.map((p) => p.path);
    const id = setTimeout(() => {
      setAllowed(next);
      setDirty(false);
    }, 0);
    return () => clearTimeout(id);
  }, [current, pages]);

  const togglePage = (path: string) => {
    setAllowed((prev) => {
      const has = prev.includes(path);
      // "/" لا يمكن إخفاؤه — الرئيسية دائماً متاحة
      if (path === "/" && has) return prev;
      return has ? prev.filter((x) => x !== path) : [...prev, path];
    });
    setDirty(true);
  };

  const setGroup = (paths: string[], on: boolean) => {
    setAllowed((prev) => {
      const set = new Set(prev);
      paths.forEach((p) => {
        if (on) set.add(p);
        else if (p !== "/") set.delete(p);
      });
      return Array.from(set);
    });
    setDirty(true);
  };

  const save = async () => {
    if (!current) return;
    setBusy(true);
    try {
      const all = pages.map((p) => p.path).sort();
      const picked = [...allowed].sort();
      const isAll = JSON.stringify(all) === JSON.stringify(picked);
      // لو كل الصفحات مختارة، نخزّن فاضي = «حسب الدور» (أخف وأوضح)
      await api("/api/users", {
        method: "PATCH",
        json: { id: current.id, allowedPages: isAll ? [] : picked },
      });
      setDirty(false);
      toast(`تم حفظ صلاحيات «${current.fullName}» ✓ — تُطبَّق عند دخوله القادم`);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const isOwner = current?.role === "owner";

  return (
    <Window
      title="صلاحيات الشاشات — مين يشوف إيه في البرنامج"
      icon={<IconSettings className="h-9 w-9" />}
      statusBar={
        <>
          <span>اختر الحساب ثم حدّد الشاشات المسموح بها</span>
          <span className="sep" />
          <span className="ms-auto">{dirty ? "⚠ توجد تعديلات غير محفوظة" : "محفوظ ✓"}</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-2 bg-[#eef3fa] p-2">
        {loading ? (
          <div className="grid h-full place-items-center gap-2 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-[14px] font-black">جارٍ تحميل الحسابات والشاشات…</span>
          </div>
        ) : (
          <>
            {/* اختيار الحساب */}
            <div className="shrink-0 rounded-xl border-2 border-[#c9d8ee] bg-white p-2 shadow-sm">
              <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
                <UserRound className="h-4 w-4" /> الحساب
              </div>
              <div className="flex flex-wrap gap-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (dirty && !window.confirm("هناك تعديلات غير محفوظة — تريد تجاهلها؟")) return;
                      setSelId(u.id);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-[12.5px] font-black transition ${
                      selId === u.id ? "border-[#2fb3a6] bg-[#eefaf8] text-[#0c2340]" : "border-slate-200 bg-white text-slate-600 hover:border-[#8fb3e0]"
                    }`}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0f2942] text-[11px] font-black text-white">
                      {u.fullName.trim().charAt(0)}
                    </span>
                    <span>{u.fullName}</span>
                    <span className="text-[10.5px] font-bold text-slate-400">
                      {u.role === "owner" ? "مالك" : u.role === "manager" ? "مدير" : "كاشير"}
                      {!u.active && " — موقوف"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* الصفحات */}
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-[#c9d8ee] bg-white p-2 shadow-sm">
              {isOwner ? (
                <div className="grid h-full place-items-center gap-2 p-4 text-center">
                  <ShieldCheck className="h-9 w-9 text-emerald-600" />
                  <div className="text-[15px] font-black text-[#0f2942]">حساب المالك يرى كل الشاشات دائماً</div>
                  <p className="max-w-[430px] text-[12.5px] font-bold leading-6 text-slate-500">
                    لحماية نفسك من الإغلاق بالخطأ، لا يمكن تقييد حساب المالك. أنشئ حساب «كاشير» أو «مدير» وحدّد له الشاشات.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-[#f4f8fd] px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-black text-[#0f2942]">
                      <MonitorSmartphone className="h-4 w-4" />
                      الشاشات الظاهرة في الشاشة الرئيسية = نفس الشاشات المسموح بها
                    </span>
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11.5px] font-black text-slate-600 hover:bg-slate-50"
                        onClick={() => setGroup(pages.map((p) => p.path), true)}
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11.5px] font-black text-slate-600 hover:bg-slate-50"
                        onClick={() => setGroup(pages.filter((p) => p.path !== "/").map((p) => p.path), false)}
                      >
                        إلغاء الكل
                      </button>
                    </span>
                  </div>

                  {GROUPS.map((g) => {
                    const list = pages.filter((p) => g.match(p.path));
                    if (!list.length) return null;
                    const onCount = list.filter((p) => allowed.includes(p.path)).length;
                    return (
                      <div key={g.title} className="overflow-hidden rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between bg-[#0f2942] px-2.5 py-1 text-white">
                          <span className="text-[12.5px] font-black">{g.title}</span>
                          <span className="flex items-center gap-2">
                            <span className="num text-[11px] font-bold text-blue-200">
                              {onCount}/{list.length}
                            </span>
                            <button
                              type="button"
                              className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-black hover:bg-white/25"
                              onClick={() => setGroup(list.map((p) => p.path), onCount !== list.length)}
                            >
                              {onCount === list.length ? "إلغاء" : "تحديد"}
                            </button>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 p-1.5 sm:grid-cols-2 xl:grid-cols-3">
                          {list.map((p) => {
                            const on = allowed.includes(p.path);
                            const locked = p.path === "/";
                            return (
                              <button
                                key={p.path}
                                type="button"
                                disabled={locked}
                                onClick={() => togglePage(p.path)}
                                className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-right text-[11.5px] font-bold transition ${
                                  on ? "bg-[#eefaf8] text-[#0c2340]" : "bg-slate-50 text-slate-400"
                                } ${locked ? "opacity-70" : "hover:bg-[#e2f2ff]"}`}
                              >
                                {on ? (
                                  <SquareCheckBig className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />
                                ) : (
                                  <Square className="h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={3} />
                                )}
                                <span className="truncate">{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* الأزرار */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="btn btn-green h-10 px-5 text-[14px] font-black shadow"
                onClick={() => void save()}
                disabled={busy || !current || isOwner}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ صلاحيات الشاشات
              </button>
              <button
                type="button"
                className="btn h-10 px-4 text-[13px] font-black"
                onClick={() => {
                  if (!current) return;
                  const saved = toArr(current.allowedPages);
                  setAllowed(saved.length ? saved : pages.map((p) => p.path));
                  setDirty(false);
                  toast("تمت استعادة المحفوظ", "info");
                }}
                disabled={!current || isOwner}
              >
                <RotateCcw className="h-4 w-4" /> تراجع
              </button>
              <span className="flex items-center gap-1 text-[12px] font-bold text-slate-500">
                <Check className="h-4 w-4 text-emerald-600" />
                أي شاشة غير محددة تُخفى زرها وتُمنع حتى لو كتب رابطها يدوياً.
              </span>
              {me?.role !== "owner" && (
                <span className="text-[12px] font-bold text-red-600">هذه الشاشة للمالك فقط.</span>
              )}
            </div>
          </>
        )}
      </div>
    </Window>
  );
}
