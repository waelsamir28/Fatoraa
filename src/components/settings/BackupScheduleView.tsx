"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Window } from "@/components/win/Window";
import { IconBackup } from "@/components/icons/AppIcons";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { TelegramSetup } from "./TelegramSetup";

interface BackupRow {
  id: number;
  kind: string;
  location: string;
  fileName: string;
  sizeBytes: number;
  counts: Record<string, number>;
  status: string;
  message: string;
  createdAt: string;
}

const kb = (bytes: number) => {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const LOCATION_LABELS: Record<string, string> = {
  db: "قاعدة البيانات",
  local: "ملف على القرص",
  telegram: "تيليجرام",
};

export function BackupScheduleView() {
  const { toast, native } = useDesktop();
  const [items, setItems] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // إعدادات الجدولة
  const [sched, setSched] = useState<{
    enabled: boolean;
    everyHours: number;
    keepCount: number;
    hour: number;
    sendTelegram: boolean;
    lastRun: string;
    lastStatus: string;
    nextRun?: string;
  } | null>(null);
  const [savingSched, setSavingSched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: BackupRow[] }>("/api/backups/history");
      setItems(r.items);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    api<typeof sched>("/api/backups/schedule")
      .then(setSched)
      .catch(() => undefined);
  }, [load]);

  /** حفظ إعدادات الجدولة */
  const saveSched = async (patch: Partial<NonNullable<typeof sched>>) => {
    setSavingSched(true);
    try {
      const saved = await api<NonNullable<typeof sched>>("/api/backups/schedule", { method: "PUT", json: patch });
      setSched({ ...saved, nextRun: saved.lastRun ? new Date(new Date(saved.lastRun).getTime() + saved.everyHours * 3600000).toISOString() : new Date().toISOString() });
      toast("تم حفظ إعدادات الجدولة ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSavingSched(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await api<{ fileName: string; location: string; sizeBytes: number }>("/api/backups/run", {
        method: "POST",
      });
      toast(`تم إنشاء نسخة احتياطية (${kb(r.sizeBytes)}) ✓`);
      await load();
      const s2 = await api<NonNullable<typeof sched>>("/api/backups/schedule").catch(() => null);
      if (s2) setSched(s2);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) throw new Error("تعذر تحميل البيانات");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fatora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("تم تنزيل النسخة الاحتياطية على جهازك ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const todayAuto = items.some(
    (b) => b.kind === "auto" && new Date(b.createdAt).toDateString() === new Date().toDateString(),
  );
  const last = items[0];
  const totalSize = items.reduce((a, b) => a + Number(b.sizeBytes || 0), 0);

  return (
    <Window
      title="النسخ الاحتياطي التلقائي"
      icon={<IconBackup className="h-9 w-9" />}
      statusBar={<span>{todayAuto ? "✓ نسخة اليوم محفوظة" : "⚠ لم تُحفظ نسخة اليوم بعد"}</span>}
    >
      <div className="h-full overflow-auto p-3">
        {/* حالة اليوم */}
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-white shadow ${
            todayAuto ? "bg-gradient-to-l from-[#047857] to-[#064e3b]" : "bg-gradient-to-l from-[#b45309] to-[#7c2d12]"
          }`}
        >
          <div className="flex items-center gap-2">
            {todayAuto ? <CheckCircle2 className="h-6 w-6" /> : <TriangleAlert className="h-6 w-6" />}
            <div>
              <div className="text-[15px] font-black">
                {todayAuto ? "نسخة اليوم محفوظة بنجاح" : "لم يتم إنشاء نسخة اليوم"}
              </div>
              <div className="text-[11.5px] font-bold text-white/80">
                النسخة التلقائية تُنشأ مرة واحدة يومياً عند أول استخدام للبرنامج — بدون تدخل منك.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={runNow}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-[13px] font-black hover:bg-white/30 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            نسخة الآن
          </button>
        </div>

        {/* ===== إعدادات الجدولة ===== */}
        <div className="mb-3 overflow-hidden rounded-xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-[#0f2942] px-3 py-2 text-[14px] font-black text-white">
            <CalendarClock className="h-4 w-4 text-[#f5c518]" />
            جدولة النسخ الاحتياطي التلقائي
          </div>
          {!sched ? (
            <div className="grid place-items-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2 p-3">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafd] px-3 py-2">
                <span>
                  <span className="block text-[13.5px] font-black text-[#0f2942]">تشغيل النسخ التلقائي</span>
                  <span className="block text-[11px] font-bold text-slate-500">
                    يعمل تلقائياً عند فتح البرنامج حسب الجدول أدناه
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#2fb3a6]"
                  checked={sched.enabled}
                  onChange={(e) => void saveSched({ enabled: e.target.checked })}
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block rounded-lg border border-slate-200 bg-white p-2">
                  <span className="mb-1 block text-[11.5px] font-black text-[#0f2942]">كل كم ساعة؟</span>
                  <select
                    className="win-input w-full text-[12.5px] font-bold"
                    value={sched.everyHours}
                    onChange={(e) => void saveSched({ everyHours: Number(e.target.value) })}
                  >
                    <option value={1}>كل ساعة</option>
                    <option value={3}>كل 3 ساعات</option>
                    <option value={6}>كل 6 ساعات</option>
                    <option value={12}>كل 12 ساعة</option>
                    <option value={24}>كل يوم</option>
                    <option value={48}>كل يومين</option>
                    <option value={72}>كل 3 أيام</option>
                  </select>
                </label>
                <label className="block rounded-lg border border-slate-200 bg-white p-2">
                  <span className="mb-1 block text-[11.5px] font-black text-[#0f2942]">الاحتفاظ بآخر</span>
                  <select
                    className="win-input w-full text-[12.5px] font-bold"
                    value={sched.keepCount}
                    onChange={(e) => void saveSched({ keepCount: Number(e.target.value) })}
                  >
                    {[7, 15, 30, 60, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n} نسخة
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block rounded-lg border border-slate-200 bg-white p-2">
                  <span className="mb-1 block text-[11.5px] font-black text-[#0f2942]">إرسال لتيليجرام</span>
                  <select
                    className="win-input w-full text-[12.5px] font-bold"
                    value={sched.sendTelegram ? "1" : "0"}
                    onChange={(e) => void saveSched({ sendTelegram: e.target.value === "1" })}
                  >
                    <option value="1">نعم — نسخة على السحابة</option>
                    <option value="0">محلي فقط</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#eef4fa] px-2.5 py-1.5 text-[11.5px] font-bold text-slate-700">
                <span>
                  آخر نسخة:{" "}
                  <b className="num">
                    {sched.lastRun ? new Date(sched.lastRun).toLocaleString("ar-EG") : "لم تُنشأ بعد"}
                  </b>
                </span>
                <span className="text-slate-400">|</span>
                <span>
                  القادمة:{" "}
                  <b className="num">
                    {sched.nextRun ? new Date(sched.nextRun).toLocaleString("ar-EG") : "—"}
                  </b>
                </span>
                {savingSched && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
              </div>
            </div>
          )}
        </div>

        {/* التوزيع */}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Info
            icon={<CalendarClock className="h-5 w-5" />}
            title="التكرار"
            value={sched ? (sched.enabled ? `كل ${sched.everyHours} ساعة` : "متوقف") : "—"}
            note={sched?.enabled ? "نسخ تلقائي مجدول" : "النسخ التلقائي متوقف"}
          />
          <Info
            icon={<Database className="h-5 w-5" />}
            title="عدد النسخ المحفوظة"
            value={String(items.length)}
            note={`الحجم الكلي ${kb(totalSize)}`}
          />
          <Info
            icon={<CloudUpload className="h-5 w-5" />}
            title="آخر نسخة"
            value={last ? new Date(last.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"}
            note={last ? new Date(last.createdAt).toLocaleDateString("ar-EG") : "لا توجد نسخ بعد"}
          />
        </div>

        {/* أزرارها */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runNow}
            disabled={busy}
            className="btn btn-blue flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            إنشاء نسخة احتياطية
          </button>
          <button type="button" onClick={download} className="btn flex h-9 items-center gap-1.5 px-3 text-[13px]">
            <Download className="h-4 w-4" /> تنزيل نسخة على الجهاز
          </button>
          <button type="button" onClick={load} className="btn flex h-9 items-center gap-1.5 px-3 text-[13px]">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>

        {/* إعدادات تيليجرام (تفاعلية) */}
        <div className="mb-3">
          <TelegramSetup />
        </div>

        {/* السجل */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-[#f7faff] px-3 py-2 text-[13.5px] font-black text-[#0b2350]">
            سجل النسخ الاحتياطية
          </div>
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : items.length ? (
            <table className="w-full text-right text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11.5px] text-slate-500">
                  <th className="px-3 py-1.5 font-black">التاريخ</th>
                  <th className="px-3 py-1.5 font-black">النوع</th>
                  <th className="px-3 py-1.5 font-black">المكان</th>
                  <th className="px-3 py-1.5 font-black">الحجم</th>
                  <th className="px-3 py-1.5 font-black">المحتوى</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 font-bold last:border-0 hover:bg-[#f7faff]">
                    <td className="num px-3 py-1.5 text-slate-600">
                      {new Date(b.createdAt).toLocaleString("ar-EG", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          b.kind === "auto" ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {b.kind === "auto" ? "تلقائية" : "يدوية"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[11.5px] text-slate-600">
                      {b.location.split("+").map((l) => LOCATION_LABELS[l] || l).join(" + ")}
                    </td>
                    <td className="num px-3 py-1.5 text-slate-600">{kb(b.sizeBytes)}</td>
                    <td className="num px-3 py-1.5 text-[11px] text-slate-500">
                      أصناف {b.counts?.products ?? 0} · فواتير {b.counts?.invoices ?? 0} · عملاء{" "}
                      {b.counts?.parties ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-[13px] font-bold text-slate-500">
              لا توجد نسخ محفوظة بعد — اضغط «إنشاء نسخة احتياطية»
            </div>
          )}
        </div>

        {!native && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-blue-50 p-2.5 text-[11.5px] font-bold text-blue-900">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              النسخة تُحفظ أيضاً كملف على القرص في بيئة سطح المكتب. على Vercel احفظ نسخة على جهازك أو فعّل
              تيليجرام.
            </span>
          </div>
        )}
      </div>
    </Window>
  );
}

function Info({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500">
        <span className="text-blue-600">{icon}</span>
        {title}
      </div>
      <div className="num mt-0.5 text-[16px] font-black text-[#0b2350]">{value}</div>
      <div className="text-[10.5px] font-bold text-slate-400">{note}</div>
    </div>
  );
}
