# مثبّت FATORA (Electron — نمط Windows 11)

بديل كامل لمعالج NSIS الكلاسيكي: نافذة 720×480 بحواف مستديرة وأزرار ويندوز 11،
نص تقدّم متحرك، ونصوص عربية من اليمين لليسار.

## الملفات
| الملف | الوظيفة |
| --- | --- |
| `index.html` | واجهة المثبّت (3 صفحات: مكان التثبيت / التقدم / الانتهاء) |
| `installer.js` | منطق الواجهة + دوران الرسائل والنصائح |
| `main.js` | العملية الرئيسية: فك الحمولة، الاختصارات، السجل، الإزالة |
| `preload.js` | جسر آمن (contextBridge) |
| `buildSetup.cjs` | يبني هيكل المثبّت من `dist/win-unpacked` + يضغط الحمولة 7z |
| `writePayload.cjs` | يلحق الحمولة بملف الـ exe ويخرج `FATORA-Setup-<version>.exe` |

## كيف يعمل
1. `electron-builder` يبني التطبيق في `desktop/dist/win-unpacked`.
2. `buildSetup.cjs` ينسخ ملفات Electron فقط إلى `dist-setup/stub`، ويضع واجهة المثبّت في `resources/app`،
   ثم يضغط ملفات التطبيق في `dist-setup/resources-payload.7z` بأداة `7za` من `7zip-bin`.
3. `writePayload.cjs` يكتب حجم الحمولة في أول 32 بايت من الـ exe ثم يلحق الحمولة به
   (`payloadStart = fileSize - payloadSize`).
4. عند التشغيل: المثبّت يقرأ الحجم، يستخرج الحمولة إلى 7z مؤقت، يفكّها في مجلد التثبيت،
   ينشئ الاختصارات ويسجّل البرنامج في «إضافة/إزالة البرامج»، وينشئ ملف إزالة بدون الحمولة.

## أوامر
```bash
cd desktop
npm run dist:local   # أو dist على وسم الإصدار (ينشر تلقائيًا)
```
