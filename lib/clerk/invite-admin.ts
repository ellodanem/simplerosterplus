import { clerkClient } from "@clerk/nextjs/server";
import type { PlanLimitViolation } from "@/lib/plans";
import { FREE_ADMINS_MAX, PLAN_PLUS } from "@/lib/plans";
import { checkAdminLimit, countAdmins, getPlanUsage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { getPublicAppUrlFromEnv } from "@/lib/public-url";
import { clerkConfigured } from "@/lib/clerk/config";

export const INVITE_ADMIN_CLERK_ROLE = "org:admin" as const;

export type AdminMemberSummary = {
  id: string;
  email: string;
  role: string;
  isYou: boolean;
};

export type PendingInviteSummary = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
};

export type AdminInviteSnapshot = {
  clerkConfigured: boolean;
  canInvite: boolean;
  cannotInviteReason: string | null;
  members: AdminMemberSummary[];
  pendingInvites: PendingInviteSummary[];
  seats: {
    used: number;
    pending: number;
    reserved: number;
    allowed: number | null;
    remaining: number | null;
  };
  planLimit: PlanLimitViolation | null;
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function loadOrgClerkContext(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      isDemo: true,
    },
  });
}

export async function listPendingOrgInvitations(clerkOrgId: string) {
  const client = await clerkClient();
  const result = await client.organizations.getOrganizationInvitationList({
    organizationId: clerkOrgId,
    status: ["pending"],
    limit: 50,
  });
  return result.data ?? [];
}

/** AppUsers + pending Clerk invites (reserved seats). */
export async function countReservedAdminSeats(
  organizationId: string,
  clerkOrgId: string | null,
): Promise<{ used: number; pending: number; reserved: number }> {
  const used = await countAdmins(organizationId);
  if (!clerkOrgId || !clerkConfigured()) {
    return { used, pending: 0, reserved: used };
  }
  try {
    const pending = (await listPendingOrgInvitations(clerkOrgId)).length;
    return { used, pending, reserved: used + pending };
  } catch (err) {
    console.error("[invite-admin] failed to list pending invitations", err);
    return { used, pending: 0, reserved: used };
  }
}

/**
 * Plan limit for a *new* invite: treat pending invitations as already occupying seats.
 */
export async function checkInviteAdminLimit(
  organizationId: string,
  clerkOrgId: string | null,
): Promise<PlanLimitViolation | null> {
  const base = await checkAdminLimit(organizationId);
  if (base) return base;

  if (!clerkOrgId || !clerkConfigured()) return null;

  const usage = await getPlanUsage(organizationId);
  if (!usage || usage.tier === "demo") return null;

  const { reserved } = await countReservedAdminSeats(organizationId, clerkOrgId);
  if (reserved < usage.limits.adminsAllowed) return null;

  if (usage.tier === "free") {
    return {
      kind: "admin",
      message: `Free plan includes ${FREE_ADMINS_MAX} admin login. Upgrade to Plus for a second admin.`,
      upgradeCta: "Upgrade to Plus",
      upgradePlan: PLAN_PLUS,
    };
  }

  return {
    kind: "admin",
    message: `Your plan includes ${usage.limits.adminsAllowed} admin logins (including pending invites). Add an admin add-on or upgrade in Settings.`,
    upgradeCta: "Manage billing",
  };
}

export async function getAdminInviteSnapshot(args: {
  organizationId: string;
  appUserId: string;
  orgRole: string | null;
}): Promise<AdminInviteSnapshot> {
  const org = await loadOrgClerkContext(args.organizationId);
  const usage = await getPlanUsage(args.organizationId);

  const members = await prisma.appUser.findMany({
    where: { organizationId: args.organizationId },
    select: { id: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const memberSummaries: AdminMemberSummary[] = members.map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role,
    isYou: m.id === args.appUserId,
  }));

  let pendingInvites: PendingInviteSummary[] = [];
  let pending = 0;
  if (org?.clerkOrgId && clerkConfigured()) {
    try {
      const invitations = await listPendingOrgInvitations(org.clerkOrgId);
      pendingInvites = invitations.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress.trim().toLowerCase(),
        role: inv.role ?? INVITE_ADMIN_CLERK_ROLE,
        status: inv.status ?? "pending",
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : null,
      }));
      pending = pendingInvites.length;
    } catch (err) {
      console.error("[invite-admin] list pending failed", err);
    }
  }

  const used = members.length;
  const reserved = used + pending;
  const allowed = usage?.limits.adminsAllowed ?? null;
  const remaining =
    allowed === null || usage?.tier === "demo" ? null : Math.max(0, allowed - reserved);

  const roleOk = args.orgRole === "owner" || args.orgRole === "admin";
  let canInvite = false;
  let cannotInviteReason: string | null = null;

  if (!clerkConfigured()) {
    cannotInviteReason = "Self-serve invites are not configured yet.";
  } else if (!org?.clerkOrgId) {
    cannotInviteReason = "This organization is not linked to Clerk yet. Contact support.";
  } else if (!roleOk) {
    cannotInviteReason = "Only owners and admins can invite other admins.";
  } else if (remaining === 0) {
    cannotInviteReason = "No admin seats left on your plan.";
  } else {
    canInvite = true;
  }

  const planLimit =
    remaining === 0 && usage?.tier !== "demo"
      ? await checkInviteAdminLimit(args.organizationId, org?.clerkOrgId ?? null)
      : null;

  return {
    clerkConfigured: clerkConfigured(),
    canInvite,
    cannotInviteReason,
    members: memberSummaries,
    pendingInvites,
    seats: {
      used,
      pending,
      reserved,
      allowed: usage?.tier === "demo" ? null : allowed,
      remaining,
    },
    planLimit,
  };
}

