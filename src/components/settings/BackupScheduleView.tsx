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
  }, [load]);

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await api<{ fileName: string; location: string; sizeBytes: number }>("/api/backups/run", {
        method: "POST",
      });
      toast(`تم إنشاء نسخة احتياطية (${kb(r.sizeBytes)}) ✓`);
      await load();
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

        {/* التوزيع */}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Info
            icon={<CalendarClock className="h-5 w-5" />}
            title="التكرار"
            value="يومياً تلقائياً"
            note="مرة واحدة في اليوم عند أول تشغيل"
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
