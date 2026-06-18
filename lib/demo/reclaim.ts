import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type ReclaimResult = {
  reclaimed: number;
  errors: string[];
};

/** Delete expired demo sandboxes from Prisma and Clerk. */
export async function reclaimExpiredDemoOrgs(): Promise<ReclaimResult> {
  const now = new Date();
  const expired = await prisma.organization.findMany({
    where: {
      isDemo: true,
      demoExpiresAt: { lt: now },
    },
    select: { id: true, clerkOrgId: true, name: true },
    take: 50,
  });

  const errors: string[] = [];
  let reclaimed = 0;

  for (const org of expired) {
    try {
      if (org.clerkOrgId) {
        try {
          const client = await clerkClient();
          await client.organizations.deleteOrganization(org.clerkOrgId);
        } catch (err) {
          errors.push(`Clerk delete ${org.clerkOrgId}: ${(err as Error).message}`);
        }
      }
      await prisma.organization.delete({ where: { id: org.id } });
      reclaimed += 1;
    } catch (err) {
      errors.push(`Prisma delete ${org.id}: ${(err as Error).message}`);
    }
  }

  return { reclaimed, errors };
}
