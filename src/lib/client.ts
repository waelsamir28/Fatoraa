/** خطأ شبكة (لا يوجد اتصال) — يُميّز عن أخطاء البيانات */
export class NetworkError extends Error {
  constructor(message = "لا يوجد اتصال بالإنترنت — سيتم الإرسال تلقائياً عند عودة الاتصال") {
    super(message);
    this.name = "NetworkError";
  }
}

export const isNetworkError = (e: unknown) => e instanceof NetworkError || (e instanceof Error && /fetch failed|network|Failed to fetch/i.test(e.message));

export async function api<T>(url: string, opts: { method?: string; json?: unknown } = {}): Promise<T> {
  const hasBody = opts.json !== undefined;
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(opts.json) : undefined,
      cache: "no-store",
    });
  } catch {
    // انقطاع الشبكة: نرفع خطأ مميزاً حتى تستطيع الشاشات تحويله لطابور الأوفلاين
    if (typeof window !== "undefined") window.dispatchEvent(new Event("fatora:network-error"));
    throw new NetworkError();
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `حدث خطأ (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "حدث خطأ غير متوقع");
