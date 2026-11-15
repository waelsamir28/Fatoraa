import { getSession } from "@/lib/server/session";
import { getConfig, setConfig, deleteConfig } from "@/lib/server/config-store";
import { handle, readJson, str } from "@/lib/server/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = "home.avatar";

/** صورة المستخدم الظاهرة في الشاشة الرئيسية */
export function GET() {
  return handle(async () => {
    const avatar = (await getConfig(KEY).catch(() => "")) || "";
    return { avatar };
  });
}

/** حفظ صورة جديدة (data URL) — من شاشة المستخدمين */
export function PUT(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    const b = await readJson(req);
    const avatar = str(b.avatar);
    if (!avatar) {
      await deleteConfig(KEY).catch(() => undefined);
      return { ok: true, avatar: "" };
    }
    if (!/^data:image\//.test(avatar)) {
      return NextResponse.json({ error: "الملف ليس صورة صالحة" }, { status: 400 });
    }
    if (avatar.length > 900_000) {
      return NextResponse.json({ error: "الصورة كبيرة — استخدم صورة أصغر من 700 كيلوبايت" }, { status: 400 });
    }
    await setConfig(KEY, avatar);
    return { ok: true, avatar };
  });
}
