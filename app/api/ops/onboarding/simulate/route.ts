import { NextResponse } from "next/server";
import { IMPERSONATION_SESSION_MAX_AGE_SEC, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-cookie";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { resolveImpersonationTarget } from "@/lib/ops/impersonate";
import {
  ensureOnboardingSandboxOrg,
  resetOnboardingSandbox,
} from "@/lib/ops/onboarding-sandbox";
import { signSession } from "@/lib/session";

/**
 * Reset the dedicated onboarding sandbox and open a setup-scoped operator session
 * on `/setup`. Support role or higher.
 */
export async function POST(request: Request) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // reason is optional
  }

  const sandbox = await ensureOnboardingSandboxOrg();
  await resetOnboardingSandbox(sandbox.id);

  const target = await resolveImpersonationTarget(sandbox.id);
  if (!target) {
    return NextResponse.json(
      { error: "Onboarding sandbox has no app user — cannot simulate." },
      { status: 409 },
    );
  }

  const token = await signSession(
    {
      sub: target.appUserId,
      orgId: target.orgId,
      email: target.email,
      onboardingSimulate: true,
      impersonatedBy: guard.ctx.operatorUserId,
      orgName: target.orgName,
    },
    {
      maxAgeSec: IMPERSONATION_SESSION_MAX_AGE_SEC,
      onboardingSimulate: true,
      impersonatedBy: guard.ctx.operatorUserId,
      orgName: target.orgName,
    },
  );

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "onboarding.simulate.start",
    targetType: "organization",
    targetId: sandbox.id,
    organizationId: sandbox.id,
    metadata: {
      reason: reason || undefined,
      asEmail: target.email,
      asAppUserId: target.appUserId,
      sandboxCreated: sandbox.created,
      expiresInSec: IMPERSONATION_SESSION_MAX_AGE_SEC,
    },
  });

  const res = NextResponse.json({
    ok: true,
    redirectUrl: "/setup",
    orgId: sandbox.id,
    orgName: target.orgName,
    asEmail: target.email,
    sandboxCreated: sandbox.created,
  });
  res.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(IMPERSONATION_SESSION_MAX_AGE_SEC),
  );
  return res;
}
