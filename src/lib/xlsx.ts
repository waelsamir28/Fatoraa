/** أسماء ملفات Excel آمنة للعربية */
export function safeFileName(name: string, ext = "xlsx"): string {
  const base = String(name || "تقرير")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base}.${ext}`;
}

/** تنزيل ملف Excel جاهز من المتصفح (بدون سيرفر) */
export async function downloadSheet(
  sheets: Array<{ name: string; rows: Array<Array<string | number | null | undefined>> }>,
  fileName: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sh.rows as Array<Array<string | number>>);
    // عرض الأعمدة تلقائياً حسب أطول قيمة
    const widths = (sh.rows[0] ?? []).map((_, ci) => {
      const max = sh.rows.reduce((m, r) => {
        const v = r[ci];
        return Math.max(m, String(v ?? "").length);
      }, 8);
      return { wch: Math.min(46, max + 2) };
    });
    ws["!cols"] = widths;
    XLSX.utils.book_append_sheet(wb, ws, sh.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 30) || "ورقة");
  }
  XLSX.writeFile(wb, safeFileName(fileName));
}
