// منطق مثبّت FATORA (واجهة) — يتحدث مع main.js عبر preload (contextBridge)
// في وضع المعاينة داخل المتصفح (بدون Electron) نستخدم بديلاً حتى تظهر الواجهة
const DEMO = !window.installer;
const api =
  window.installer ||
  {
    getInfo: async () => ({ version: "__APP_VERSION__", defaultDir: "C:\\Program Files\\FATORA", requiredBytes: 420 * 1024 ** 2, freeBytes: 15 * 1024 ** 3 }),
    browse: async () => null,
    install: async () => ({ ok: true }),
    launch: async () => {},
    openFolder: async () => {},
    whatsNew: async () => ({
      version: "معاينة",
      items: ["تثبيت بنمط Windows 11", "تحسين سرعة بدء التشغيل", "إصلاحات وتحديثات متنوعة"],
    }),
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
  "نصيحة: أي مشكلة؟ الدعم الفني م/ وائل الجمال — 01222355769.",
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

/** مهلة زمنية لأي استدعاء IPC — عشان الواجهة ما تفضلش معلّقة للأبد */
function withTimeout(promise, ms = 7000) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function init() {
  // القيم الافتراضية أولاً حتى تبقى الواجهة صالحة للاستخدام حتى لو فشل IPC
  let info = null;
  try {
    info = await withTimeout(api.getInfo(), 6000);
  } catch {
    info = null;
  }
  // الإصدار مطبوع مسبقًا في الصفحة (وقت البناء) — نحدّثه فقط لو وصلنا رقم أدق
  const version = info && info.version && info.version !== "__APP_VERSION__" ? info.version : null;
  if (version) {
    $("sideVer").textContent = `الإصدار ${version}`;
    $("footHint").textContent = `الإصدار ${version}`;
  }
  if (info && info.defaultDir) $("dir").value = info.defaultDir;
  if (info) {
    $("spaceMeta").textContent = `المساحة المطلوبة: ${fmtBytes(info.requiredBytes)} · المتاحة: ${fmtBytes(info.freeBytes)}`;
  } else {
    $("spaceMeta").textContent = "المساحة المطلوبة: 420 ميجابايت";
  }
  void loadReleaseInfo();
}

async function loadReleaseInfo() {
  // ملاحظة: يتم هنا قراءة ملاحظات الإصدار المرفقة مع المثبّت (بدون اتصال بالإنترنت)
  const spin = $("checkSpin");
  const text = $("checkText");
  try {
    const notes = await withTimeout(api.whatsNew(), 5000);
    if (!notes || !notes.items) throw new Error("no-notes");
    spin.classList.add("ok");
    text.textContent = "الإصدار جاهز للتثبيت — لا حاجة لاتصال بالإنترنت";
    $("wnVer").textContent = `(${notes.version})`;
    $("wnList").innerHTML = "";
    for (const line of notes.items) {
      const li = document.createElement("li");
      li.textContent = line;
      $("wnList").appendChild(li);
    }
  } catch {
    spin.classList.add("ok");
    text.textContent = "يمكنك المتابعة بالتثبيت";
  }
}

$("btnOpenFolder").addEventListener("click", () => api.openFolder());
$("btnWhatsNew").addEventListener("click", () => {
  const box = $("whatsNew");
  box.hidden = !box.hidden;
});

$("btnBrowse").addEventListener("click", async () => {
  const picked = await api.browse($("dir").value);
  if (picked) $("dir").value = picked;
});

$("btnMin").addEventListener("click", () => api.minimize());
$("btnClose").addEventListener("click", () => api.close());
$("btnCancel").addEventListener("click", () => {
  if (stage === "error") return api.close();
  if (!busy) return api.close();
  if (!confirm("التثبيت جارٍ الآن — هل تريد إلغاءه؟ سيتم تنظيف الملفات المؤقتة.")) return;
  api.cancel();
});

$("btnNext").addEventListener("click", async () => {
  if (busy) return;
  if (stage === "error") {
    // إعادة المحاولة من الصفر بحالة نظيفة (بدون reload)
    stage = "dir";
    show("pgDir");
    $("btnBack").hidden = true;
    $("btnCancel").hidden = false;
    $("btnCancel").textContent = "إلغاء";
    $("btnNext").textContent = "تثبيت";
    $("btnNext").disabled = false;
    $("bar").classList.add("indet");
    return;
  }
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
  let res = null;
  try {
    // التثبيت ممكن ياخد دقايق — بلا مهلة هنا، لكن أي استثناء يُترجم لرسالة واضحة
    res = await api.install({
      dir: target,
      desktopShortcut: $("optDesktop").checked,
      startMenuShortcut: $("optStart").checked,
    });
  } catch (e) {
    res = { ok: false, error: String((e && e.message) || e) };
  }

  if (!res || !res.ok) {
    busy = false;
    stage = "error";
    show("pgError");
    $("errText").textContent = (res && res.error) || "حدث خطأ غير متوقع أثناء التثبيت.";
    // أزرار الطوارئ: إعادة المحاولة أو الإغلاق — لا شاشة ميتة
    $("btnBack").hidden = true;
    $("btnCancel").hidden = false;
    $("btnCancel").textContent = "إغلاق";
    $("btnNext").textContent = "إعادة المحاولة";
    $("btnNext").disabled = false;
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

api.onProgress((payload) => {
  if (payload && payload.error) {
    busy = false;
    show("pgError");
    $("errText").textContent = payload.error;
    $("btnNext").textContent = "إغلاق";
    $("btnNext").disabled = false;
    $("btnNext").onclick = () => api.close();
    return;
  }
  const { percent, message, detail } = payload || {};
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
  $("spaceMeta").textContent = "المساحة المطلوبة: 420 ميجابايت";
  // رقم الإصدار مطبوع داخل الصفحة نفسها وقت البناء ⇒ لا نمسحه أبدًا
});

// شبكة أمان: لو أي زر لم يستجب لأي سبب، نُظهر رسالة بدل الصمت
window.addEventListener("error", (e) => {
  const box = document.getElementById("spaceMeta");
  if (box) box.textContent = `تعذّر تحضير بعض بيانات المثبّت (${e.message || "خطأ"}) — يمكنك المتابعة بالضغط على «تثبيت».`;
});
