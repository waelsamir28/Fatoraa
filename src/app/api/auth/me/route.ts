import { NextResponse } from "next/server";
import { getSession, getAuthState } from "@/lib/server/session";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * بيانات المستخدم الحالي + صلاحياته.
 * يرجّع أيضاً dbError لو تعذّر الوصول لقاعدة البيانات، حتى تُظهر الواجهة
 * رسالة واضحة بدل صفحة فارغة أو دخول بدون حساب.
 */
export async function GET() {
  const state = await getAuthState();

  if (state.dbError) {
    return NextResponse.json(
      {
        authEnabled: false,
        dbError: true,
        dbErrorMessage: state.message,
        user: null,
      },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authEnabled: state.enabled, dbError: false, user: null, users: state.users });
  }

  return NextResponse.json({
    authEnabled: state.enabled,
    dbError: false,
    user: {
      id: session.uid,
      username: session.username,
      name: session.name,
      role: session.role,
      roleLabel: ROLE_LABELS[session.role] || session.role,
      branchId: session.branchId,
      permissions: ROLE_PERMISSIONS[session.role] || [],
    },
  });
}
