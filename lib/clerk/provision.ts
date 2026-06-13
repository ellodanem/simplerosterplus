import type { AppUserRole } from "@prisma/client";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/clerk/prisma-errors";
import { mapClerkRoleToAppUserRole } from "@/lib/clerk/roles";

const DEFAULT_LOCATION_NAME = "Main";

export type ClerkProvisionInput = {
  clerkOrgId: string;
  orgName: string;
  clerkUserId: string;
  email: string;
  clerkRole?: string | null;
  role?: AppUserRole;
  firstName?: string | null;
};

export type ClerkProvisionResult = {
  organizationId: string;
  appUserId: string;
  created: boolean;
  role: AppUserRole;
};

/** Idempotent: ensure Organization + default Location exist for a Clerk org. */
export async function ensureOrganizationFromClerk(args: {
  clerkOrgId: string;
  orgName: string;
}): Promise<{ organizationId: string; created: boolean }> {
  const name = args.orgName.trim() || "My organization";
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId: args.clerkOrgId },
    select: { id: true },
  });
  if (existing) {
    await prisma.organization.update({
      where: { id: existing.id },
      data: { name },
    });
    return { organizationId: existing.id, created: false };
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name,
        clerkOrgId: args.clerkOrgId,
        timeZone: "UTC",
      },
    });
    await tx.location.create({
      data: {
        organizationId: created.id,
        name: DEFAULT_LOCATION_NAME,
        isDefault: true,
        sortOrder: 0,
      },
    });
    return created;
  }).catch(async (err) => {
    if (!isUniqueConstraintError(err)) throw err;
    const raced = await prisma.organization.findUnique({
      where: { clerkOrgId: args.clerkOrgId },
      select: { id: true },
    });
    if (!raced) throw err;
    await prisma.organization.update({
      where: { id: raced.id },
      data: { name },
    });
    return raced;
  });

  return { organizationId: org.id, created: true };
}

/** Idempotent: link Clerk user to org AppUser row (creates owner on first member). */
export async function ensureAppUserFromClerk(
  input: ClerkProvisionInput,
): Promise<ClerkProvisionResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("A valid email is required to provision an app user.");
  }

  const { organizationId } = await ensureOrganizationFromClerk({
    clerkOrgId: input.clerkOrgId,
    orgName: input.orgName,
  });

  const mappedRole = input.role ?? mapClerkRoleToAppUserRole(input.clerkRole);

  const byClerk = await prisma.appUser.findUnique({
    where: { clerkUserId: input.clerkUserId },
    select: { id: true, organizationId: true },
  });
  if (byClerk) {
    if (byClerk.organizationId !== organizationId) {
      throw new Error(
        `Clerk user ${input.clerkUserId} is already linked to a different organization.`,
      );
    }
    await prisma.appUser.update({
      where: { id: byClerk.id },
      data: { email, role: mappedRole },
    });
    return { organizationId, appUserId: byClerk.id, created: false, role: mappedRole };
  }

  const byEmail = await prisma.appUser.findUnique({
    where: {
      organizationId_email: { organizationId, email },
    },
    select: { id: true },
  });
  if (byEmail) {
    await prisma.appUser.update({
      where: { id: byEmail.id },
      data: { clerkUserId: input.clerkUserId, role: mappedRole },
    });
    return { organizationId, appUserId: byEmail.id, created: false, role: mappedRole };
  }

  const memberCount = await prisma.appUser.count({ where: { organizationId } });
  const role: AppUserRole = memberCount === 0 ? "owner" : mappedRole;

  let created = true;
  const user = await prisma.appUser
    .create({
      data: {
        organizationId,
        email,
        clerkUserId: input.clerkUserId,
        role,
        passwordHash: null,
      },
      select: { id: true },
    })
    .catch(async (err) => {
      if (!isUniqueConstraintError(err)) throw err;
      created = false;
      const raced = await prisma.appUser.findUnique({
        where: { clerkUserId: input.clerkUserId },
        select: { id: true, organizationId: true },
      });
      if (!raced) throw err;
      if (raced.organizationId !== organizationId) {
        throw new Error(
          `Clerk user ${input.clerkUserId} is already linked to a different organization.`,
        );
      }
      return raced;
    });

  if (created) {
    void sendWelcomeEmail({
      email,
      firstName: input.firstName,
      orgName: input.orgName,
      role,
    }).catch((err) => {
      console.error("[welcome] send failed", { email, err });
    });
  }

  return { organizationId, appUserId: user.id, created, role };
}
