"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Cloud,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldOff,
  TriangleAlert,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api } from "@/lib/client";

interface Row {
  id: number;
  deviceId: string;
  storeName: string;
  revoked: boolean;
  revokedAt: string | null;
  note: string;
  lastSeenAt: string | null;
  plan: string;
  expiresAt: string | null;
  revenue: number;
  activations: number;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "لم يتصل بعد";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
};

/**
 * «التحكم عن بُعد في الأجهزة» — من لوحة السحابة:
 * تعرف كل جهاز مفعّل، آخر ظهور، نوع اشتراكه، وتقدر توقف تفعيله فوراً.
 */
export function DeviceControlView() {
  const { toast, confirm } = useDesktop();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Row[] }>("/api/device-control");
      setRows(r.items);
    } catch {
      toast("تعذّر تحميل الأجهزة — تأكد من اتصال قاعدة البيانات السحابية", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const change = async (row: Row, revoke: boolean) => {
    if (
      !(await confirm(
        revoke
          ? `إيقاف تفعيل الجهاز ${row.deviceId}؟ البرنامج على هذا الجهاز سيقف عند أول اتصال بالسحابة — والبيانات تبقى كما هي.`
          : `إعادة تفعيل الجهاز ${row.deviceId}؟`,
        { title: revoke ? "إيقاف تفعيل جهاز" : "إعادة تفعيل", danger: revoke },
      ))
    )
      return;
    setBusyId(row.deviceId);
    try {
      await api("/api/device-control", { method: "POST", json: { deviceId: row.deviceId, action: revoke ? "revoke" : "restore" } });
      toast(revoke ? "تم إيقاف تفعيل الجهاز ✓" : "تم إعادة تفعيل الجهاز ✓");
      await load();
    } catch {
      toast("فشل تنفيذ الإجراء", "error");
    } finally {
      setBusyId("");
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === "active" && r.revoked) return false;
        if (filter === "revoked" && !r.revoked) return false;
        if (!q.trim()) return true;
        const t = q.trim().toLowerCase();
        return r.deviceId.toLowerCase().includes(t) || (r.storeName || "").toLowerCase().includes(t);
      }),
    [rows, q, filter],
  );

  return (
    <Window
      title="التحكم عن بُعد في أجهزة العملاء"
      icon={<IconSettings className="h-9 w-9" />}
      statusBar={
        <>
          <span>الأجهزة المسجّلة: {rows.length}</span>
          <span className="sep" />
          <span>الموقوفة: {rows.filter((r) => r.revoked).length}</span>
          <span className="ms-auto">الإيقاف يُطبَّق عند أول اتصال للجهاز بالسحابة</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-2 bg-[#eef3fa] p-2">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border-2 border-[#c9d8ee] bg-white p-2 shadow-sm">
          <span className="flex items-center gap-1.5 rounded-lg bg-[#eaf2ff] px-2 py-1 text-[12px] font-black text-[#0f2942]">
            <Cloud className="h-4 w-4 text-[#1a6fd0]" /> لوحة السحابة
          </span>
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 px-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بكود الجهاز أو اسم المحل"
              className="h-7 w-[220px] text-[12.5px] font-bold outline-none"
            />
          </div>
          {(
            [
              ["all", "الكل"],
              ["active", "مفعّل"],
              ["revoked", "موقوف"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-lg border-2 px-2.5 py-1 text-[12px] font-black transition ${
                filter === k ? "border-[#2fb3a6] bg-[#eefaf8] text-[#0c2340]" : "border-slate-200 text-slate-500 hover:border-[#8fb3e0]"
              }`}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={() => void load()} className="btn h-8 px-3 text-[12px] font-black">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-[#c9d8ee] bg-white p-2 shadow-sm">
          {loading ? (
            <div className="grid h-full place-items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[13px] font-black">جارٍ تحميل الأجهزة…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-full place-items-center gap-1 text-center">
              <MonitorSmartphone className="mx-auto h-8 w-8 text-slate-300" />
              <div className="text-[13px] font-black text-slate-500">لا توجد أجهزة مسجّلة بعد</div>
              <p className="max-w-[380px] text-[11.5px] font-bold text-slate-400">
                يظهر الجهاز هنا تلقائياً أول ما يتصل بالسحابة أو أول ما تُفعّله بكود من لوحة التراخيص.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border-2 p-2 ${
                    r.revoked ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[13px] font-black text-[#0f2942]" dir="ltr">
                        {r.deviceId}
                      </span>
                      {r.revoked ? (
                        <span className="flex items-center gap-0.5 rounded bg-red-600 px-1.5 text-[10.5px] font-black text-white">
                          <ShieldOff className="h-3 w-3" /> موقوف
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 text-[10.5px] font-black text-white">
                          <CheckCircle2 className="h-3 w-3" /> مفعّل
                        </span>
                      )}
                      {r.storeName && <span className="text-[12px] font-black text-slate-700">{r.storeName}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                      <span>آخر ظهور: {timeAgo(r.lastSeenAt)}</span>
                      {r.plan && <span className="rounded bg-slate-100 px-1">{r.plan === "year" ? "سنة" : r.plan === "two-years" ? "سنتين" : "مدى الحياة"}</span>}
                      {r.expiresAt && <span>ينتهي: {new Date(r.expiresAt).toLocaleDateString("ar-EG")}</span>}
                      <span>تفعيلات: {r.activations}</span>
                      {r.revenue > 0 && <span className="num text-emerald-700">{r.revenue.toLocaleString("ar-EG")} ج.م</span>}
                      {r.revokedAt && <span className="text-red-600">أُوقف: {new Date(r.revokedAt).toLocaleDateString("ar-EG")}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {r.revoked ? (
                      <button
                        type="button"
                        onClick={() => void change(r, false)}
                        disabled={busyId === r.deviceId}
                        className="flex h-8 items-center gap-1 rounded bg-emerald-600 px-2.5 text-[11.5px] font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === r.deviceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        إعادة تفعيل
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void change(r, true)}
                        disabled={busyId === r.deviceId}
                        className="flex h-8 items-center gap-1 rounded bg-red-600 px-2.5 text-[11.5px] font-black text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {busyId === r.deviceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                        إيقاف التفعيل
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] font-bold leading-5 text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            عند إيقاف جهاز: البرنامج عليه يظهر شاشة «انتهى التفعيل» عند أول اتصال بالسحابة، وبياناته لا تُحذف. لإعادة فتحه
            اضغط «إعادة تفعيل»، أو أرسل له كود تفعيل جديد.
          </span>
        </div>
      </div>
    </Window>
  );
}
