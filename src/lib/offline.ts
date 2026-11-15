"use client";

/**
 * طبقة العمل الأوفلاين (PWA):
 * - تخزين الفواتير التي فشل إرسالها في طابور داخل المتصفح (localStorage)
 * - إعادة إرسالها تلقائياً عند عودة الاتصال أو عند تشغيل البرنامج
 * - إشعار الواجهة بحالة الاتصال
 */

const QUEUE_KEY = "fatora.offline.queue";
const LAST_SYNC_KEY = "fatora.offline.lastSync";

export interface QueuedInvoice {
  /** معرّف محلي فريد */
  uid: string;
  /** وقت الإضافة */
  at: string;
  /** مسار الـ API (POST) */
  url: string;
  payload: Record<string, unknown>;
  /** عدد محاولات الإرسال */
  tries: number;
  /** نص وصفي للعرض */
  label: string;
}

function read(): QueuedInvoice[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const arr = raw ? (JSON.parse(raw) as QueuedInvoice[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: QueuedInvoice[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** هل الطابور ممتلئ؟ */
export function offlineQueue(): QueuedInvoice[] {
  return read();
}

export function offlineCount(): number {
  return read().length;
}

export function enqueueInvoice(payload: Record<string, unknown>, label: string): QueuedInvoice {
  const q = read();
  const item: QueuedInvoice = {
    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    url: "/api/invoices",
    payload,
    tries: 0,
    label,
  };
  q.push(item);
  write(q);
  return item;
}

export function clearQueue() {
  write([]);
}

export function lastSyncAt(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

function markSync() {
  try {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export interface SyncResult {
  sent: number;
  failed: number;
  remaining: number;
}

/**
 * إرسال كل الفواتير المعلّقة. يُستدعى تلقائياً عند استعادة الاتصال.
 * الفاتورة التي تفشل بسبب 4xx (خطأ في البيانات) تُسقط من الطابور بعد 3 محاولات،
 * أما أخطاء الشبكة فتبقى للتجربة لاحقاً.
 */
export async function syncOfflineQueue(): Promise<SyncResult> {
  const q = read();
  if (!q.length) return { sent: 0, failed: 0, remaining: 0 };

  let sent = 0;
  let failed = 0;
  const keep: QueuedInvoice[] = [];

  for (const item of q) {
    try {
      const res = await fetch(item.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        sent++;
        continue;
      }
      // 4xx = بيانات مرفوضة، لا فائدة من إعادة المحاولة أكثر من 3 مرات
      item.tries++;
      failed++;
      if (item.tries < 3 && res.status < 500 && res.status !== 409) keep.push(item);
    } catch {
      // خطأ شبكة: نحتفظ بالعنصر
      item.tries++;
      failed++;
      keep.push(item);
    }
  }

  write(keep);
  if (sent > 0) markSync();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fatora:offline-sync"));
  }
  return { sent, failed, remaining: keep.length };
}

/** مراقبة حالة الاتصال + إعادة المزامنة التلقائية */
export function watchOfflineSync(onSync: (r: SyncResult) => void) {
  let busy = false;
  const run = async () => {
    if (busy || !navigator.onLine) return;
    busy = true;
    try {
      const r = await syncOfflineQueue();
      if (r.sent > 0 || r.remaining > 0) onSync(r);
    } finally {
      busy = false;
    }
  };
  const onOnline = () => void run();
  window.addEventListener("online", onOnline);
  const t = setInterval(() => void run(), 60_000);
  void run();
  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(t);
  };
}
