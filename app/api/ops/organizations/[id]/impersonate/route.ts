import { NextResponse } from "next/server";
import { IMPERSONATION_SESSION_MAX_AGE_SEC, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-cookie";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { resolveImpersonationTarget } from "@/lib/ops/impersonate";
import { signSession } from "@/lib/session";

// Mint a short-lived, read-only tenant session so a support operator can view the app as
// this organization. Requires support role or higher. See docs/OPERATOR_CONSOLE.md §3.6.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // reason is optional
  }

  const target = await resolveImpersonationTarget(id);
  if (!target) {
    return NextResponse.json(
      { error: "No app user found for this organization — cannot impersonate." },
      { status: 409 },
    );
  }

  const token = await signSession(
    {
      sub: target.appUserId,
      orgId: target.orgId,
      email: target.email,
      readOnly: true,
      impersonatedBy: guard.ctx.operatorUserId,
      orgName: target.orgName,
    },
    {
      maxAgeSec: IMPERSONATION_SESSION_MAX_AGE_SEC,
      readOnly: true,
      impersonatedBy: guard.ctx.operatorUserId,
      orgName: target.orgName,
    },
  );

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "impersonate.start",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      reason: reason || undefined,
      asEmail: target.email,
      asAppUserId: target.appUserId,
      expiresInSec: IMPERSONATION_SESSION_MAX_AGE_SEC,
    },
  });

  const res = NextResponse.json({
    ok: true,
    redirectUrl: "/roster",
    orgName: target.orgName,
    asEmail: target.email,
  });
  res.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(IMPERSONATION_SESSION_MAX_AGE_SEC),
  );
  return res;
}
