"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Filter, RefreshCw, Search, ShieldAlert, UserRound } from "lucide-react";
import { api, errMsg } from "@/lib/client";

interface Row {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  label: string;
  details: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

const ROLE_AR: Record<string, string> = { owner: "مالك", manager: "مدير", cashier: "كاشير" };

/** سجل المراجعة: مين عمل إيه وإمتى */
export function AuditLogView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState<{ key: string; label: string }[]>([]);
  const [entities, setEntities] = useState<{ key: string; label: string }[]>([]);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      await Promise.resolve();
      const sp = new URLSearchParams({ days: String(days) });
      if (q) sp.set("q", q);
      if (entity) sp.set("entity", entity);
      if (action) sp.set("action", action);
      const r = await api<{ items: Row[]; total: number; actions: typeof actions; entities: typeof entities }>(
        `/api/audit?${sp.toString()}`
      );
      setRows(r.items || []);
      setTotal(r.total || 0);
      if (r.actions?.length) setActions(r.actions);
      if (r.entities?.length) setEntities(r.entities);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [action, days, entity, q]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 200);
    return () => clearTimeout(id);
  }, [load]);

  const exportCsv = () => {
    const head = ["التاريخ", "العملية", "العنصر", "الوصف", "المستخدم", "الدور"];
    const lines = rows.map((r) => [
      new Date(r.createdAt).toLocaleString("ar-EG"),
      actions.find((a) => a.key === r.action)?.label || r.action,
      entities.find((e) => e.key === r.entity)?.label || r.entity,
      r.label,
      r.userName,
      ROLE_AR[r.userRole] || r.userRole,
    ]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="h-full overflow-auto bg-[#eef3fa] p-3" dir="rtl">
      <div className="mx-auto w-full max-w-[1100px] space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#0067c0] px-4 py-3 text-white shadow">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-[#0f2942]">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[16px] font-black">سجل المراجعة</div>
            <div className="text-[11.5px] font-bold text-blue-100">
              كل حذف أو تعديل حساس — مين عمله وإمتى ومن أي جهاز
            </div>
          </div>
          <div className="ms-auto flex gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-[12px] font-black hover:bg-white/25"
            >
              <Download className="h-4 w-4" />
              CSV
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
        </div>

        {/* الفلاتر */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[#c9d8ee] bg-white p-2">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="win-input h-8 w-[200px] pr-7 text-[12px] font-bold"
              placeholder="بحث في الوصف أو المستخدم…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="win-input h-8 w-[130px] text-[12px] font-black"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            <option value="">كل العناصر</option>
            {entities.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            className="win-input h-8 w-[150px] text-[12px] font-black"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">كل العمليات</option>
            {actions.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            className="win-input h-8 w-[120px] text-[12px] font-black"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>آخر 24 ساعة</option>
            <option value={7}>آخر أسبوع</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 3 شهور</option>
            <option value={365}>آخر سنة</option>
          </select>
          <span className="ms-auto flex items-center gap-1 text-[11.5px] font-bold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {total} عملية
          </span>
        </div>

        {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-bold text-red-700">{err}</div>}

        <div className="overflow-hidden rounded-2xl border-2 border-[#c9d8ee] bg-white shadow-sm">
          {loading ? (
            <div className="grid place-items-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-[13px] font-bold text-slate-500">
              لا توجد عمليات مسجّلة في هذه الفترة
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[#eef5fd] text-[11px] font-black text-[#0f2942]">
                <tr>
                  <th className="px-3 py-1.5 text-right">التاريخ والوقت</th>
                  <th className="px-3 py-1.5 text-right">العملية</th>
                  <th className="px-3 py-1.5 text-right">التفاصيل</th>
                  <th className="px-3 py-1.5 text-right">المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#eef3fa] font-bold text-slate-700 hover:bg-[#f8fbff]">
                    <td className="num whitespace-nowrap px-3 py-1.5 text-[11.5px] text-slate-600">
                      {new Date(r.createdAt).toLocaleString("ar-EG", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-black text-amber-800">
                        {actions.find((a) => a.key === r.action)?.label || r.action}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{r.label || "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5 text-slate-400" />
                        <b className="text-[#0f2942]">{r.userName || "—"}</b>
                        <span className="text-[10.5px] text-slate-500">({ROLE_AR[r.userRole] || r.userRole})</span>
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
