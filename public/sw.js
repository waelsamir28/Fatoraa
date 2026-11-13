// Service worker بسيط يسمح بتثبيت "برنامج الجمال" كتطبيق على الويندوز من المتصفح
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* الشبكة أولاً - لا تخزين مؤقت للبيانات */
});
