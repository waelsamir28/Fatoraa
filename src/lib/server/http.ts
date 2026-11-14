import { ensureSeeded } from "./seed";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code ?? err?.cause?.code;
}

/** يغلف أي route handler: تهيئة البيانات + معالجة الأخطاء بالعربية */
export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    await ensureSeeded();
    // نسخة احتياطية تلقائية مرة واحدة يومياً عند أول استخدام (لا تعطّل الطلب)
    void import("./backup")
      .then((m) => m.maybeRunDailyBackup())
      .catch(() => undefined);
    const data = await fn();
    if (data instanceof Response) return data;
    return Response.json(data ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    // أخطاء المصادقة/الصلاحيات (AuthError من session.ts)
    const authErr = e as { name?: string; status?: number; message?: string } | null;
    if (authErr && (authErr.name === "AuthError" || authErr.status === 401 || authErr.status === 403)) {
      return Response.json(
        { error: authErr.message || "غير مصرح" },
        { status: authErr.status === 403 ? 403 : 401 },
      );
    }
    if (pgCode(e) === "23505") {
      return Response.json(
        { error: "هذا الكود مستخدم من قبل، يرجى اختيار كود آخر" },
        { status: 409 },
      );
    }
    console.error(e);
    return Response.json({ error: "حدث خطأ في الخادم، حاول مرة أخرى" }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, "البيانات المرسلة غير صالحة");
  }
}

export const num = (v: unknown, d = 0): number => {
  if (v === null || v === undefined || v === "") return d;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

export const str = (v: unknown, d = ""): string =>
  typeof v === "string" ? v.trim() : v === null || v === undefined ? d : String(v).trim();

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export function parseId(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "معرف غير صالح");
  return n;
}

export function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
