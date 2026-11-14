import { NextResponse } from "next/server";
import { getSession, isAuthEnabled } from "@/lib/server/session";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** بيانات المستخدم الحالي + صلاحياته (تستخدمها الواجهة) */
export async function GET() {
  const enabled = await isAuthEnabled();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authEnabled: enabled, user: null });
  }
  return NextResponse.json({
    authEnabled: enabled,
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
