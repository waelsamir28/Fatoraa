"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  Copy,
  Crown,
  KeyRound,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { PLAN_DEFS, type PlanKey } from "@/lib/license-plans";

interface DeviceRow {
  deviceId: string;
  plan: string;
  planLabel: string;
  price: number;
  kind: string;
  activatedAt: string;
  expiresAt: string | null;
  active: boolean;
  daysLeft: number | null;
  extraDevices: string[];
}

interface Stats {
  revenue: number;
  monthRevenue: number;
  active: number;
  expiringSoon: number;
  total: number;
}

interface RenewReq {
  plan: string;
  planLabel: string;
  price: number;
  deviceId: string;
  currentPlan: string | null;
  currentExpiresAt: string | null;
  at: string;
  user: string;
}

export function LicensesAdminView() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [renewReq, setRenewReq] = useState<RenewReq | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring" | "expired" | "lifetime">("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [newId, setNewId] = useState("");
  const [newPlan, setNewPlan] = useState<PlanKey>("year");
  const [madeCode, setMadeCode] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");
  const [reminderBusy, setReminderBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const r = await api<{ devices: DeviceRow[]; stats: Stats; renewRequest: RenewReq | null }>(
        "/api/license/admin"
      );
      setDevices(r.devices || []);
      setStats(r.stats || null);
      setRenewReq(r.renewRequest);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toUpperCase();
    return devices.filter((d) => {
      if (term && !d.deviceId.includes(term)) return false;
      if (filter === "active") return d.active;
      if (filter === "lifetime") return d.plan === "lifetime";
      if (filter === "expiring") return d.active && d.daysLeft !== null && d.daysLeft <= 30;
      if (filter === "expired") return !d.active;
      return true;
    });
  }, [devices, q, filter]);

  const generate = async () => {
    setMsg("");
    setMadeCode("");
    try {
      const r = await api<{ code: string }>("/api/license/admin", {
        method: "POST",
        json: { deviceId: newId, plan: newPlan },
      });
      setMadeCode(r.code);
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—");

  return (
    <div className="h-full overflow-auto bg-[#eef3fa] p-3" dir="rtl">
      <div className="mx-auto w-full max-w-[1100px] space-y-3">
        {/* الهيدر */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#0067c0] px-4 py-3 text-white shadow">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-[#0f2942]">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[16px] font-black">لوحة التراخيص</div>
            <div className="text-[11.5px] font-bold text-blue-100">كل الأجهزة المفعّلة والخطط وتواريخ الانتهاء</div>
          </div>
          <button
            type="button"
            disabled={reminderBusy}
            onClick={async () => {
              setReminderBusy(true);
              setReminderMsg("");
              try {
                const r = await api<{ sent: unknown[]; telegram: { ok: boolean; error?: string } }>(
                  "/api/license/reminders",
                  { method: "POST" }
                );
                setReminderMsg(
                  r.sent.length
                    ? `تم إرسال ${r.sent.length} تنبيه${r.telegram.ok ? " على تيليجرام ✓" : ` — ${r.telegram.error}`}`
                    : `لا توجد تنبيهات جديدة${r.telegram.error ? ` — ${r.telegram.error}` : ""}`
                );
              } catch (e) {
                setReminderMsg(errMsg(e));
              } finally {
                setReminderBusy(false);
              }
            }}
            className="ms-auto flex h-9 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-[12px] font-black text-[#3b2503] hover:bg-amber-300"
            title="إرسال تنبيهات الاشتراكات القريبة من الانتهاء على تيليجرام"
          >
            <TriangleAlert className={`h-4 w-4 ${reminderBusy ? "animate-pulse" : ""}`} />
            إرسال التنبيهات
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-[12px] font-black hover:bg-white/25"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>

        {reminderMsg && (
          <div className="rounded-xl border border-[#c9d8ee] bg-white px-3 py-2 text-[12px] font-bold text-[#0f2942]">
            {reminderMsg}
          </div>
        )}

        {/* الإحصائيات */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={<Coins className="h-4 w-4" />} label="إجمالي الإيرادات" value={`${stats.revenue.toLocaleString("en-US")} ج.م`} tone="emerald" />
            <Stat icon={<BarChart3 className="h-4 w-4" />} label="إيراد الشهر" value={`${stats.monthRevenue.toLocaleString("en-US")} ج.م`} tone="blue" />
            <Stat icon={<Users className="h-4 w-4" />} label="تراخيص سارية" value={`${stats.active} / ${stats.total}`} tone="blue" />
            <Stat icon={<TriangleAlert className="h-4 w-4" />} label="تنتهي خلال 30 يوم" value={String(stats.expiringSoon)} tone="amber" />
          </div>
        )}

        {/* طلب تجديد واصل من عميل */}
        {renewReq && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-black text-amber-900">
              <RefreshCw className="h-4 w-4" />
              طلب تجديد واصل: {renewReq.planLabel} — {renewReq.price.toLocaleString("en-US")} ج.م
              <span className="ms-auto font-mono text-[11.5px]">{renewReq.deviceId}</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-amber-800">
              من: {renewReq.user} — {new Date(renewReq.at).toLocaleString("ar-EG")}
            </div>
          </div>
        )}

        {/* الأدوات: توليد كود + البحث */}
        <div className="rounded-2xl border-2 border-[#c9d8ee] bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-[#0f2942]">
            <KeyRound className="h-4 w-4 text-[#1a6fd0]" />
            توليد كود تفعيل لأي جهاز
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
            <input
              className="win-input font-mono text-[13px] font-black"
              placeholder="FAT-XXXX-XXXX"
              dir="ltr"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toUpperCase())}
            />
            <select
              className="win-input text-[12.5px] font-black"
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as PlanKey)}
            >
              {PLAN_DEFS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title} — {p.price}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void generate()}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-[#2f86e8] to-[#1a5fc0] px-4 text-[12.5px] font-black text-white"
            >
              توليد الكود
            </button>
          </div>
          {madeCode && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
              <b className="font-mono text-[14px] font-black tracking-wider text-emerald-900" dir="ltr">
                {madeCode}
              </b>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(madeCode)}
                className="ms-auto flex items-center gap-1 rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-black text-white"
              >
                <Copy className="h-3 w-3" />
                نسخ
              </button>
            </div>
          )}
          {msg && <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-700">{msg}</div>}
        </div>

        {/* الجدول */}
        <div className="overflow-hidden rounded-2xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e2ecf8] p-2">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="win-input h-8 w-[190px] pr-7 text-[12px] font-bold"
                placeholder="بحث بكود الجهاز…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {(
              [
                ["all", "الكل"],
                ["active", "سارية"],
                ["expiring", "تنتهي قريباً"],
                ["expired", "منتهية"],
                ["lifetime", "مدى الحياة"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-lg px-2.5 py-1 text-[11.5px] font-black ${
                  filter === k ? "bg-[#0f2942] text-white" : "bg-[#eef5fd] text-[#0f2942] hover:bg-[#dbe8f7]"
                }`}
              >
                {l}
              </button>
            ))}
            <span className="ms-auto text-[11.5px] font-bold text-slate-500">{shown.length} جهاز</span>
          </div>

          {loading ? (
            <div className="grid place-items-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : shown.length === 0 ? (
            <div className="py-10 text-center text-[13px] font-bold text-slate-500">
              لا توجد تراخيص مسجّلة — أول تفعيل سيظهر هنا
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[#eef5fd] text-[11px] font-black text-[#0f2942]">
                <tr>
                  <th className="px-3 py-1.5 text-right">كود الجهاز</th>
                  <th className="px-3 py-1.5 text-right">الخطة</th>
                  <th className="px-3 py-1.5 text-right">التفعيل</th>
                  <th className="px-3 py-1.5 text-right">ينتهي في</th>
                  <th className="px-3 py-1.5 text-right">المتبقي</th>
                  <th className="px-3 py-1.5 text-right">المبلغ</th>
                  <th className="px-3 py-1.5 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.deviceId} className="border-t border-[#eef3fa] font-bold text-slate-700">
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1 font-mono text-[11.5px] font-black text-[#0f2942]" dir="ltr">
                        <MonitorSmartphone className="h-3.5 w-3.5 text-slate-400" />
                        {d.deviceId}
                      </span>
                      {d.extraDevices.length > 0 && (
                        <span className="text-[10px] text-slate-500">+{d.extraDevices.length} جهاز إضافي</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10.5px] font-black ${
                          d.plan === "lifetime"
                            ? "bg-amber-100 text-amber-800"
                            : d.plan === "tier2"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {d.planLabel}
                      </span>
                    </td>
                    <td className="num px-3 py-1.5">{fmt(d.activatedAt)}</td>
                    <td className="num px-3 py-1.5">{d.plan === "lifetime" ? "∞" : fmt(d.expiresAt)}</td>
                    <td className="px-3 py-1.5">
                      {d.daysLeft === null ? (
                        <span className="text-amber-700">مدى الحياة</span>
                      ) : (
                        <span className={d.daysLeft <= 30 ? "text-red-600" : ""}>{d.daysLeft} يوم</span>
                      )}
                    </td>
                    <td className="num px-3 py-1.5">{d.price ? `${d.price.toLocaleString("en-US")} ج.م` : "—"}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-black ${
                          d.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.active ? <Timer className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
                        {d.active ? "ساري" : "منتهي"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "blue" | "amber";
}) {
  const tones = {
    emerald: "from-emerald-500 to-emerald-700",
    blue: "from-[#2f86e8] to-[#1a5fc0]",
    amber: "from-amber-400 to-amber-600",
  } as const;
  return (
    <div className={`rounded-xl bg-gradient-to-b ${tones[tone]} p-2.5 text-white shadow`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-90">
        {icon}
        {label}
      </div>
      <div className="num mt-0.5 text-[16px] font-black">{value}</div>
    </div>
  );
}
