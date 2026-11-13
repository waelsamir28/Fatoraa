export async function api<T>(url: string, opts: { method?: string; json?: unknown } = {}): Promise<T> {
  const hasBody = opts.json !== undefined;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(opts.json) : undefined,
    cache: "no-store",
  });
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
