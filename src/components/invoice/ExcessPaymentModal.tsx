"use client";

import { useEffect } from "react";
import { Banknote, Receipt, X } from "lucide-react";
import { fmt } from "@/lib/format";

interface ExcessPaymentModalProps {
  netTotal: number;
  paidAmount: number;
  partyName: string;
  partyBalance: number;
  currency?: string;
  onRefundCash: () => void;
  onDeductAccount: () => void;
  onCancel: () => void;
}

/**
 * شاشة عائمة: المتبقي للعميل (باقي الحساب)
 * تظهر عند الضغط على حفظ الفاتورة إذا كان المبلغ المدفوع أكبر من صافي الفاتورة.
 */
export function ExcessPaymentModal({
  netTotal,
  paidAmount,
  partyName,
  partyBalance,
  currency = "ج.م",
  onRefundCash,
  onDeductAccount,
  onCancel,
}: ExcessPaymentModalProps) {
  const change = Math.max(0, Math.round((paidAmount - netTotal) * 100) / 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "F1" || e.key === "Enter") {
        e.preventDefault();
        onRefundCash();
      } else if (e.key === "F2") {
        e.preventDefault();
        onDeductAccount();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onDeductAccount, onRefundCash]);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-[#081a2b]/60 p-4 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-enter w-[480px] max-w-[95vw] overflow-hidden rounded-[16px] border border-white/20 bg-white shadow-[0_30px_75px_-12px_rgba(4,18,42,0.58)]"
      >
        {/* شريط العنوان الأخضر + 3 نقاط */}
        <div
          className="flex h-[44px] items-center justify-between px-4 select-none"
          style={{ background: "linear-gradient(180deg, #107c10 0%, #0b5a0b 100%)" }}
        >
          <span className="text-[14px] font-black text-white">المتبقي للعميل (باقي الحساب)</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onCancel} className="h-3 w-3 rounded-full bg-[#ff5f57]" title="إغلاق" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          {/* صافي الفاتورة + المبلغ المدفوع */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <div className="text-[11px] font-bold text-slate-500">صافي الفاتورة</div>
              <div className="num mt-0.5 text-[18px] font-black text-slate-900">
                {fmt(netTotal)} {currency}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <div className="text-[11px] font-bold text-slate-500">المبلغ المدفوع</div>
              <div className="num mt-0.5 text-[18px] font-black text-slate-900">
                {fmt(paidAmount)} {currency}
              </div>
            </div>
          </div>

          {/* المتبقي للعميل (الفكة) */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-center">
            <div className="text-[12px] font-black text-emerald-800">المتبقي للعميل (الفكة)</div>
            <div className="num mt-1 text-[28px] font-black text-emerald-700 leading-tight">
              {fmt(change)} {currency}
            </div>
            <div className="mt-1 text-[11.5px] font-bold text-slate-700">
              الطرف: <span className="font-black text-slate-900">{partyName}</span> • الرصيد الحالي:{" "}
              <span className="num font-black text-slate-900">
                {fmt(partyBalance)} {currency}
              </span>
            </div>
          </div>

          {/* زر 1: تسليم المتبقي للعميل نقداً */}
          <button
            type="button"
            onClick={onRefundCash}
            className="flex w-full flex-col items-center justify-center rounded-xl bg-[#0f7b0f] px-4 py-3 text-white shadow-sm hover:brightness-110 transition"
          >
            <div className="flex items-center gap-2 text-[14.5px] font-black">
              <Banknote className="h-4 w-4" />
              <span>تسليم المتبقي للعميل نقداً</span>
            </div>
            <span className="mt-0.5 text-[10.5px] font-bold text-emerald-100">
              إرجاع باقي الفكة للعميل نقداً (F1 أو Enter)
            </span>
          </button>

          {/* زر 2: تنزيل من الحساب */}
          <button
            type="button"
            onClick={onDeductAccount}
            className="flex w-full flex-col items-center justify-center rounded-xl bg-[#0067c0] px-4 py-3 text-white shadow-sm hover:brightness-110 transition"
          >
            <div className="flex items-center gap-2 text-[14.5px] font-black">
              <Receipt className="h-4 w-4" />
              <span>تنزيل من الحساب (إيداع برصيد العميل)</span>
            </div>
            <span className="mt-0.5 text-[10.5px] font-bold text-sky-100">
              خصم المتبقي من مديونيته السابقة أو إضافة لرصيده الدائن (F2)
            </span>
          </button>

          {/* زر 3: إلغاء وتعديل المدفوع */}
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-1.5 text-[13px] font-black">
              <X className="h-4 w-4" />
              <span>إلغاء وتعديل المدفوع</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">الرجوع لشاشة الفاتورة دون حفظ (Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
