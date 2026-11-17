import { NextResponse } from "next/server";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { branches, settings, users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/server/http";
import { hashPassword, createToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/server/auth";
import { invalidateAuthCache } from "@/lib/server/session";
import { setConfig, CONFIG_KEYS } from "@/lib/server/config-store";
import { DEFAULT_SETTINGS } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

/**
 * إعداد سريع من شاشة واحدة (Wizard):
 * اسم المتجر + هاتف + حساب المالك + (اختياري) تليجرام — بدون أي أكواد.
 * يعمل فقط لو مفيش أي مستخدم، ويرجّع جلسة دخول جاهزة مثل /api/auth/setup.
 */
export function POST(req: Request) {
  return handle(async () => {
    // الشرط: مفيش «مالك» بعد. مجرد وجود حسابات كاشير/مدير لا يمنع الإعداد،
    // وإلا البرنامج يعلق على شاشة دخول بلا أي حساب مالك يُنشئ منها.
    const [own] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, "owner"), eq(users.active, true)));
    if (Number(own?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "تم إعداد البرنامج بالفعل — سجّل الدخول بحسابك" },
        { status: 409 },
      );
    }

    const b = await readJson(req);
    const storeName = str(b.storeName).trim();
    const phone = str(b.phone).trim();
    const username = str(b.username).trim().toLowerCase();
    const password = str(b.password);
    const fullName = str(b.fullName).trim() || storeName || "المالك";
    const telegramToken = str(b.telegramToken).trim();
    const telegramChat = str(b.telegramChat).trim();

    if (username.length < 3) {
      return NextResponse.json({ error: "اسم المستخدم لازم يكون 3 حروف على الأقل" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    // بيانات المتجر
    const patch: Record<string, string> = {};
    if (storeName) {
      patch.storeName = storeName;
      patch.customBigTitle = storeName;
      patch.branchName = storeName;
    }
    if (phone) patch.phone = phone;
    if (Object.keys(patch).length) {
      await db
        .insert(settings)
        .values({ id: 1, ...DEFAULT_SETTINGS, ...patch })
        .onConflictDoUpdate({ target: settings.id, set: patch });
    }

    // فرع رئيسي باسم المتجر
    try {
      const [existing] = await db.select({ id: branches.id }).from(branches).limit(1);
      if (!existing) {
        await db.insert(branches).values({
          code: "MAIN",
          name: storeName || "الفرع الرئيسي",
          phone: phone || "",
          active: true,
        });
      }
    } catch {
      /* الجدول قد لا يكون موجوداً في نسخة قديمة */
    }

    // حساب المالك
    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash: hashPassword(password),
        fullName,
        role: "owner",
        active: true,
      })
      .returning();

    // تليجرام (اختياري) — يُخزَّن في قاعدة البيانات، مش في ملفات
    if (telegramToken && telegramChat) {
      try {
        await setConfig(CONFIG_KEYS.telegramToken, telegramToken);
        await setConfig(CONFIG_KEYS.telegramChat, telegramChat);
      } catch {
        /* لو فشل التخزين نكمل — يمكن ضبطه من الإعدادات لاحقاً */
      }
    }

    invalidateAuthCache();

    const token = createToken({
      uid: user.id,
      username: user.username,
      name: user.fullName,
      role: "owner",
      branchId: null,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, name: user.fullName, role: "owner", roleLabel: "المالك" },
      telegramSaved: Boolean(telegramToken && telegramChat),
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  });
}
