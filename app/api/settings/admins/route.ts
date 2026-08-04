import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getAuthContext } from "@/lib/auth-context";
import {
  getAdminInviteSnapshot,
  inviteAdminToOrganization,
} from "@/lib/clerk/invite-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings/admins
 * Current admin logins, pending invites, and seat usage.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshot = await getAdminInviteSnapshot({
      organizationId: ctx.organizationId,
      appUserId: ctx.appUserId,
      orgRole: ctx.orgRole,
    });

    return NextResponse.json(snapshot);
  } catch (err) {
    return uncaughtApiErrorResponse(err, "settings admins GET");
  }
}

/**
 * POST /api/settings/admins
 * Body: { email: string }
 * Sends a Clerk organization invitation as org:admin (plan-gated).
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.readOnly) {
      return NextResponse.json({ error: "Read-only session" }, { status: 403 });
    }
    if (!ctx.clerkUserId) {
      return NextResponse.json(
        { error: "Sign in with your account to invite admins." },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email : "";
    const result = await inviteAdminToOrganization({
      organizationId: ctx.organizationId,
      inviterClerkUserId: ctx.clerkUserId,
      inviterAppUserId: ctx.appUserId,
      orgRole: ctx.orgRole,
      email,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          kind: result.kind,
          upgradeCta: result.upgradeCta,
          upgradePlan: result.upgradePlan,
        },
        { status: result.status },
      );
    }

    const snapshot = await getAdminInviteSnapshot({
      organizationId: ctx.organizationId,
      appUserId: ctx.appUserId,
      orgRole: ctx.orgRole,
    });

    return NextResponse.json(
      { invitation: result.invitation, ...snapshot },
      { status: 201 },
    );
  } catch (err) {
    return uncaughtApiErrorResponse(err, "settings admins POST");
  }
}
