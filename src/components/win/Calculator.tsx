"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Dialog } from "./Window";

const OPS = ["+", "-", "×", "÷"];

function evaluate(expr: string): number | null {
  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-×÷])/g);
  if (!tokens) return null;
  const nums: number[] = [];
  const ops: string[] = [];
  let expectNum = true;
  let neg = false;
  for (const t of tokens) {
    if (expectNum) {
      if (t === "-") {
        neg = !neg;
        continue;
      }
      if (OPS.includes(t)) return null;
      nums.push(neg ? -Number(t) : Number(t));
      neg = false;
      expectNum = false;
    } else {
      if (!OPS.includes(t)) return null;
      ops.push(t);
      expectNum = true;
    }
  }
  if (expectNum) ops.pop();
  // الضرب والقسمة أولاً
  const n2: number[] = [nums[0]];
  const o2: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    const b = nums[i + 1];
    if (b === undefined) break;
    if (ops[i] === "×") n2[n2.length - 1] *= b;
    else if (ops[i] === "÷") n2[n2.length - 1] = b === 0 ? NaN : n2[n2.length - 1] / b;
    else {
      o2.push(ops[i]);
      n2.push(b);
    }
  }
  let r = n2[0];
  for (let i = 0; i < o2.length; i++) r = o2[i] === "+" ? r + n2[i + 1] : r - n2[i + 1];
  return Number.isFinite(r) ? Math.round(r * 1e9) / 1e9 : null;
}

const KEYS = ["C", "⌫", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "00", "0", ".", "="];

export function CalculatorDialog({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("0");
  const [history, setHistory] = useState<string[]>([]);

  const press = useCallback(
    (k: string) => {
      if (k === "C") {
        setExpr("");
        setResult("0");
      } else if (k === "⌫") {
        setExpr((e) => e.slice(0, -1));
      } else if (k === "=") {
        const r = evaluate(expr);
        if (r === null) {
          setResult("خطأ");
          return;
        }
        setHistory((h) => [`${expr} = ${r}`, ...h].slice(0, 6));
        setResult(String(r));
        setExpr(String(r));
      } else if (k === "%") {
        const r = evaluate(expr);
        if (r !== null) setExpr(String(Math.round((r / 100) * 1e9) / 1e9));
      } else if (OPS.includes(k)) {
        setExpr((e) => (e && OPS.includes(e.slice(-1)) ? e.slice(0, -1) + k : e + k));
      } else {
        setExpr((e) => e + k);
      }
    },
    [expr],
  );

  useEffect(() => {
    const map: Record<string, string> = { "*": "×", "/": "÷", Enter: "=", "=": "=", Backspace: "⌫", Delete: "C" };
    const h = (e: KeyboardEvent) => {
      const k = map[e.key] ?? e.key;
      if (KEYS.includes(k) || k === "-" || k === "+") {
        e.preventDefault();
        e.stopPropagation();
        press(k);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [press]);

  const live = expr ? evaluate(expr) : null;

  return (
    <Dialog title="الآلة الحاسبة" onClose={onClose} width={360}>
      <div dir="ltr" className="mb-3 rounded-lg border border-[#9fb2cf] bg-gradient-to-b from-[#e9f7e6] to-[#cfeec9] p-3 text-right shadow-inner">
        <div className="num min-h-[22px] truncate text-[16px] font-bold text-slate-600">{expr || " "}</div>
        <div className="num truncate text-[34px] font-black text-[#0b2350]">{live !== null && expr ? live : result}</div>
      </div>
      <div dir="ltr" className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={`btn h-[52px] text-[22px] ${k === "=" ? "btn-green" : k === "C" ? "btn-red" : OPS.includes(k) || k === "%" || k === "⌫" ? "btn-blue" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] font-bold text-slate-500">يمكنك الكتابة من لوحة المفاتيح</span>
        <button
          type="button"
          className="btn h-8 px-3 text-[13px]"
          onClick={() => navigator.clipboard?.writeText(String(live ?? result)).catch(() => undefined)}
        >
          <Copy className="h-4 w-4" />
          نسخ الناتج
        </button>
      </div>
      {history.length > 0 && (
        <div dir="ltr" className="mt-2 space-y-0.5 rounded-md border border-[#d5deea] bg-white p-2 text-right">
          {history.map((h, i) => (
            <div key={i} className="num text-[13px] font-bold text-slate-600">
              {h}
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
