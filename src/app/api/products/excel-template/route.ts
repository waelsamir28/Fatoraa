import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  const sampleData = [
    {
      "اسم الصنف": "كشكول سلك 100 ورقة مسطر فاخر",
      "المجموعة": "أدوات مدرسية",
      "العبوة": "كشكول",
      "سعر الشراء": 18,
      "سعر البيع": 25,
      "سعر الجملة": 22,
      "الرصيد الحالي": 100,
      "الحد الأدنى": 20,
      "الباركود (اختياري)": "6221001001",
    },
    {
      "اسم الصنف": "باكت أقلام جاف بريما أزرق (12 قلم)",
      "المجموعة": "أدوات مدرسية",
      "العبوة": "باكت",
      "سعر الشراء": 45,
      "سعر البيع": 60,
      "سعر الجملة": 52,
      "الرصيد الحالي": 60,
      "الحد الأدنى": 10,
      "الباركود (اختياري)": "",
    },
    {
      "اسم الصنف": "كارت أفراح ليزر مذهب مع ظرف كلاسيك",
      "المجموعة": "كروت أفراح",
      "العبوة": "طقم",
      "سعر الشراء": 280,
      "سعر البيع": 420,
      "سعر الجملة": 370,
      "الرصيد الحالي": 20,
      "الحد الأدنى": 5,
      "الباركود (اختياري)": "",
    },
    {
      "اسم الصنف": "طباعة يفطة بنر إعلاني خارجي مقوى",
      "المجموعة": "دعاية وإعلان",
      "العبوة": "متر مربع",
      "سعر الشراء": 65,
      "سعر البيع": 110,
      "سعر الجملة": 95,
      "الرصيد الحالي": 500,
      "الحد الأدنى": 30,
      "الباركود (اختياري)": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // ضبط اتجاه الورقة من اليمين إلى اليسار
  ws["!views"] = [{ rightToLeft: true }];
  ws["!cols"] = [
    { wch: 38 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الأصناف");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="aljamal-products-template.xlsx"',
    },
  });
}
