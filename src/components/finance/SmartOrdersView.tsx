"use client";

import { useEffect, useState } from "react";
import { Bot, Check, FileCheck, Plus, RefreshCw, Send, ShoppingCart, Trash2 } from "lucide-react";
import { Dialog, Field, Kpi, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { fmt, fmtDate, fmtQty } from "@/lib/format";
import type { Party, PurchaseOrder, PurchaseOrderItem } from "@/lib/types";

export function SmartOrdersView() {
  const { toast } = useDesktop();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [suggestModal, setSuggestModal] = useState(false);
  const [suggestions, setSuggestions] = useState<PurchaseOrderItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  const load = async () => {
    try {
      const r = await api<{ items: PurchaseOrder[] }>("/api/smart-orders");
      setOrders(r.items);

      const supps = await api<{ items: Party[] }>("/api/parties?type=supplier");
      setSuppliers(supps.items);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openSmartSuggest = async () => {
    setBusy(true);
    try {
      const r = await api<{ suggestions: PurchaseOrderItem[]; totalCost: number; lowCount: number }>("/api/smart-orders?mode=suggest");
      if (!r.suggestions.length) {
        toast("المخزون مكتمل ولا توجد أصناف وصلت للحد الأدنى حالياً", "info");
      }
      setSuggestions(r.suggestions);
      setSuggestModal(true);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const createOrder = async () => {
    if (!suggestions.length) return;
    setBusy(true);
    try {
      const activeItems = suggestions.filter((it) => it.orderedQty > 0);
      if (!activeItems.length) {
        toast("يرجى تحديد كميات للأصناف المطلوب شراؤها", "error");
        return;
      }

      await api("/api/smart-orders", {
        method: "POST",
        json: {
          supplierId: Number(selectedSupplier) || null,
          notes: orderNotes || "طلب شراء ذكي تلقائي للنواقص",
          items: activeItems,
        },
      });

      toast("تم إنشاء أمر الشراء الذكي بنجاح");
      setSuggestModal(false);
      void load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const totalSuggestedCost = suggestions.reduce((s, it) => s + (it.orderedQty || 0) * (it.unitCost || 0), 0);

  return (
    <Window title="طلبات الشراء الذكية (Smart Purchase Orders)" icon={<Bot className="h-8 w-8 text-blue-700" />}>
      <div className="flex h-full w-full flex-col gap-3 p-3">
        {/* شريط الأزرار */}
        <div className="panel flex shrink-0 items-center gap-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <button
            type="button"
            className="btn btn-green h-10 px-5 text-[15.5px] font-black shadow-md"
            onClick={() => void openSmartSuggest()}
            disabled={busy}
          >
            <Bot className="h-5 w-5" />
            توليد طلب شراء ذكي تلقائي (فحص النواقص)
          </button>

          <span className="text-[13px] font-bold text-slate-600 mr-2">
            يقوم الذكاء الاصطناعي بفحص النواقص والحدود الدنيا للأصناف واقتراح كميات التوريد الأنسب
          </span>

          <div className="ms-auto flex items-center gap-2">
            <button type="button" className="btn h-10 px-3" onClick={() => void load()} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="إجمالي طلبات الشراء" value={orders.length} color="navy" sub="أوامر شراء مسجلة" />
          <Kpi
            label="إجمالي قيمة الطلبات"
            value={fmt(orders.reduce((s, o) => s + (o.totalAmount || 0), 0))}
            color="blue"
            sub="ج.م"
          />
          <Kpi label="الموردين المسجلين" value={suppliers.length} color="gold" sub="مورد نشط" />
        </div>

        {/* جدول طلبات الشراء */}
        <div className="panel min-h-0 flex-1 overflow-auto p-0 shadow-inner">
          <table className="dgrid text-center text-[13.5px]">
            <thead>
              <tr>
                <th className="w-16">رقم الطلب</th>
                <th>التاريخ</th>
                <th className="text-right">المورد</th>
                <th>عدد الأصناف</th>
                <th>إجمالي التكلفة المقدرة</th>
                <th>الحالة</th>
                <th className="text-right">ملاحظات الطلب</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="num font-black text-blue-900">#{o.orderNumber}</td>
                  <td className="num">{fmtDate(o.date)}</td>
                  <td className="text-right font-black">{o.supplierName || "مورد عام"}</td>
                  <td className="num font-bold">{o.itemsCount ?? 0}</td>
                  <td className="num font-black text-[15px] text-green-700">{fmt(o.totalAmount)}</td>
                  <td>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-800">
                      مسودة معتمدة
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate text-right text-slate-600">{o.notes}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr className="empty">
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-bold">
                    لا توجد طلبات شراء سابقة، اضغط على (توليد طلب شراء ذكي) لفحص النواقص
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة توليد طلب شراء ذكي */}
      {suggestModal && (
        <Dialog title="اقتراح طلب شراء ذكي للنواقص بناءً على حركة المخزن" onClose={() => setSuggestModal(false)} width={820}>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-black text-blue-900">توجيه الطلب للمورد:</span>
                <select
                  className="win-input font-bold"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="">-- مورد عام / محلي --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[14px] font-black text-green-800">
                إجمالي التكلفة المتوقعة: <span className="num font-display text-[22px]">{fmt(totalSuggestedCost)}</span> ج.م
              </div>
            </div>

            <div className="max-h-[340px] overflow-auto rounded-lg border border-[#b4c4dc] bg-white">
              <table className="dgrid text-center text-[13px]">
                <thead>
                  <tr>
                    <th className="text-right">اسم الصنف الناقص</th>
                    <th>الرصيد الحالي</th>
                    <th>الحد الأدنى</th>
                    <th>الكمية المقترحة</th>
                    <th className="w-24">الكمية المطلوبة</th>
                    <th>سعر الشراء</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((it, idx) => (
                    <tr key={it.productId}>
                      <td className="max-w-[220px] truncate text-right font-black text-blue-900">{it.productName}</td>
                      <td className="num font-bold text-red-600">{fmtQty(it.currentStock)}</td>
                      <td className="num font-bold">{fmtQty(it.minStock)}</td>
                      <td className="num font-black text-green-700">{fmtQty(it.suggestedQty)}</td>
                      <td className="p-1">
                        <input
                          className="win-input num h-7 w-full text-center font-black"
                          type="number"
                          min="0"
                          value={it.orderedQty}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setSuggestions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, orderedQty: val, total: val * x.unitCost } : x)),
                            );
                          }}
                        />
                      </td>
                      <td className="num">{fmt(it.unitCost)}</td>
                      <td className="num font-black text-blue-900">{fmt(it.orderedQty * it.unitCost)}</td>
                    </tr>
                  ))}
                  {!suggestions.length && (
                    <tr className="empty">
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                        المخزون في أمان تام ولا توجد نواقص
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Field label="ملاحظات الطلب أو التوصيل">
              <input
                className="win-input w-full"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="أية ملاحظات لمسئول المشتريات أو المورد..."
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="btn btn-green h-10 flex-1 font-black text-[15px]"
                onClick={() => void createOrder()}
                disabled={busy || !suggestions.length}
              >
                اعتماد وحفظ أمر الشراء
              </button>
              <button type="button" className="btn h-10 px-5" onClick={() => setSuggestModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
