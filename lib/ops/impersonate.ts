import { prisma } from "@/lib/prisma";

export type ImpersonationTarget = {
  appUserId: string;
  email: string;
  orgId: string;
  orgName: string;
};

/** Pick the earliest AppUser in the org as the impersonation subject (typically the owner). */
export async function resolveImpersonationTarget(
  organizationId: string,
): Promise<ImpersonationTarget | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      users: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, email: true },
      },
    },
  });
  if (!org || org.users.length === 0) return null;
  const user = org.users[0];
  return {
    appUserId: user.id,
    email: user.email,
    orgId: org.id,
    orgName: org.name,
  };
}
