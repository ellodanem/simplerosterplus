import { createClerkClient } from "@clerk/backend";
import type { AppUserRole, PrismaClient } from "@prisma/client";
import { mapClerkRoleToAppUserRole } from "@/lib/clerk/roles";

export type LinkLegacyTenantInput = {
  email: string;
  organizationId?: string;
  clerkOrgId?: string;
  clerkUserId?: string;
  resolveFromClerk?: boolean;
  promoteOwner?: boolean;
  clearPassword?: boolean;
  /** Remove an empty webhook-provisioned org that already holds the Clerk org id. */
  takeoverClerkOrg?: boolean;
};

export type LinkLegacyTenantPlan = {
  organizationId: string;
  organizationName: string;
  appUserId: string;
  email: string;
  currentClerkOrgId: string | null;
  currentClerkUserId: string | null;
  currentRole: AppUserRole;
  clerkOrgId: string;
  clerkUserId: string;
  nextRole: AppUserRole;
  clearPassword: boolean;
  removeOrganization?: {
    id: string;
    name: string;
    staffCount: number;
    deviceCount: number;
    rosterWeekCount: number;
  };
};

export type LinkLegacyTenantResult = LinkLegacyTenantPlan & { applied: boolean };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseArgs(argv: string[]): LinkLegacyTenantInput {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return undefined;
    return argv[idx + 1]?.trim() || undefined;
  };

  const email = get("--email");
  if (!email) {
    throw new Error("Missing --email.");
  }

  return {
    email,
    organizationId: get("--org-id"),
    clerkOrgId: get("--clerk-org-id"),
    clerkUserId: get("--clerk-user-id"),
    resolveFromClerk: argv.includes("--resolve-clerk"),
    promoteOwner: argv.includes("--promote-owner"),
    clearPassword: !argv.includes("--keep-password"),
    takeoverClerkOrg: argv.includes("--takeover-clerk-org"),
  };
}

async function resolveClerkIds(
  email: string,
  clerkOrgIdHint?: string,
): Promise<{ clerkUserId: string; clerkOrgId: string; clerkRole: string | null }> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set.");
  }

  const client = createClerkClient({ secretKey });
  const users = await client.users.getUserList({ emailAddress: [normalizeEmail(email)], limit: 5 });
  if (users.totalCount === 0) {
    throw new Error(
      `No Clerk user found for ${email}. Sign in at /sign-up first, then re-run with --resolve-clerk.`,
    );
  }
  if (users.totalCount > 1) {
    throw new Error(
      `Multiple Clerk users match ${email}. Pass --clerk-user-id explicitly instead of --resolve-clerk.`,
    );
  }

  const clerkUserId = users.data[0]!.id;
  const memberships = await client.users.getOrganizationMembershipList({
    userId: clerkUserId,
    limit: 20,
  });

  if (memberships.totalCount === 0) {
    throw new Error(
      `Clerk user ${clerkUserId} has no organization memberships. Create a Clerk org first.`,
    );
  }

  if (clerkOrgIdHint) {
    const match = memberships.data.find((m) => m.organization.id === clerkOrgIdHint);
    if (!match) {
      throw new Error(
        `Clerk user is not a member of org ${clerkOrgIdHint}. Memberships: ${memberships.data
          .map((m) => `${m.organization.name} (${m.organization.id})`)
          .join(", ")}`,
      );
    }
    return {
      clerkUserId,
      clerkOrgId: match.organization.id,
      clerkRole: match.role,
    };
  }

  if (memberships.totalCount === 1) {
    const only = memberships.data[0]!;
    return {
      clerkUserId,
      clerkOrgId: only.organization.id,
      clerkRole: only.role,
    };
  }

  const options = memberships.data
    .map((m) => `  ${m.organization.id}  ${m.organization.name}  (${m.role})`)
    .join("\n");
  throw new Error(
    `Clerk user belongs to ${memberships.totalCount} organizations. Pass --clerk-org-id:\n${options}`,
  );
}

