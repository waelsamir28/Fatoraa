/* ================================================================
   Service Worker — يسمح بتشغيل برنامج FATORA كتطبيق PWA يعمل أوفلاين
   - الأصول الثابتة (JS/CSS/خطوط/لوجو): Cache First
   - صفحات التنقل: Network First مع بديل من الكاش ثم صفحة «لا يوجد اتصال»
   - طلبات البيانات (API): شبكة فقط — الحفظ الأوفلاين مسؤولية طابور المتصفح
   ================================================================ */

const VERSION = "fatora-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/offline", "/icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(STATIC_CACHE);
      await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** هل الطلب لملف ثابت يمكن تخزينه؟ */
function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    /\.(css|js|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // لا نخزّن استجابات الـ API ولا صفحات الطباعة
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/print/")) return;

  // 1) الأصول الثابتة — من الكاش أولاً
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })(),
    );
    return;
  }

  // 2) صفحات التنقل — الشبكة أولاً ثم الكاش ثم صفحة أوفلاين
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          const hit = await cache.match(request);
          if (hit) return hit;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response(
            "<!doctype html><html lang='ar' dir='rtl'><meta charset='utf-8'><body style='font-family:sans-serif;text-align:center;padding:40px'><h2>لا يوجد اتصال بالإنترنت</h2><p>افتح البرنامج مرة واحدة وأنت متصل ليتم تجهيزه للعمل أوفلاين.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

/** رسائل من الصفحة (مزامنة يدوية) */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
