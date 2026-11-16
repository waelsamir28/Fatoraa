// منطق مثبّت FATORA (واجهة) — يتحدث مع main.js عبر preload (contextBridge)
// في وضع المعاينة داخل المتصفح (بدون Electron) نستخدم بديلاً حتى تظهر الواجهة
const DEMO = !window.installer;
const api =
  window.installer ||
  {
    getInfo: async () => ({ version: "1.2.0", defaultDir: "C:\\Program Files\\FATORA", requiredBytes: 420 * 1024 ** 2, freeBytes: 15 * 1024 ** 3 }),
    browse: async () => null,
    install: async () => ({ ok: true }),
    launch: async () => {},
    confirmUninstall: async () => true,
    minimize: async () => {},
    close: async () => {},
    onProgress: (cb) => {
      let p = 0;
      setInterval(() => {
        p = Math.min(96, p + 7);
        cb({ percent: p });
      }, 900);
    },
  };

const $ = (id) => document.getElementById(id);
if (DEMO) document.title += " — معاينة";

let stage = "dir"; // dir | prog | done
let installed = false;
let busy = false;

const MESSAGES = [
  "جاري تحضير الملفات…",
  "نسخ برنامج FATORA…",
  "تجهيز قاعدة البيانات…",
  "تركيب ملفات التشغيل…",
  "إنشاء الاختصارات…",
  "لحظات قليلة… لا تغلق النافذة",
];

const TIPS = [
  "نصيحة: تقدر تفتح البرنامج من سطح المكتب أو من قائمة «ابدأ».",
  "نصيحة: البرنامج يشتغل بدون إنترنت — والبيانات محفوظة على جهازك.",
  "نصيحة: خد نسخة احتياطية من الإعدادات ← النسخ الاحتياطي.",
  "نصيحة: أي مشكلة؟ الدعم الفني 01222355769.",
];

function show(page) {
  ["pgDir", "pgProg", "pgDone", "pgError"].forEach((id) => $(id).classList.remove("on"));
  $(page).classList.add("on");
}

function fmtBytes(n) {
  if (!n && n !== 0) return "—";
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} جيجابايت`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} ميجابايت`;
}

async function init() {
  const info = await api.getInfo();
  $("sideVer").textContent = `الإصدار ${info.version}`;
  $("footHint").textContent = `الإصدار ${info.version}`;
  $("dir").value = info.defaultDir;
  $("spaceMeta").textContent = `المساحة المطلوبة: ${fmtBytes(info.requiredBytes)} · المتاحة: ${fmtBytes(info.freeBytes)}`;
}

$("btnBrowse").addEventListener("click", async () => {
  const picked = await api.browse($("dir").value);
  if (picked) $("dir").value = picked;
});

$("btnMin").addEventListener("click", () => api.minimize());
$("btnClose").addEventListener("click", () => api.close());
$("btnCancel").addEventListener("click", () => api.close());

$("btnNext").addEventListener("click", async () => {
  if (busy) return;
  if (stage === "dir") return startInstall();
  if (stage === "done") {
    if ($("optRun") && $("optRun").checked) api.launch();
    else api.close();
    return;
  }
});

$("btnBack").addEventListener("click", () => {
  stage = "dir";
  show("pgDir");
  $("btnBack").hidden = true;
  $("btnCancel").hidden = false;
  $("btnNext").textContent = "تثبيت";
  $("btnNext").disabled = false;
});

function setStatus(text) {
  $("statusText").textContent = text;
}

function addDetail(line) {
  const box = $("detail");
  box.textContent = line;
}

function startTipRotation() {
  let i = 0;
  const el = $("tip");
  el.textContent = TIPS[0];
  setInterval(() => {
    i = (i + 1) % TIPS.length;
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = TIPS[i];
      el.style.opacity = "1";
    }, 320);
  }, 4200);
}

function startStatusRotation() {
  let i = 0;
  setInterval(() => {
    i = (i + 1) % MESSAGES.length;
    setStatus(MESSAGES[i]);
  }, 2600);
}

async function startInstall() {
  busy = true;
  stage = "prog";
  show("pgProg");
  $("btnBack").hidden = true;
  $("btnCancel").hidden = true;
  $("btnNext").disabled = true;
  $("btnNext").textContent = "جاري التثبيت…";

  startStatusRotation();
  startTipRotation();

  const target = $("dir").value.trim();
  const res = await api.install({
    dir: target,
    desktopShortcut: $("optDesktop").checked,
    startMenuShortcut: $("optStart").checked,
  });

  if (!res || !res.ok) {
    show("pgError");
    $("errText").textContent = (res && res.error) || "حدث خطأ غير متوقع أثناء التثبيت.";
    $("btnNext").textContent = "إغلاق";
    $("btnNext").disabled = false;
    $("btnNext").onclick = () => api.close();
    return;
  }

  installed = true;
  busy = false;
  stage = "done";
  $("bar").classList.remove("indet");
  $("barFill").style.width = "100%";
  $("barFill").style.right = "0";
  show("pgDone");
  $("btnCancel").hidden = true;
  $("btnNext").textContent = "إنهاء";
  $("btnNext").disabled = false;
}

api.onProgress(({ percent, message, detail }) => {
  if (typeof percent === "number" && percent > 0) {
    $("bar").classList.remove("indet");
    $("barFill").style.right = "auto";
    $("barFill").style.left = "0";
    $("barFill").style.width = `${Math.min(100, percent)}%`;
  }
  if (message) setStatus(message);
  if (detail) addDetail(detail);
});

init().catch(() => {
  $("spaceMeta").textContent = "";
});
