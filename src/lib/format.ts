export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export function fmt(n: number | null | undefined, digits = 2) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtQty(n: number | null | undefined) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayInput = () => toDateInput(new Date());

export function monthStartInput() {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function daysAgoInput(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateInput(d);
}

export const isoToDateInput = (iso: string) => toDateInput(new Date(iso));

export function fmtDate(v: string | Date) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtTime(v: string | Date) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h >= 12 ? "م" : "ص"}`;
}

/** يدمج تاريخ حقل الإدخال مع وقت (الحالي أو وقت الفاتورة الأصلي) */
export function dateInputToISO(dateStr: string, base?: string | null) {
  const [y, m, day] = dateStr.split("-").map(Number);
  const t = base ? new Date(base) : new Date();
  if (!y || !m || !day) return t.toISOString();
  return new Date(y, m - 1, day, t.getHours(), t.getMinutes(), t.getSeconds()).toISOString();
}

/** تحويل مدى تاريخين محليين إلى ISO (من بداية اليوم الأول حتى نهاية اليوم الأخير) */
export function rangeToISO(from: string, to: string) {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  t.setDate(t.getDate() + 1);
  return { from: f.toISOString(), to: t.toISOString() };
}

export const tzOffset = () => -new Date().getTimezoneOffset();

let uidCounter = 0;
export const uid = () => `${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;