async function findAppUser(
  prisma: PrismaClient,
  email: string,
  organizationId?: string,
) {
  const normalized = normalizeEmail(email);
  const users = await prisma.appUser.findMany({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      role: true,
      clerkUserId: true,
      passwordHash: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          clerkOrgId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    throw new Error(`No AppUser found for ${normalized}.`);
  }

  if (organizationId) {
    const match = users.find((u) => u.organizationId === organizationId);
    if (!match) {
      throw new Error(`No AppUser for ${normalized} in organization ${organizationId}.`);
    }
    return match;
  }

  if (users.length > 1) {
    const options = users
      .map((u) => `  ${u.organizationId}  ${u.organization.name}`)
      .join("\n");
    throw new Error(
      `Email ${normalized} exists in ${users.length} organizations. Pass --org-id:\n${options}`,
    );
  }

  return users[0]!;
}

async function findBlockingOrg(
  prisma: PrismaClient,
  clerkOrgId: string,
  targetOrganizationId: string,
) {
  return prisma.organization.findFirst({
    where: {
      clerkOrgId,
      NOT: { id: targetOrganizationId },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          staff: true,
          devices: true,
          rosterWeeks: true,
        },
      },
    },
  });
}

async function findBlockingAppUser(
  prisma: PrismaClient,
  clerkUserId: string,
  targetAppUserId: string,
) {
  return prisma.appUser.findFirst({
    where: {
      clerkUserId,
      NOT: { id: targetAppUserId },
    },
    select: { id: true, email: true, organizationId: true },
  });
}

function assertTakeoverSafe(org: {
  id: string;
  name: string;
  _count: { staff: number; devices: number; rosterWeeks: number };
}) {
  const { staff, devices, rosterWeeks } = org._count;
  if (staff > 0 || devices > 0 || rosterWeeks > 0) {
    throw new Error(
      `Refusing takeover of "${org.name}" (${org.id}): staff=${staff}, devices=${devices}, rosterWeeks=${rosterWeeks}. ` +
        "Only empty webhook-provisioned orgs can be removed automatically.",
    );
  }
}

async function assertNoConflicts(
  prisma: PrismaClient,
  input: LinkLegacyTenantInput,
  args: {
    organizationId: string;
    appUserId: string;
    clerkOrgId: string;
    clerkUserId: string;
    currentClerkOrgId: string | null;
    currentClerkUserId: string | null;
  },
): Promise<LinkLegacyTenantPlan["removeOrganization"] | undefined> {
  if (args.currentClerkOrgId && args.currentClerkOrgId !== args.clerkOrgId) {
    throw new Error(
      `Organization already linked to a different Clerk org (${args.currentClerkOrgId}).`,
    );
  }
  if (args.currentClerkUserId && args.currentClerkUserId !== args.clerkUserId) {
    throw new Error(
      `AppUser already linked to a different Clerk user (${args.currentClerkUserId}).`,
    );
  }

  const orgTaken = await findBlockingOrg(prisma, args.clerkOrgId, args.organizationId);
  const userTaken = await findBlockingAppUser(prisma, args.clerkUserId, args.appUserId);

  if ((orgTaken || userTaken) && !input.takeoverClerkOrg) {
    if (orgTaken) {
      throw new Error(
        `Clerk org ${args.clerkOrgId} is already linked to "${orgTaken.name}" (${orgTaken.id}). ` +
          "Re-run with --takeover-clerk-org if that org is an empty webhook duplicate.",
      );
    }
    throw new Error(
      `Clerk user ${args.clerkUserId} is already linked to ${userTaken!.email} (${userTaken!.organizationId}). ` +
        "Re-run with --takeover-clerk-org if that org is an empty webhook duplicate.",
    );
  }

  if (!orgTaken && !userTaken) {
    return undefined;
  }

  const removeOrgId = orgTaken?.id ?? userTaken!.organizationId;
  const removeOrg =
    orgTaken ??
    (await prisma.organization.findUniqueOrThrow({
      where: { id: removeOrgId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            staff: true,
            devices: true,
            rosterWeeks: true,
          },
        },
      },
    }));

  assertTakeoverSafe(removeOrg);

  if (userTaken && userTaken.organizationId !== removeOrg.id) {
    throw new Error(
      `Clerk user ${args.clerkUserId} is linked to ${userTaken.organizationId}, ` +
        `but Clerk org ${args.clerkOrgId} is linked to ${removeOrg.id}. Manual cleanup required.`,
    );
  }

  return {
    id: removeOrg.id,
    name: removeOrg.name,
    staffCount: removeOrg._count.staff,
    deviceCount: removeOrg._count.devices,
    rosterWeekCount: removeOrg._count.rosterWeeks,
  };
}

