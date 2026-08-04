import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getAuthContext } from "@/lib/auth-context";
import {
  getAdminInviteSnapshot,
  revokeAdminInvitation,
} from "@/lib/clerk/invite-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/settings/admins/invitations/[invitationId]
 * Revoke a pending Clerk organization invitation.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.readOnly) {
      return NextResponse.json({ error: "Read-only session" }, { status: 403 });
    }
    if (!ctx.clerkUserId) {
      return NextResponse.json(
        { error: "Sign in with your account to manage invitations." },
        { status: 400 },
      );
    }

    const { invitationId } = await context.params;
    if (!invitationId?.trim()) {
      return NextResponse.json({ error: "Missing invitation id" }, { status: 400 });
    }

    const result = await revokeAdminInvitation({
      organizationId: ctx.organizationId,
      invitationId: invitationId.trim(),
      requestingClerkUserId: ctx.clerkUserId,
      orgRole: ctx.orgRole,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const snapshot = await getAdminInviteSnapshot({
      organizationId: ctx.organizationId,
      appUserId: ctx.appUserId,
      orgRole: ctx.orgRole,
    });

    return NextResponse.json(snapshot);
  } catch (err) {
    return uncaughtApiErrorResponse(err, "settings admins invitation DELETE");
  }
}
