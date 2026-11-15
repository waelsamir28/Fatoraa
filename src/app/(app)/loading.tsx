/** شاشة تحميل خفيفة تظهر لحظة الانتقال بين الشاشات (بدون طلبات شبكة) */
export default function AppLoading() {
  return (
    <div className="grid h-screen w-full place-items-center bg-gradient-to-b from-[#eef5fd] to-[#dfeaf8]" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-11 w-11">
          <span className="absolute inset-0 rounded-full border-4 border-[#c9dcf2]" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#2fb3a6] border-r-[#2fb3a6]" />
        </div>
        <span className="text-[13px] font-black text-[#0f2942]">جاري الفتح…</span>
      </div>
    </div>
  );
}
