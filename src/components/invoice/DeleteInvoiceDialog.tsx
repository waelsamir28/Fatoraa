"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react";

const REASONS = [
  "خطأ في الأدخال / صنف غلط",
  "فاتورة مكررة بالخطأ",
  "العميل ألغى الطلب",
  "خطأ في السعر أو الكمية",
  "أخرى (اكتب السبب)",
];

/**
 * نافذة حذف آمن للفاتورة:
 * بتطلب سبب إجباري وتسجّل اسم المستخدم اللي حذف. الفاتورة مش بتتمسح فعلياً
 * من قاعدة البيانات، فبعد كده ممكن تراجعها أو تسترجعها.
 */
export function DeleteInvoiceDialog({
  invoiceNumber,
  busy,
  onCancel,
  onConfirm,
}: {
  invoiceNumber: number | string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [pick, setPick] = useState(REASONS[0]);
  const [custom, setCustom] = useState("");
  const isOther = pick === "أخرى (اكتب السبب)";
  const reason = isOther ? custom.trim() : pick;
  const invalid = isOther && reason.length < 3;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" dir="rtl">
      <div className="w-full max-w-[470px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-red-600 px-5 py-3.5 text-white">
          <ShieldAlert className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-[16px] font-black">تأكيد حذف الفاتورة #{invoiceNumber}</div>
            <div className="text-[11.5px] font-bold text-red-100">حذف آمن — يمكن استرجاعها لاحقاً</div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12px] font-bold leading-relaxed text-amber-900">
              هيتم عكس تأثير الفاتورة على المخزون ورصيد العميل/المورد، والفاتورة هتتشال من التقارير.
              لكن بياناتها هتفضل محفوظة في السجل مع سبب الحذف واسم من قام بالحذف.
            </p>
          </div>

          <div>
            <div className="mb-1.5 text-[12.5px] font-black text-slate-700">سبب الحذف (مطلوب)</div>
            <div className="space-y-1">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition ${
                    pick === r
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="delete-reason"
                    checked={pick === r}
                    onChange={() => setPick(r)}
                    className="accent-red-600"
                  />
                  {r}
                </label>
              ))}
            </div>
            {isOther && (
              <input
                autoFocus
                className="win-input mt-2 w-full"
                placeholder="اكتب سبب الحذف هنا..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border-2 border-slate-300 bg-white text-[13.5px] font-black text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={invalid || busy}
              onClick={() => onConfirm(reason)}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 text-[13.5px] font-black text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              تأكيد الحذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