export type InviteAdminResult =
  | { ok: true; invitation: PendingInviteSummary }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      kind?: string;
      upgradeCta?: string;
      upgradePlan?: string;
    };

export async function inviteAdminToOrganization(args: {
  organizationId: string;
  inviterClerkUserId: string;
  inviterAppUserId: string;
  orgRole: string | null;
  email: string;
}): Promise<InviteAdminResult> {
  if (!clerkConfigured()) {
    return { ok: false, status: 503, error: "Self-serve invites are not configured." };
  }

  const email = normalizeInviteEmail(args.email);
  if (!isEmail(email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  if (args.orgRole !== "owner" && args.orgRole !== "admin") {
    return { ok: false, status: 403, error: "Only owners and admins can invite other admins." };
  }

  const org = await loadOrgClerkContext(args.organizationId);
  if (!org?.clerkOrgId) {
    return {
      ok: false,
      status: 400,
      error: "This organization is not linked to Clerk yet. Contact support.",
    };
  }

  const inviter = await prisma.appUser.findUnique({
    where: { id: args.inviterAppUserId },
    select: { email: true },
  });
  if (inviter && normalizeInviteEmail(inviter.email) === email) {
    return { ok: false, status: 400, error: "You cannot invite yourself." };
  }

  const existingInOrg = await prisma.appUser.findUnique({
    where: {
      organizationId_email: { organizationId: args.organizationId, email },
    },
    select: { id: true },
  });
  if (existingInOrg) {
    return { ok: false, status: 409, error: "That person already has access to this roster." };
  }

  const existingElsewhere = await prisma.appUser.findFirst({
    where: { email, organizationId: { not: args.organizationId } },
    select: { id: true },
  });
  if (existingElsewhere) {
    return {
      ok: false,
      status: 409,
      error:
        "That email already has a Simple Roster Plus account in another organization. Ask them to use a different email, or contact support.",
    };
  }

  const planLimit = await checkInviteAdminLimit(args.organizationId, org.clerkOrgId);
  if (planLimit) {
    return {
      ok: false,
      status: 403,
      error: planLimit.message,
      code: "plan_limit",
      kind: planLimit.kind,
      upgradeCta: planLimit.upgradeCta,
      upgradePlan: planLimit.upgradePlan,
    };
  }

  try {
    const pending = await listPendingOrgInvitations(org.clerkOrgId);
    if (pending.some((inv) => inv.emailAddress.trim().toLowerCase() === email)) {
      return {
        ok: false,
        status: 409,
        error: "An invitation is already pending for that email.",
      };
    }
  } catch (err) {
    console.error("[invite-admin] pre-check pending failed", err);
  }

  const base = getPublicAppUrlFromEnv() || "https://app.simplerosterplus.com";
  const redirectUrl = `${base.replace(/\/$/, "")}/roster`;

  try {
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: org.clerkOrgId,
      emailAddress: email,
      role: INVITE_ADMIN_CLERK_ROLE,
      inviterUserId: args.inviterClerkUserId,
      redirectUrl,
    });

    return {
      ok: true,
      invitation: {
        id: invitation.id,
        email: invitation.emailAddress.trim().toLowerCase(),
        role: invitation.role ?? INVITE_ADMIN_CLERK_ROLE,
        status: invitation.status ?? "pending",
        createdAt: invitation.createdAt
          ? new Date(invitation.createdAt).toISOString()
          : null,
      },
    };
  } catch (err) {
    const message = clerkInviteErrorMessage(err);
    console.error("[invite-admin] create invitation failed", err);
    return { ok: false, status: 502, error: message };
  }
}

export async function revokeAdminInvitation(args: {
  organizationId: string;
  invitationId: string;
  requestingClerkUserId: string;
  orgRole: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!clerkConfigured()) {
    return { ok: false, status: 503, error: "Self-serve invites are not configured." };
  }
  if (args.orgRole !== "owner" && args.orgRole !== "admin") {
    return { ok: false, status: 403, error: "Only owners and admins can revoke invitations." };
  }

  const org = await loadOrgClerkContext(args.organizationId);
  if (!org?.clerkOrgId) {
    return {
      ok: false,
      status: 400,
      error: "This organization is not linked to Clerk yet.",
    };
  }

  try {
    const client = await clerkClient();
    await client.organizations.revokeOrganizationInvitation({
      organizationId: org.clerkOrgId,
      invitationId: args.invitationId,
      requestingUserId: args.requestingClerkUserId,
    });
    return { ok: true };
  } catch (err) {
    console.error("[invite-admin] revoke failed", err);
    return {
      ok: false,
      status: 502,
      error: clerkInviteErrorMessage(err) || "Could not revoke that invitation.",
    };
  }
}

function clerkInviteErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const withErrors = err as {
      errors?: Array<{ longMessage?: string; message?: string }>;
      message?: string;
    };
    const first = withErrors.errors?.[0];
    const detail = first?.longMessage || first?.message || withErrors.message;
    if (detail && typeof detail === "string") return detail;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not send the invitation. Try again.";
}
