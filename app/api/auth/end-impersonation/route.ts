import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-cookie";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { getSession, isOperatorTenantSession, isOnboardingSimulateSession } from "@/lib/session";

// End an operator impersonation or onboarding-simulation session and return to ops.
export async function POST() {
  const session = await getSession();
  if (!session || !isOperatorTenantSession(session)) {
    return NextResponse.json({ error: "Not in an operator tenant session" }, { status: 400 });
  }

  if (session.impersonatedBy) {
    await recordOperatorAudit({
      operatorUserId: session.impersonatedBy,
      action: isOnboardingSimulateSession(session)
        ? "onboarding.simulate.end"
        : "impersonate.end",
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
