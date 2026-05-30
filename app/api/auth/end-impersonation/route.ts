import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-cookie";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { getSession, isReadOnlySession } from "@/lib/session";

// End a read-only operator impersonation session and return to the operator console.
export async function POST() {
  const session = await getSession();
  if (!session || !isReadOnlySession(session)) {
    return NextResponse.json({ error: "Not in an impersonation session" }, { status: 400 });
  }

  if (session.impersonatedBy) {
    await recordOperatorAudit({
      operatorUserId: session.impersonatedBy,
      action: "impersonate.end",
      targetType: "organization",
      targetId: session.orgId,
      organizationId: session.orgId,
      metadata: { asEmail: session.email },
    });
  }

  const res = NextResponse.json({
    ok: true,
    redirectUrl: `/ops/organizations/${session.orgId}`,
  });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
