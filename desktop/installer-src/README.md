# مثبّت FATORA (ملف واحد — نمط Windows 11)

## لماذا ملف واحد؟
تشغيل واجهة المثبّت مباشرةً على `electron.exe` (حتى بعد إعادة تسميته) **لا يعمل**:
خطأ `ffmpeg.dll was not found` لأن ملف الـ exe لا يحتوي ملفات DLL الخاصة بـ Electron.
الحل: `electron-builder` يبني المثبّت بصيغة **portable** = ملف exe واحد يستخرج نفسه
في `%TEMP%\FATORA-Setup` ثم يشغّل واجهة المثبّت.

## خطوات البناء
1. `electron-builder` ينتج التطبيق في `desktop/dist/win-unpacked`.
2. `buildSetup.cjs`:
   - يضغط التطبيق كله في `dist-setup/resources-payload.7z`.
   - يبني مشروع `dist-setup/setup-app` ويشغّل `electron-builder --win portable`
     (مع `electronDist` لإعادة استخدام Electron الموجود محليًا بدون تحميل).
   - ينسخ الناتج إلى `dist-setup/stub/FATORA-Setup.exe`.
3. `writePayload.cjs` يكتب حجم الحمولة في ترويسة الـ exe ويلحقها،
   وينتج `desktop/dist/FATORA-Setup-<version>.exe`.

## أثناء التشغيل
- `process.env.PORTABLE_EXECUTABLE_FILE` يشير إلى الملف الأصلي الذي يحتوي الحمولة.
- يُلحق الحمولة بملف مؤقت 7z ثم يفكّها بأداة `7za.exe` (مرفقة في `resources`).
- التثبيت الافتراضي: `%LOCALAPPDATA%\Programs\FATORA` (بدون صلاحيات مدير).
- الإزالة: `Uninstall FATORA.bat` داخل مجلد التثبيت + تسجيل في «إضافة/إزالة البرامج».

## أوامر
```bash
cd desktop
npm run dist:local    # بناء محلي بدون نشر
npm run dist          # نشر على GitHub Releases (على وسم الإصدار)
```
