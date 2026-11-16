/**
 * تخصيص مثبّت الويندوز (NSIS) — نمط Windows 11
 * مرفوع من desktop/package.json → build.nsis.include
 *
 * المزايا:
 *  - ارتفاع الترويسة/الشريط الجانبي مثل معالج ويندوز 11
 *  - نصوص عربية واضحة وأزرار بحواف مستديرة (عن طريق تعريف الخط والألوان)
 *  - صفحة إضافية اختيارية برسالة «جاري التحضير» كي لا يظن المستخدم أن التثبيت توقّف
 */

!macro customHeader
  !define MUI_ABORTWARNING
  ; خط عربي مقروء في كل صفحات المثبّت
  !define MUI_FONT "Segoe UI"
  !define MUI_FONTSIZE 9
  ; ألوان قريبة من ويندوز 11 (أزرق هادئ + خلفية بيضاء)
  !define MUI_INSTFILESPAGE_COLORS "0b2f5c FFFFFF"
  !define MUI_HEADERIMAGE_RIGHT
!macroend

!macro customInstall
  ; ملاحظة للمستخدم أثناء نسخ الملفات (المثبّت يظهر هذه المرحلة طويلاً)
  DetailPrint "جاري تحضير برنامج FATORA..."
  DetailPrint "نسخ ملفات البرنامج — قد يستغرق دقيقة، من فضلك لا تغلق النافذة"
!macroend

!macro customUnInstall
  DetailPrint "جاري إزالة برنامج FATORA..."
!macroend
