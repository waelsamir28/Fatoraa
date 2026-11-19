/* منطق واجهة مثبّت نظام فاتورة */
(function () {
  const api = window.installer;
  const pages = [1, 2, 3, 4].map((n) => document.getElementById(`page-${n}`));
  const stepDots = Array.from(document.querySelectorAll(".step-item"));
  let installMode = "standard";

  function goStep(n) {
    pages.forEach((p, idx) => p.classList.toggle("active", idx + 1 === n));
    stepDots.forEach((el, idx) => {
      const s = idx + 1;
      el.classList.toggle("active", s === n);
      el.classList.toggle("done", s < n);
    });
  }

  document.getElementById("btn-min")?.addEventListener("click", () => api?.minimize());
  document.getElementById("btn-close")?.addEventListener("click", () => api?.close());
  document.getElementById("btn-finish-close")?.addEventListener("click", () => api?.close());
  document.getElementById("to-step-2")?.addEventListener("click", () => goStep(2));
  document.getElementById("back-1")?.addEventListener("click", () => goStep(1));

  const modeStd = document.getElementById("mode-std");
  const modeNet = document.getElementById("mode-net");
  modeStd?.addEventListener("click", () => {
    installMode = "standard";
    modeStd.classList.add("sel");
    modeNet?.classList.remove("sel");
  });
  modeNet?.addEventListener("click", () => {
    installMode = "network";
    modeNet.classList.add("sel");
    modeStd?.classList.remove("sel");
  });

  const pathInput = document.getElementById("install-path");
  document.getElementById("btn-browse")?.addEventListener("click", async () => {
    if (!api) return;
    const chosen = await api.browse(pathInput?.value || "");
    if (chosen && pathInput) pathInput.value = chosen;
  });

  // بطاقات تعريفية تتبدل بهدوء أثناء التثبيت
  const TIPS = [
    ["فواتير سريعة", "يمكنك استخدام قارئ الباركود وميزان الباركود مباشرة في شاشة المبيعات."],
    ["تنبيهات ذكية", "البرنامج ينبهك تلقائياً بنواقص المخزون ومواعيد تحصيل الآجل."],
    ["تصميم مخصص", "يمكنك تصميم شكل الفاتورة والألوان والجدول بالكامل من محرر القوالب."],
  ];
  let tipIdx = 0;
  setInterval(() => {
    tipIdx = (tipIdx + 1) % TIPS.length;
    const t = document.getElementById("tip-title");
    const p = document.getElementById("tip-text");
    if (t) t.textContent = TIPS[tipIdx][0];
    if (p) p.textContent = TIPS[tipIdx][1];
  }, 3200);

  api?.onProgress((data) => {
    const bar = document.getElementById("prog-bar");
    const pct = document.getElementById("prog-pct");
    const stage = document.getElementById("prog-stage");
    const v = Math.min(100, Math.max(0, Number(data?.pct ?? data?.percent ?? 0)));
    if (bar) bar.style.width = `${v}%`;
    if (pct) pct.textContent = `${Math.round(v)}%`;
    if (stage && (data?.stage || data?.message)) stage.textContent = data.stage || data.message;
    if (v >= 100 || data?.done) goStep(4);
  });

  document.getElementById("start-install")?.addEventListener("click", async () => {
    goStep(3);
    if (!api) return;
    const res = await api.install({
      dir: pathInput?.value || "",
      mode: installMode,
      desktopShortcut: document.getElementById("opt-desktop")?.checked ?? true,
      startMenuShortcut: document.getElementById("opt-taskbar")?.checked ?? true,
      runAtStartup: document.getElementById("opt-startup")?.checked ?? false,
    });
    if (res && res.ok === false) {
      const stage = document.getElementById("prog-stage");
      if (stage) stage.textContent = res.error || "فشل التثبيت — حاول مرة أخرى";
      return;
    }
    goStep(4);
  });

  document.getElementById("btn-launch")?.addEventListener("click", () => api?.launch());
  document.getElementById("btn-folder")?.addEventListener("click", () => api?.openFolder());

  // تحميل معلومات الإصدار وفحص النظام
  (async () => {
    if (!api) return;
    try {
      const info = await api.getInfo();
      if (info?.version) {
        const vl = document.getElementById("ver-label");
        const vb = document.getElementById("ver-badge");
        if (vl) vl.textContent = `v${info.version}`;
        if (vb) vb.textContent = `الإصدار ${info.version}`;
      }
      if (info?.defaultDir && pathInput) pathInput.value = info.defaultDir;
      const sys = await api.checkSystem?.();
      if (sys) {
        const r = document.getElementById("chk-ram");
        const d = document.getElementById("chk-disk");
        const w = document.getElementById("chk-write");
        if (r) r.textContent = sys.ramLabel;
        if (d) d.textContent = sys.diskLabel;
        if (w) w.textContent = sys.writeLabel;
      }
    } catch {
      /* ignore */
    }
  })();
})();
