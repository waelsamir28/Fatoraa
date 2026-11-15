import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { deleteConfig, getConfig, setConfig } from "@/lib/server/config-store";
import { handle, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** مفاتيح الصور: بانر الشاشة الرئيسية + خلفية أزرار القائمة */
const KEYS: Record<string, string> = {
  banner: "home.banner",
  rail: "home.rail",
};

const MAX_LEN = 1_400_000; // ~1 ميجابايت بعد الترميز

function keyOf(kind: string): string | null {
  return KEYS[kind] || null;
}

/** GET /api/home/images?kind=banner|rail — قراءة الصورة (عام) */
export function GET(req: Request) {
  return handle(async () => {
    const kind = new URL(req.url).searchParams.get("kind") || "banner";
    const key = keyOf(kind);
    if (!key) return NextResponse.json({ error: "نوع صورة غير معروف" }, { status: 400 });
    const url = (await getConfig(key).catch(() => "")) || "";
    return { kind, url };
  });
}

/** PUT /api/home/images { kind, url } — حفظ صورة (data URL) أو حذفها */
export function PUT(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

    const b = await readJson(req);
    const kind = str(b.kind) || "banner";
    const key = keyOf(kind);
    if (!key) return NextResponse.json({ error: "نوع صورة غير معروف" }, { status: 400 });

    const url = str(b.url);
    if (!url) {
      await deleteConfig(key).catch(() => undefined);
      return { ok: true, kind, url: "" };
    }
    if (!/^data:image\/(png|jpe?g|webp)/.test(url)) {
      return NextResponse.json({ error: "الملف ليس صورة صالحة (PNG أو JPG أو WEBP)" }, { status: 400 });
    }
    if (url.length > MAX_LEN) {
      return NextResponse.json({ error: "الصورة كبيرة جداً — استخدم صورة أصغر من 1 ميجابايت" }, { status: 400 });
    }
    await setConfig(key, url);
    return { ok: true, kind, url };
  });
}
