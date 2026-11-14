"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  Wand2,
} from "lucide-react";
import { useDesktop } from "@/components/win/DesktopProvider";
import { api, errMsg } from "@/lib/client";

interface Status {
  configured: boolean;
  source: "database" | "env" | "none";
  tokenMasked: string;
  hasToken: boolean;
  chatId: string;
  cronSecretSet: boolean;
}

interface ChatOption {
  id: string;
  name: string;
}

export function TelegramSetup() {
  const { toast, confirm } = useDesktop();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "test" | "detect" | "clear">("");
  const [chats, setChats] = useState<ChatOption[] | null>(null);
  const [detectHint, setDetectHint] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [step, setStep] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api<Status>("/api/settings/telegram");
      setStatus(s);
      setChatId(s.chatId || "");
      setEditing(!s.configured);
      setStep(s.configured ? 3 : 1);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy("save");
    setResult(null);
    try {
      const r = await api<{ configured: boolean }>("/api/settings/telegram", {
        method: "POST",
        json: { action: "save", token, chatId },
      });
      toast(r.configured ? "تم حفظ إعدادات تيليجرام ✓" : "تم الحفظ — أكمل إدخال بيانات البوت");
      setToken("");
      setEditing(false);
      setStep(r.configured ? 3 : 2);
      await load();
    } catch (e) {
      setResult({ ok: false, text: errMsg(e) });
    } finally {
      setBusy("");
    }
  };

  const detect = async () => {
    setBusy("detect");
    setDetectHint("");
    setChats(null);
    try {
      const r = await api<{ chats: ChatOption[]; hint: string }>("/api/settings/telegram", {
        method: "POST",
        json: { action: "detect-chat", token },
      });
      setChats(r.chats || []);
      setDetectHint(r.hint || "");
      if (r.chats?.length === 1) {
        setChatId(r.chats[0].id);
        toast(`تم اكتشاف المحادثة: ${r.chats[0].name}`);
      } else if (r.chats?.length) {
        toast(`تم اكتشاف ${r.chats.length} محادثة — اختر واحدة`);
      } else {
        toast("لم يتم العثور على محادثات — اتبع التعليمات", "info");
      }
    } catch (e) {
      setDetectHint(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      const r = await api<{ ok: boolean; error?: string; botName?: string }>("/api/settings/telegram", {
        method: "POST",
        json: { action: "test", token, chatId },
      });
      if (r.ok) {
        setResult({
          ok: true,
          text: `تم إرسال رسالة تجريبية بنجاح${r.botName ? ` من البوت @${r.botName}` : ""} — تحقق من تيليجرام الآن.`,
        });
        setStep(3);
      } else {
        setResult({ ok: false, text: r.error || "فشل الإرسال" });
      }
    } catch (e) {
      setResult({ ok: false, text: errMsg(e) });
    } finally {
      setBusy("");
    }
  };

  const clear = async () => {
    const ok = await confirm("إلغاء ربط تيليجرام؟ لن تُرفع النسخ الاحتياطية إليه بعد ذلك.");
    if (!ok) return;
    setBusy("clear");
    try {
      await api("/api/settings/telegram", { method: "POST", json: { action: "clear" } });
      toast("تم إلغاء الربط");
      setChats(null);
      setResult(null);
      setStep(1);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-xl bg-white py-8 shadow-sm ring-1 ring-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* العنوان */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#f7faff] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[13.5px] font-black text-[#0b2350]">
          <Bot className="h-4 w-4 text-blue-600" />
          ربط تيليجرام (نسخة خارج السيرفر)
          {status?.configured && (
            <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-black text-emerald-800">
              <BadgeCheck className="h-3 w-3" /> مربوط
            </span>
          )}
        </div>
        {status?.configured && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded bg-slate-100 px-2 py-1 text-[11.5px] font-black text-slate-700 hover:bg-slate-200"
          >
            تعديل
          </button>
        )}
      </div>

      <div className="space-y-3 p-3">
        {/* الحالة */}
        {status?.configured && !editing && (
          <div className="space-y-1.5 rounded-lg bg-emerald-50 p-2.5 text-[12px] font-bold text-emerald-900">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              النسخ الاحتياطية تُرسل تلقائياً إلى تيليجرام.
            </div>
            <div className="flex flex-wrap gap-3 text-[11.5px] text-emerald-800">
              <span dir="ltr">Bot: {status.tokenMasked}</span>
              <span dir="ltr">Chat: {status.chatId}</span>
              <span className="text-emerald-700">
                المصدر: {status.source === "database" ? "إعدادات البرنامج" : "متغيرات البيئة"}
              </span>
            </div>
          </div>
        )}

        {/* خطوات الإعداد */}
        {(!status?.configured || editing) && (
          <>
            <div className="flex items-center gap-1 text-[11px] font-black">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex flex-1 items-center gap-1">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      step >= n ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={step >= n ? "text-blue-700" : "text-slate-400"}>
                    {n === 1 ? "البوت" : n === 2 ? "المحادثة" : "التأكيد"}
                  </span>
                  {n < 3 && <span className="h-px flex-1 bg-slate-200" />}
                </div>
              ))}
            </div>

            {/* الخطوة 1 */}
            <div className="rounded-lg border border-[#c9d8ee] p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12.5px] font-black text-[#0b2350]">
                  <KeyRound className="h-3.5 w-3.5 text-blue-600" /> 1) توكن البوت
                </div>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                >
                  <ExternalLink className="h-3 w-3" /> افتح BotFather
                </a>
              </div>
              <p className="mb-1.5 text-[11px] font-bold leading-relaxed text-slate-500">
                في تيليجرام: اكتب <b>@BotFather</b> ← <b>/newbot</b> ← اختر اسماً ← سيعطيك توكن مثل{" "}
                <span className="font-mono">123456789:AAH...</span> — انسخه هنا.
              </p>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  dir="ltr"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setChats(null);
                    setResult(null);
                  }}
                  placeholder={status?.hasToken ? status.tokenMasked : "123456789:AAH..."}
                  className="h-9 w-full rounded border-2 border-[#c9d8ee] px-2 pl-9 font-mono text-[12px] text-slate-800 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="إظهار/إخفاء التوكن"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {status?.hasToken && (
                <div className="mt-1 text-[10.5px] font-bold text-slate-400">
                  محفوظ حالياً: <span className="font-mono">{status.tokenMasked}</span> — اتركه فارغاً للإبقاء عليه.
                </div>
              )}
            </div>

            {/* الخطوة 2 */}
            <div className="rounded-lg border border-[#c9d8ee] p-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-black text-[#0b2350]">
                <MessageCircle className="h-3.5 w-3.5 text-blue-600" /> 2) معرّف المحادثة
              </div>
              <p className="mb-1.5 text-[11px] font-bold leading-relaxed text-slate-500">
                افتح البوت في تيليجرام واضغط <b>Start</b> أو أرسل له أي رسالة، ثم اضغط «اكتشاف تلقائي».
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  dir="ltr"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="123456789"
                  className="h-9 min-w-[140px] flex-1 rounded border-2 border-[#c9d8ee] px-2 font-mono text-[12px] text-slate-800 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={detect}
                  disabled={busy === "detect"}
                  className="btn flex h-9 items-center gap-1 px-2.5 text-[12px] disabled:opacity-50"
                >
                  {busy === "detect" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  اكتشاف تلقائي
                </button>
              </div>

              {chats && chats.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className="text-[10.5px] font-black text-slate-500">المحادثات المكتشفة:</div>
                  {chats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChatId(c.id)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-[11.5px] font-bold ${
                        chatId === c.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="font-mono text-[10.5px]">{c.id}</span>
                    </button>
                  ))}
                </div>
              )}
              {detectHint && (
                <div className="mt-1.5 flex items-start gap-1 rounded bg-amber-50 px-2 py-1 text-[10.5px] font-bold text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{detectHint}</span>
                </div>
              )}
            </div>

            {/* الخطوة 3: الأزرار */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={save}
                disabled={busy === "save" || (!token && !status?.hasToken)}
                className="btn btn-blue flex h-9 items-center gap-1.5 px-3 text-[12.5px] disabled:opacity-40"
              >
                {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                حفظ الإعدادات
              </button>
              <button
                type="button"
                onClick={test}
                disabled={busy === "test" || (!token && !status?.hasToken) || !chatId}
                className="btn flex h-9 items-center gap-1.5 px-3 text-[12.5px] disabled:opacity-40"
              >
                {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                إرسال رسالة تجريبية
              </button>
              {status?.hasToken && (
                <button
                  type="button"
                  onClick={clear}
                  disabled={busy === "clear"}
                  className="btn flex h-9 items-center gap-1.5 px-2.5 text-[12.5px] text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> إلغاء الربط
                </button>
              )}
            </div>

            {result && (
              <div
                className={`flex items-start gap-1.5 rounded-lg p-2 text-[11.5px] font-bold ${
                  result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"
                }`}
              >
                {result.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span className="leading-relaxed">{result.text}</span>
              </div>
            )}

            <div className="flex items-start gap-1 rounded bg-slate-50 px-2 py-1.5 text-[10.5px] font-bold leading-relaxed text-slate-500">
              <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                بعد الربط، كل نسخة احتياطية (تلقائية يومياً أو يدوية) تُرسل كملف على تيليجرام — وتحفظها عندك
                للأبد حتى لو السيرفر تعطل.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
