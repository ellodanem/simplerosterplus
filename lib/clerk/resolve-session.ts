import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureAppUserFromClerk } from "@/lib/clerk/provision";
import type { SessionPayload } from "@/lib/session";

function primaryEmail(user: {
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
}): string | null {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

/** Resolve Clerk session → SR+ SessionPayload, provisioning Prisma rows if needed. */
export async function resolveClerkSession(): Promise<SessionPayload | null> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const linked = await prisma.appUser.findFirst({
    where: {
      clerkUserId: userId,
      organization: { clerkOrgId: orgId },
    },
    select: {
      id: true,
      email: true,
      organizationId: true,
    },
  });
  if (linked) {
    return {
      sub: linked.id,
      orgId: linked.organizationId,
      email: linked.email,
    };
  }

  const client = await clerkClient();
  const [user, org, memberships] = await Promise.all([
    client.users.getUser(userId),
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      userId: [userId],
      limit: 1,
    }),
  ]);

  const email = primaryEmail(user);
  if (!email) return null;

  const membership = memberships.data[0];
  const { appUserId, organizationId } = await ensureAppUserFromClerk({
    clerkOrgId: orgId,
    orgName: org.name,
    clerkUserId: userId,
    email,
    clerkRole: membership?.role,
  });

  const appUser = await prisma.appUser.findUniqueOrThrow({
    where: { id: appUserId },
    select: { id: true, email: true, organizationId: true },
  });

  if (appUser.organizationId !== organizationId) {
    return null;
  }

  return {
    sub: appUser.id,
    orgId: appUser.organizationId,
    email: appUser.email,
  };
}