export async function planLinkLegacyTenant(
  prisma: PrismaClient,
  input: LinkLegacyTenantInput,
): Promise<LinkLegacyTenantPlan> {
  const appUser = await findAppUser(prisma, input.email, input.organizationId);

  let clerkOrgId = input.clerkOrgId?.trim();
  let clerkUserId = input.clerkUserId?.trim();
  let clerkRole: string | null = null;

  if (input.resolveFromClerk) {
    const resolved = await resolveClerkIds(input.email, clerkOrgId);
    clerkOrgId = resolved.clerkOrgId;
    clerkUserId = resolved.clerkUserId;
    clerkRole = resolved.clerkRole;
  }

  if (!clerkOrgId || !clerkUserId) {
    throw new Error(
      "Missing Clerk IDs. Pass --clerk-org-id and --clerk-user-id, or use --resolve-clerk.",
    );
  }

  const removeOrganization = await assertNoConflicts(prisma, input, {
    organizationId: appUser.organizationId,
    appUserId: appUser.id,
    clerkOrgId,
    clerkUserId,
    currentClerkOrgId: appUser.organization.clerkOrgId,
    currentClerkUserId: appUser.clerkUserId,
  });

  const mappedRole = mapClerkRoleToAppUserRole(clerkRole);
  const nextRole: AppUserRole = input.promoteOwner
    ? "owner"
    : appUser.role === "member" && mappedRole !== "member"
      ? mappedRole
      : appUser.role;

  return {
    organizationId: appUser.organizationId,
    organizationName: appUser.organization.name,
    appUserId: appUser.id,
    email: appUser.email,
    currentClerkOrgId: appUser.organization.clerkOrgId,
    currentClerkUserId: appUser.clerkUserId,
    currentRole: appUser.role,
    clerkOrgId,
    clerkUserId,
    nextRole,
    clearPassword: input.clearPassword ?? true,
    removeOrganization,
  };
}

export async function applyLinkLegacyTenant(
  prisma: PrismaClient,
  plan: LinkLegacyTenantPlan,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (plan.removeOrganization) {
      await tx.organization.delete({ where: { id: plan.removeOrganization.id } });
    }
    await tx.organization.update({
      where: { id: plan.organizationId },
      data: { clerkOrgId: plan.clerkOrgId },
    });
    await tx.appUser.update({
      where: { id: plan.appUserId },
      data: {
        clerkUserId: plan.clerkUserId,
        role: plan.nextRole,
        ...(plan.clearPassword ? { passwordHash: null } : {}),
      },
    });
  });
}

export async function linkLegacyTenant(
  prisma: PrismaClient,
  input: LinkLegacyTenantInput,
  confirm: boolean,
): Promise<LinkLegacyTenantResult> {
  const plan = await planLinkLegacyTenant(prisma, input);
  if (confirm) {
    await applyLinkLegacyTenant(prisma, plan);
  }
  return { ...plan, applied: confirm };
}

export function parseLinkLegacyTenantArgs(argv: string[] = process.argv): LinkLegacyTenantInput {
  return parseArgs(argv);
}

export function printLinkLegacyTenantPlan(plan: LinkLegacyTenantPlan, applied: boolean): void {
  console.log("\nLink legacy tenant → Clerk\n");
  console.log(`  Organization:  ${plan.organizationName} (${plan.organizationId})`);
  console.log(`  App user:      ${plan.email} (${plan.appUserId})`);
  console.log(`  Clerk org:     ${plan.clerkOrgId}`);
  console.log(`  Clerk user:    ${plan.clerkUserId}`);
  console.log(`  Role:          ${plan.currentRole} → ${plan.nextRole}`);
  console.log(
    `  Password hash: ${plan.clearPassword ? "clear after link" : "keep (legacy login if Clerk disabled)"}`,
  );
  if (plan.removeOrganization) {
    console.log(
      `  Remove org:    ${plan.removeOrganization.name} (${plan.removeOrganization.id}) — empty webhook duplicate`,
    );
  }
  console.log(`\nMode: ${applied ? "APPLIED" : "DRY RUN (pass --confirm to write)"}\n`);
}
