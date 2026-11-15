import { getThanksTemplate, saveThanksTemplate, renderThanks, whatsappLink, DEFAULT_THANKS } from "@/lib/server/thanks";
import { getSettings } from "@/lib/server/seed";
import { handle, num, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** نص رسالة الشكر/العرض الحالية (للعرض في السطور) */
export function GET() {
  return handle(() => getThanksTemplate());
}

/** تعديل نص الرسالة من الإعدادات */
export function PUT(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    return saveThanksTemplate(b as Partial<typeof DEFAULT_THANKS>);
  });
}

/**
 * تجهيز رسالة جاهزة لعميل بعد حفظ أول فاتورة له.
 * body: { name, phone, total, isFirst }
 */
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const tpl = await getThanksTemplate();
    const s = await getSettings();
    const name = str(b.name) || "عميلنا العزيز";
    const total = num(b.total, 0).toFixed(2);
    const isFirst = b.isFirst !== false;
    const text = renderThanks(tpl, { name, store: s.storeName || "المحل", total, isFirst });
    const phone = str(b.phone);
    return {
      enabled: tpl.enabled,
      text,
      phone,
      whatsapp: tpl.enabled && phone ? whatsappLink(phone, text) : "",
    };
  });
}
