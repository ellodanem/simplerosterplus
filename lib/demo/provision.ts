import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureAppUserFromClerk } from "@/lib/clerk/provision";
import { DEMO_SANDBOX_DAYS, PLAN_PRO } from "@/lib/plans";
import { seedDemoSandbox } from "@/lib/demo/seed-sandbox";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type ProvisionDemoResult = {
  organizationId: string;
  clerkOrgId: string;
  demoExpiresAt: Date;
};

/** Count non-expired demo orgs this Clerk user belongs to. */
export async function countActiveDemoOrgsForUser(clerkUserId: string): Promise<number> {
  const now = new Date();
  return prisma.organization.count({
    where: {
      isDemo: true,
      OR: [{ demoExpiresAt: null }, { demoExpiresAt: { gt: now } }],
      users: { some: { clerkUserId } },
    },
  });
}

/** Create a seeded demo sandbox org for a signed-in Clerk user. */
export async function provisionDemoSandboxForUser(args: {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
}): Promise<ProvisionDemoResult> {
  const activeDemos = await countActiveDemoOrgsForUser(args.clerkUserId);
  if (activeDemos >= 1) {
    throw new Error("You already have an active demo sandbox. Start Free when you're ready for your own site.");
  }

  const client = await clerkClient();
  const demoName = "Demo sandbox";
  const clerkOrg = await client.organizations.createOrganization({
    name: demoName,
    createdBy: args.clerkUserId,
  });

  const demoExpiresAt = addDays(new Date(), DEMO_SANDBOX_DAYS);

  const { organizationId } = await ensureAppUserFromClerk({
    clerkOrgId: clerkOrg.id,
    orgName: demoName,
    clerkUserId: args.clerkUserId,
    email: args.email,
    role: "owner",
    firstName: args.firstName,
    skipFreePlan: true,
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      isDemo: true,
      demoExpiresAt,
      plan: PLAN_PRO,
      subscriptionStatus: "active",
      addonWhatsapp: true,
      timeZone: "America/Toronto",
    },
  });

  await seedDemoSandbox(organizationId);

  return { organizationId, clerkOrgId: clerkOrg.id, demoExpiresAt };
}
