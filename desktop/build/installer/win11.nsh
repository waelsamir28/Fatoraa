/**
 * تخصيص مثبّت الويندوز (NSIS) — نمط Windows 11
 * يُحمَّل من desktop/package.json → build.nsis.include
 *
 * ملاحظة مهمة: هذا الملف يُدرَج في أعلى سكربت NSIS (قبل MUI2 وقبل تعريف الصفحات)،
 * لذلك الـ !define التي في أعلى الملف هي التي تؤثر على شكل الصفحات.
 * أما الـ macros (customHeader / customInstall / customUnInstall) فيتم استدعاؤها لاحقًا.
 */

; ---------- حماية من التعريف المزدوج ----------
!ifndef MUI_ABORTWARNING
  !define MUI_ABORTWARNING            ; تأكيد قبل الإلغاء (نمط ويندوز 11)
!endif

!ifndef MUI_HEADERIMAGE_RIGHT
  !define MUI_HEADERIMAGE_RIGHT       ; صورة الترويسة على اليمين
!endif

; ألوان صفحة التثبيت: كحلي FATORA + نص أبيض
!ifndef MUI_INSTFILESPAGE_COLORS
  !define MUI_INSTFILESPAGE_COLORS "0b2f5c FFFFFF"
!endif

; خط النظام الحديث (بدون كسر إذا لم يكن معرّفًا في MUI2)
!ifndef MUI_FONT
  !define MUI_FONT "Segoe UI"
!endif

; عناوين من 3 أسطر (نمط ويندوز 11)
!ifndef MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TITLE_3LINES
!endif
!ifndef MUI_FINISHPAGE_TITLE_3LINES
  !define MUI_FINISHPAGE_TITLE_3LINES
!endif

; ---------- الهوية ----------
!macro customHeader
  ; لا شيء مطلوب هنا: كل تعريفات الشكل موجودة أعلى الملف
  ; لأن هذا الملف يُدرَج قبل MUI2 مباشرةً.
  ; (لا أوامر إضافية هنا)
!macroend

; ---------- أثناء التثبيت: رسائل تُطمئن المستخدم ----------
!macro customInstall
  DetailPrint "جاري تحضير برنامج FATORA..."
  DetailPrint "تجهيز ملفات البرنامج — قد يستغرق دقيقة، من فضلك لا تغلق النافذة."
  DetailPrint "الدعم الفني: 01222355769"
!macroend

!macro customUnInstall
  DetailPrint "جاري إزالة برنامج FATORA..."
!macroend
