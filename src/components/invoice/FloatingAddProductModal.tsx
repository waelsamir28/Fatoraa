"use client";

import { useState } from "react";
import { Plus, Save, Upload, X } from "lucide-react";
import { Dialog, Field } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";
import { UNITS } from "@/lib/constants";
import type { Product } from "@/lib/types";

export function FloatingAddProductModal({
  onClose,
  onProductCreated,
  categories = [],
}: {
  onClose: () => void;
  onProductCreated: (p: Product) => void;
  categories?: string[];
}) {
  const { toast } = useDesktop();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("أدوات مدرسية");
  const [unit, setUnit] = useState("قطعة");
  const [code, setCode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [stock, setStock] = useState("10");
  const [minStock, setMinStock] = useState("5");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("يرجى كتابة اسم الصنف", "error");
      return;
    }
    setBusy(true);
    try {
      const p = await api<Product>("/api/products", {
        method: "POST",
        json: {
          name: name.trim(),
          category: category.trim() || "عام",
          unit: unit.trim() || "قطعة",
          code: code.trim(),
          costPrice: Number(costPrice) || 0,
          salePrice: Number(salePrice) || 0,
          wholesalePrice: Number(wholesalePrice) || Number(salePrice) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
          imageUrl,
        },
      });

      toast(`تمت إضافة صنف "${p.name}" بنجاح وإدراجه في الفاتورة`);
      onProductCreated(p);
      onClose();
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="إضافة صنف جديد سريعاً إلى الفاتورة والمخزن" onClose={onClose} width={580}>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="اسم الصنف *" className="col-span-2">
            <input
              autoFocus
              className="win-input w-full font-black text-blue-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: كشكول سلك 100 ورقة / كارت أفراح فاخر..."
            />
          </Field>

          <Field label="المجموعة / القسم">
            <input
              className="win-input w-full font-bold"
              list="floating-cats"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="floating-cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="العبوة أو الوحدة">
            <input
              className="win-input w-full font-bold"
              list="floating-units"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <datalist id="floating-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>

          <Field label="الباركود (توليد تلقائي إن تركته فارغاً)">
            <input
              className="win-input num w-full"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="باركود دولي أو تلقائي"
            />
          </Field>

          <Field label="سعر الشراء (التكلفة)">
            <input
              className="win-input num w-full"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="سعر البيع للجمهور *">
            <input
              className="win-input num w-full font-black text-green-700 text-[16px]"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="سعر الجملة">
            <input
              className="win-input num w-full font-bold text-orange-600"
              inputMode="decimal"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
              placeholder="نفس سعر البيع"
            />
          </Field>

          <Field label="الرصيد الافتتاحي بالمخزن">
            <input
              className="win-input num w-full font-black"
              inputMode="decimal"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>

          <Field label="الحد الأدنى">
            <input
              className="win-input num w-full"
              inputMode="decimal"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
          </Field>

          <div className="col-span-2">
            <span className="form-label">صورة الصنف (رفع من الكمبيوتر)</span>
            <div className="flex items-center gap-3">
              <label className="btn btn-blue h-9 px-4 text-[13px] font-black cursor-pointer">
                <Upload className="h-4 w-4" />
                اختيار صورة من الجهاز
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              </label>
              {imageUrl && <span className="text-[12px] font-black text-green-700">✓ تم تحميل الصورة بنجاح</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            type="submit"
            className="btn btn-green h-10 flex-1 font-black text-[15.5px]"
            disabled={busy}
          >
            <Plus className="h-5 w-5" />
            {busy ? "جاري الحفظ..." : "إضافة الصنف وتحديده فوراً"}
          </button>
          <button type="button" className="btn h-10 px-5 font-bold" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </Dialog>
  );
}
