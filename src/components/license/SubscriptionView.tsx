"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Copy,
  Crown,
  History,
  Layers,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { SUPPORT_PERSON, SUPPORT_PHONE } from "@/lib/constants";
import { PLAN_BY_KEY, type PlanKey } from "@/lib/license-plans";

interface StatusResp {
  isActivated: boolean;
  isExpired: boolean;
  daysLeft: number;
  machineId: string;
  plan: PlanKey | null;
  planLabel: string;
  expiresAt: string | null;
  planDaysLeft: number | null;
  renewal?: { price: number; discount: number; early: boolean };
}

interface ActRow {
  id: number;
  plan: string;
  kind: string;
  price: number;
  deviceId: string;
  expiresAt: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  activate: "تفعيل",
  renew: "تجديد",
  upgrade: "ترقية",
  reissue: "جهاز إضافي",
};

/** صفحة «حالة اشتراكي» — الخطة والبداية والانتهاء والتجديد */
export function SubscriptionView() {
  const [s, setS] = useState<StatusResp | null>(null);
  const [rows, setRows] = useState<ActRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      // تأجيل بسيط خارج دورة الرسم لتجنّب تحديث الحالة أثناء الـ effect
      await Promise.resolve();
      const st = await api<StatusResp>("/api/license");
      setS(st);
      const h = await api<{ items: ActRow[] }>("/api/license", { method: "PUT" });
      setRows(h.items || []);
    } catch (e) {
      setMsg(errMsg(e));
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("ar-EG", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

  const renew = async (plan: PlanKey) => {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/license/renew", { method: "POST", json: { plan } });
      setMsg("تم إرسال طلب التجديد — سيتواصل معك الدعم الفني لتأكيد الدفع واستلام الكود");
      await load();
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!s) {
    return (
      <div className="grid h-full place-items-center text-[15px] font-bold text-slate-500">
        <RefreshCw className="mb-2 h-6 w-6 animate-spin" />
        جاري تحميل حالة الاشتراك…
      </div>
    );
  }

  const plan = s.plan ? PLAN_BY_KEY[s.plan] : null;
  const isLife = s.plan === "lifetime";

  return (
    <div className="h-full overflow-auto bg-[#eef3fa] p-3" dir="rtl">
      <div className="mx-auto w-full max-w-[900px] space-y-3">
        {/* كارت الحالة */}
        <div className="overflow-hidden rounded-2xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 bg-[#0067c0] px-4 py-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-[#0f2942]">
              {isLife ? <Crown className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
            </span>
            <div>
              <div className="text-[16px] font-black">حالة اشتراكي</div>
              <div className="text-[11.5px] font-bold text-blue-100">كل تفاصيل التفعيل في مكان واحد</div>
            </div>
            <span
              className={`ms-auto rounded-full px-3 py-1 text-[11.5px] font-black ${
                s.isActivated ? "bg-emerald-500 text-white" : "bg-amber-400 text-[#3b2503]"
              }`}
            >
              {s.isActivated ? "مفعّل ✓" : "تجريبي"}
            </span>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-2">
            <Row icon={<BadgeCheck className="h-4 w-4" />} label="الخطة الحالية" value={s.planLabel || "نسخة تجريبية"} />
            <Row
              icon={<CalendarClock className="h-4 w-4" />}
              label="تاريخ الانتهاء"
              value={isLife ? "بدون انتهاء" : s.expiresAt ? fmtDate(s.expiresAt) : "—"}
            />
            <Row
              icon={<Timer className="h-4 w-4" />}
              label="الأيام المتبقية"
              value={isLife ? "∞" : s.planDaysLeft !== null ? `${s.planDaysLeft} يوم` : `${s.daysLeft} يوم تجربة`}
              danger={s.planDaysLeft !== null && s.planDaysLeft <= 30}
            />
            <Row
              icon={<MonitorSmartphone className="h-4 w-4" />}
              label="كود الجهاز"
              value={s.machineId}
              mono
              action={
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(s.machineId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-1 rounded bg-[#eef5fd] px-2 py-0.5 text-[10.5px] font-black text-[#0f2942]"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "تم" : "نسخ"}
                </button>
              }
            />
          </div>

          {s.renewal?.early && s.renewal.discount > 0 && (
            <div className="mx-3 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-black text-amber-900">
              🎁 عرض التجديد المبكر: خصم {s.renewal.discount} ج.م — التجديد الآن بـ {s.renewal.price} ج.م بدل{" "}
              {s.renewal.price + s.renewal.discount}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#e2ecf8] p-3">
            {!isLife && (
              <button
                type="button"
                onClick={() => void renew(s.plan || "year")}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#34c46a] to-[#167f3b] px-4 text-[13.5px] font-black text-white shadow disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                {busy ? "جاري الإرسال…" : `تجديد اشتراك ${plan?.title || ""}`}
              </button>
            )}
            <Link
              href="/plans"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#2f86e8] to-[#1a5fc0] px-4 text-[13.5px] font-black text-white shadow"
            >
              <Layers className="h-4 w-4" />
              كل الأنظمة والأسعار
            </Link>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-[#c9d8ee] bg-white px-4 text-[13.5px] font-black text-[#0f2942]"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{SUPPORT_PERSON}</span>
              <span className="num" dir="ltr">
                {SUPPORT_PHONE}
              </span>
            </a>
          </div>

          {msg && (
            <div className="mx-3 mb-3 rounded-lg bg-[#eef5fd] px-3 py-2 text-[12px] font-bold text-[#0f2942]">{msg}</div>
          )}
        </div>

        {/* سجل العمليات */}
        <div className="overflow-hidden rounded-2xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-[#0f2942] px-4 py-2 text-[13.5px] font-black text-white">
            <History className="h-4 w-4 text-amber-300" />
            سجل عمليات التفعيل والتجديد
          </div>
          {rows.length === 0 ? (
            <div className="p-4 text-center text-[12.5px] font-bold text-slate-500">لا توجد عمليات مسجّلة بعد</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[#eef5fd] text-[11px] font-black text-[#0f2942]">
                <tr>
                  <th className="px-3 py-1.5 text-right">التاريخ</th>
                  <th className="px-3 py-1.5 text-right">العملية</th>
                  <th className="px-3 py-1.5 text-right">الخطة</th>
                  <th className="px-3 py-1.5 text-right">ينتهي في</th>
                  <th className="px-3 py-1.5 text-right">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#eef3fa] font-bold text-slate-700">
                    <td className="num px-3 py-1.5">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</td>
                    <td className="px-3 py-1.5">{KIND_LABEL[r.kind] || r.kind}</td>
                    <td className="px-3 py-1.5">{PLAN_BY_KEY[r.plan as PlanKey]?.title || "—"}</td>
                    <td className="px-3 py-1.5">{fmtDate(r.expiresAt)}</td>
                    <td className="num px-3 py-1.5">{r.price ? `${r.price.toLocaleString("en-US")} ج.م` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Link
          href="/plans"
          className="flex items-center justify-center gap-1 text-[12px] font-black text-[#1a6fd0] hover:underline"
        >
          عرض كل الأنظمة والأسعار (سنة / سنتين / مدى الحياة)
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
  danger,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#e2ecf8] bg-[#f8fbff] px-3 py-2">
      <span className="text-[#1a6fd0]">{icon}</span>
      <span className="text-[11.5px] font-bold text-slate-500">{label}</span>
      <b
        className={`ms-auto text-[13px] font-black ${danger ? "text-red-600" : "text-[#0f2942]"} ${mono ? "font-mono tracking-wide" : ""}`}
        dir={mono ? "ltr" : undefined}
      >
        {value}
      </b>
      {action}
    </div>
  );
}
