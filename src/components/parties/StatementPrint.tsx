"use client";

import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate } from "@/lib/format";
import { resolveLogo } from "@/lib/logo";
import type { Party, Settings, StatementRow } from "@/lib/types";

interface Statement {
  party: Party;
  opening: number;
  rows: StatementRow[];
}

const waPhone = (raw: string) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return `20${d.slice(1)}`;
  return d;
};

/** كشف حساب عميل/مورد — نسخة للطباعة و PDF وواتساب */
export function StatementPrint({
  partyId,
  from,
  to,
  auto,
}: {
  partyId: number;
  from?: string;
  to?: string;
  auto?: boolean;
}) {
  const [st, setSt] = useState<Statement | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [err, setErr] = useState("");
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [d, s] = await Promise.all([
          api<Statement>(`/api/parties/${partyId}/payments`),
          api<Settings>("/api/settings").catch(() => null),
        ]);
        if (!live) return;
        setSt(d);
        setSettings(s);
      } catch (e) {
        if (live) setErr(errMsg(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [partyId]);

  useEffect(() => {
    if (!auto || !st || printed) return;
    const t = setTimeout(() => {
      setPrinted(true);
      window.print();
    }, 550);
    return () => clearTimeout(t);
  }, [auto, st, printed]);

  useEffect(() => {
    if (!st) return;
    document.title = `كشف حساب - ${st.party.name}`;
  }, [st]);

  if (err) return <div style={{ padding: 24, fontFamily: "Cairo, sans-serif" }}>تعذر تحميل كشف الحساب: {err}</div>;
  if (!st) return <div style={{ padding: 24, fontFamily: "Cairo, sans-serif" }}>جاري تحضير كشف الحساب…</div>;

  const rows = st.rows.filter((r) => {
    const d = r.date.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const isCustomer = st.party.type === "customer";
  const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);

  const waText = [
    `كشف حساب ${isCustomer ? "عميل" : "مورد"} — ${st.party.name}`,
    settings?.storeName ? `من: ${settings.storeName}` : "",
    from || to ? `الفترة: ${from || "البداية"} إلى ${to || "اليوم"}` : "الفترة: كل الحركات",
    "",
    `رصيد أول المدة: ${fmt(st.opening)} ${settings?.currency || "ج.م"}`,
    `عدد الحركات: ${rows.length}`,
    `إجمالي مدين: ${fmt(totalDebit)}`,
    `إجمالي دائن: ${fmt(totalCredit)}`,
    `الرصيد الحالي: ${fmt(st.party.balance)} ${settings?.currency || "ج.م"}`,
    rows.length
      ? "\n" +
        rows
          .slice(-12)
          .map((r) => `• ${fmtDate(r.date)} — ${r.description} — ${fmt(r.balance)}`)
          .join("\n")
      : "",
    "",
    settings?.phone ? `للاستفسار: ${settings.phone}` : "",
    "برنامج FATORA",
  ]
    .filter(Boolean)
    .join("\n");

  const phone = waPhone(st.party.phone);
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(waText)}`;

  return (
    <div className="stmt" dir="rtl">
      <style>{`
        @page { size: A4; margin: 10mm; }
        .stmt { font-family: "Cairo","Segoe UI",sans-serif; color: #111; font-size: 12px; }
        .stmt .head { display:flex; align-items:center; gap:10px; border-bottom:2px solid #1e4b7a; padding-bottom:8px; margin-bottom:10px; }
        .stmt .head img { height:48px; width:48px; object-fit:contain; }
        .stmt h1 { font-size:19px; margin:0; }
        .stmt .meta { margin-inline-start:auto; text-align:left; font-size:11px; line-height:1.6; }
        .stmt .who { display:flex; flex-wrap:wrap; gap:10px; border:1px solid #c9d8ee; background:#f7fbff; border-radius:6px; padding:6px 9px; margin-bottom:9px; font-size:11.5px; }
        .stmt .who b { color:#1e4b7a; }
        .stmt table { width:100%; border-collapse:collapse; }
        .stmt td,.stmt th { border:1px solid #cbd5e1; padding:3.5px 6px; text-align:right; }
        .stmt th { background:#eef3fa; font-weight:800; font-size:11.5px; text-align:center; }
        .stmt .num { font-variant-numeric: tabular-nums; text-align:center; }
        .stmt .deb { color:#b91c1c; }
        .stmt .cre { color:#15803d; }
        .stmt tfoot td { background:#f1f5f9; font-weight:800; }
        .stmt .foot { margin-top:14px; border-top:1px dashed #94a3b8; padding-top:6px; font-size:10.5px; color:#475569; display:flex; justify-content:space-between; }
        .stmt .noprint { display:flex; gap:6px; margin-bottom:10px; }
        .stmt .noprint a,.stmt .noprint button { border:0; border-radius:6px; padding:7px 13px; font-family:inherit; font-weight:800; font-size:12px; cursor:pointer; text-decoration:none; color:#fff; }
        .stmt .noprint .p { background:#1e4b7a; }
        .stmt .noprint .w { background:#25d366; }
        .stmt .noprint .s { background:#64748b; }
        @media print { .stmt .noprint { display:none !important; } }
      `}</style>

      <div className="noprint">
        <button type="button" className="p" onClick={() => window.print()}>
          طباعة / حفظ PDF
        </button>
        <a className="w" href={waUrl} target="_blank" rel="noopener noreferrer">
          إرسال واتساب
        </a>
        {phone ? (
          <a className="s" href={smsUrl}>
            إرسال رسالة SMS
          </a>
        ) : null}
      </div>

      <div className="head">
        <img src={resolveLogo(settings?.customLogoUrl)} alt="" />
        <div>
          <h1>{settings?.storeName || "FATORA"}</h1>
          <div style={{ fontSize: 11 }}>كشف حساب {isCustomer ? "عميل" : "مورد"}</div>
        </div>
        <div className="meta">
          {settings?.phone ? <div dir="ltr">{settings.phone}</div> : null}
          <div>
            {from || to ? `الفترة: ${from || "—"} → ${to || "—"}` : "الفترة: كل الحركات"}
          </div>
          <div>تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</div>
        </div>
      </div>

      <div className="who">
        <span>
          <b>الاسم:</b> {st.party.name}
        </span>
        {st.party.phone ? (
          <span dir="ltr">
            <b>الهاتف:</b> {st.party.phone}
          </span>
        ) : null}
        {st.party.address ? (
          <span>
            <b>العنوان:</b> {st.party.address}
          </span>
        ) : null}
        <span>
          <b>رصيد أول المدة:</b> {fmt(st.opening)} {settings?.currency || "ج.م"}
        </span>
        <span>
          <b>الرصيد الحالي:</b> {fmt(st.party.balance)} {settings?.currency || "ج.م"}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 80 }}>التاريخ</th>
            <th>البيان</th>
            <th style={{ width: 90 }}>مدين</th>
            <th style={{ width: 90 }}>دائن</th>
            <th style={{ width: 90 }}>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="num">—</td>
            <td>رصيد أول المدة</td>
            <td className="num">{fmt(st.opening)}</td>
            <td className="num">-</td>
            <td className="num" style={{ fontWeight: 800 }}>
              {fmt(st.opening)}
            </td>
          </tr>
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td className="num">{fmtDate(r.date)}</td>
              <td>{r.description}</td>
              <td className="num deb">{r.debit ? fmt(r.debit) : "-"}</td>
              <td className="num cre">{r.credit ? fmt(r.credit) : "-"}</td>
              <td className="num" style={{ fontWeight: 700 }}>
                {fmt(r.balance)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="num" style={{ padding: 22, color: "#64748b" }}>
                لا توجد حركات في هذه الفترة
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>الإجماليات</td>
            <td className="num deb">{fmt(totalDebit)}</td>
            <td className="num cre">{fmt(totalCredit)}</td>
            <td className="num">{fmt(st.party.balance)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="foot">
        <span>
          {settings?.storeName || "FATORA"} — {settings?.phone || ""}
        </span>
        <span>كشف حساب آلي — {rows.length} حركة</span>
      </div>
    </div>
  );
}
