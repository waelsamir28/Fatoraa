"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  PackageX,
  RefreshCw,
  Search,
  Send,
  ShoppingCart,
} from "lucide-react";
import { Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { IconWarehouse } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtQty } from "@/lib/format";
import { downloadSheet } from "@/lib/xlsx";

interface Item {
  id: number;
  code: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  salePrice: number;
  costPrice: number;
}

export function LowStockAlerts() {
  const { toast } = useDesktop();
  const [items, setItems] = useState<Item[] | null>(null);
  const [outCount, setOutCount] = useState(0);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "out" | "low">("all");
  const [busy, setBusy] = useState<"" | "telegram" | "whatsapp">("");

  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await api<{ items: Item[]; count: number; outOfStock: number }>("/api/alerts/low-stock");
      setItems(r.items);
      setOutCount(r.outOfStock);
    } catch (e) {
      toast(errMsg(e), "error");
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter((p) => {
      if (tab === "out" && p.stock > 0) return false;
      if (tab === "low" && p.stock <= 0) return false;
      return !s || p.name.toLowerCase().includes(s) || p.code.includes(s);
    });
  }, [items, q, tab]);

  const refillCost = useMemo(
    () => (items ?? []).reduce((s, p) => s + Math.max(0, p.minStock - p.stock) * p.costPrice, 0),
    [items],
  );
  const refillValue = useMemo(
    () => (items ?? []).reduce((s, p) => s + Math.max(0, p.minStock - p.stock) * p.salePrice, 0),
    [items],
  );

  /** إرسال التنبيه على تيليجرام */
  const sendTelegram = async () => {
    setBusy("telegram");
    try {
      const r = await api<{ ok: boolean; error?: string; count?: number }>("/api/alerts/low-stock", {
        method: "POST",
        json: { action: "telegram" },
      });
      if (!r.ok) toast(r.error || "تعذر إرسال التنبيه", "error");
      else toast(`تم إرسال تنبيه بـ ${r.count ?? 0} صنفاً على تيليجرام ✓`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  /** فتح واتساب بنص التنبيه */
  const openWhatsApp = async () => {
    setBusy("whatsapp");
    try {
      const r = await api<{ text: string }>("/api/alerts/low-stock", { method: "POST", json: { action: "whatsapp" } });
      await navigator.clipboard.writeText(r.text).catch(() => undefined);
      window.open(`https://wa.me/?text=${encodeURIComponent(r.text)}`, "_blank");
      toast("تم فتح واتساب مع نص التنبيه (والنص منسوخ أيضاً)");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  const copyText = async () => {
    try {
      const r = await api<{ text: string }>("/api/alerts/low-stock", { method: "POST", json: { action: "text" } });
      await navigator.clipboard.writeText(r.text);
      toast("تم نسخ قائمة النواقص ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const exportExcel = async () => {
    if (!items?.length) {
      toast("لا توجد أصناف ناقصة للتصدير", "info");
      return;
    }
    try {
      await downloadSheet(
        [
          {
            name: "الأصناف الناقصة",
            rows: [
              ["الكود", "الصنف", "العبوة", "الرصيد الحالي", "الحد الأدنى", "الكمية المطلوبة", "سعر الشراء", "تكلفة التعبئة", "سعر البيع"],
              ...items.map((p) => [
                p.code,
                p.name,
                p.unit,
                p.stock,
                p.minStock,
                Math.max(0, p.minStock - p.stock),
                p.costPrice,
                Math.max(0, p.minStock - p.stock) * p.costPrice,
                p.salePrice,
              ]),
            ],
          },
        ],
        `تقرير-النواقص-${new Date().toISOString().slice(0, 10)}`,
      );
      toast("تم تصدير تقرير النواقص ✓");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  return (
    <Window
      title="تنبيهات الأصناف الناقصة (النواقص)"
      icon={<IconWarehouse className="h-9 w-9" />}
      statusBar={
        <>
          <span>أصناف ناقصة: {items?.length ?? 0}</span>
          <span className="sep" />
          <span>نفدت تماماً: {outCount}</span>
          <span className="sep" />
          <span>تكلفة إعادة التعبئة: {fmt(refillCost)} ج.م</span>
          <span className="ms-auto">التنبيه اليومي التلقائي يعمل عند ربط تيليجرام</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col gap-2.5 p-3">
        {/* المؤشرات */}
        <div className="grid shrink-0 grid-cols-4 gap-2.5">
          <Kpi label="إجمالي النواقص" value={items?.length ?? 0} color="red" sub="أصناف تحت الحد الأدنى" />
          <Kpi label="نفدت تماماً" value={outCount} color="navy" sub="تحتاج شراء فوري" />
          <Kpi label="تكلفة إعادة التعبئة" value={fmt(refillCost)} color="orange" sub="بسعر الشراء" />
          <Kpi label="قيمة البيع المتوقعة" value={fmt(refillValue)} color="green" sub="بسعر البيع" />
        </div>

        {/* شريط الأدوات */}
        <div className="panel flex shrink-0 flex-wrap items-center gap-2 px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="win-input w-[260px] pr-8"
              placeholder="بحث بالاسم أو الكود..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex overflow-hidden rounded-md border border-[#c3d0e3]">
            {([
              ["all", "الكل"],
              ["out", "نفدت"],
              ["low", "تحت الحد"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 text-[13px] font-black transition ${
                  tab === k ? "bg-[#0f2942] text-white" : "bg-white text-[#0f2942] hover:bg-[#eef4fa]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button type="button" className="btn h-[34px] px-3" onClick={() => void load()} title="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="ms-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="btn btn-blue h-[34px] px-3 text-[13px] font-black"
              onClick={() => void sendTelegram()}
              disabled={busy !== ""}
            >
              {busy === "telegram" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال على تيليجرام
            </button>
            <button
              type="button"
              className="btn btn-green h-[34px] px-3 text-[13px] font-black"
              onClick={() => void openWhatsApp()}
              disabled={busy !== ""}
            >
              {busy === "whatsapp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              واتساب
            </button>
            <button type="button" className="btn h-[34px] px-3 text-[13px] font-black" onClick={() => void copyText()}>
              <Copy className="h-4 w-4" />
              نسخ القائمة
            </button>
            <button type="button" className="btn h-[34px] px-3 text-[13px] font-black" onClick={() => void exportExcel()}>
              <Download className="h-4 w-4" />
              Excel
            </button>
            <a href="/smart-orders" className="btn h-[34px] px-3 text-[13px] font-black" target="_blank" rel="noreferrer">
              <ShoppingCart className="h-4 w-4 text-blue-700" />
              طلبات الشراء
            </a>
          </div>
        </div>

        {/* الجدول */}
        <div className="panel min-h-0 flex-1 overflow-auto">
          {items === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[14px] font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> جاري التحميل...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Bell className="h-12 w-12 text-slate-300" />
              <div className="text-[15px] font-black text-slate-600">
                {items.length === 0 ? "لا توجد نواقص — كل الأصناف فوق الحد الأدنى ✓" : "لا نتائج مطابقة للبحث"}
              </div>
              <div className="text-[12px] font-bold text-slate-400">
                {items.length === 0
                  ? "اضبط «الحد الأدنى» لكل صنف من شاشة الأصناف ليعمل التنبيه تلقائياً"
                  : "جرّب كلمة بحث أخرى أو غيّر التبويب"}
              </div>
            </div>
          ) : (
            <table className="dgrid text-center text-[14px]">
              <thead>
                <tr>
                  <th className="w-[40px]">م</th>
                  <th className="w-[110px]">الكود</th>
                  <th className="text-right">الصنف</th>
                  <th className="w-[90px]">العبوة</th>
                  <th className="w-[100px]">الرصيد</th>
                  <th className="w-[110px]">الحد الأدنى</th>
                  <th className="w-[120px]">المطلوب شراؤه</th>
                  <th className="w-[120px]">تكلفة التعبئة</th>
                  <th className="w-[100px]">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const need = Math.max(0, p.minStock - p.stock);
                  const out = p.stock <= 0;
                  return (
                    <tr key={p.id}>
                      <td className="num">{i + 1}</td>
                      <td className="num font-bold">{p.code}</td>
                      <td className="text-right font-black text-[#0f2942]">{p.name}</td>
                      <td>{p.unit}</td>
                      <td className="num font-black text-red-600">{fmtQty(p.stock)}</td>
                      <td className="num">{fmtQty(p.minStock)}</td>
                      <td className="num font-black text-blue-800">{fmtQty(need)}</td>
                      <td className="num">{fmt(need * p.costPrice)}</td>
                      <td>
                        {out ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11.5px] font-black text-red-700">
                            <PackageX className="h-3 w-3" /> نفد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11.5px] font-black text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> منخفض
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="text-right font-black">
                    الإجمالي ({filtered.length} صنف)
                  </td>
                  <td className="num font-black text-orange-700">
                    {fmt(filtered.reduce((s, p) => s + Math.max(0, p.minStock - p.stock) * p.costPrice, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="shrink-0 rounded-md bg-[#eef4fa] px-3 py-1.5 text-[11.5px] font-bold text-slate-600">
          💡 للحصول على التنبيه اليومي التلقائي: اربط بوت تيليجرام من «الإعدادات ← تيليجرام»، وسيُرسل تنبيه واحد يومياً عند فتح البرنامج.
        </div>
      </div>
    </Window>
  );
}
