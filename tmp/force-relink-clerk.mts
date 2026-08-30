import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_ORG_ID = "cmp41dhse0000dur8uf9gqwyn";
const NEW_CLERK_ORG = "org_3GKYC0lSvbjuVw7dHLhRd5iAswP";
const NEW_CLERK_USER = "user_3GKVxlVreLX6bzL0h3wWPajjujm";
const EMAIL = "dane.elrus1@gmail.com";

async function main() {
  const real = await prisma.organization.findUniqueOrThrow({
    where: { id: REAL_ORG_ID },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      _count: { select: { staff: true, devices: true, rosterWeeks: true } },
    },
  });

  const realUser = await prisma.appUser.findFirstOrThrow({
    where: { organizationId: REAL_ORG_ID, email: EMAIL },
    select: { id: true, email: true, clerkUserId: true, role: true },
  });

  const blockingOrg = await prisma.organization.findFirst({
    where: { clerkOrgId: NEW_CLERK_ORG, NOT: { id: REAL_ORG_ID } },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      _count: { select: { staff: true, devices: true, rosterWeeks: true, users: true } },
    },
  });

  const blockingUser = await prisma.appUser.findFirst({
    where: { clerkUserId: NEW_CLERK_USER, NOT: { id: realUser.id } },
    select: {
      id: true,
      email: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          clerkOrgId: true,
          _count: { select: { staff: true, devices: true, rosterWeeks: true } },
        },
      },
    },
  });

  console.log("PLAN");
  console.log(JSON.stringify({ real, realUser, blockingOrg, blockingUser }, null, 2));

  if (blockingOrg) {
    const c = blockingOrg._count;
    if (c.staff > 0 || c.devices > 0 || c.rosterWeeks > 0) {
      throw new Error(`Refusing to delete blocking org ${blockingOrg.id}: has data`);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (blockingOrg) {
      await tx.organization.delete({ where: { id: blockingOrg.id } });
      console.log("Deleted empty webhook org", blockingOrg.id, blockingOrg.name);
    }

    if (blockingUser) {
      const otherOrgId = blockingUser.organizationId;
      const otherCounts = blockingUser.organization._count;
      await tx.appUser.delete({ where: { id: blockingUser.id } });
      console.log("Deleted duplicate AppUser", blockingUser.id);
      if (otherCounts.staff === 0 && otherCounts.devices === 0 && otherCounts.rosterWeeks === 0) {
        const remaining = await tx.appUser.count({ where: { organizationId: otherOrgId } });
        if (remaining === 0) {
          await tx.organization.delete({ where: { id: otherOrgId } });
          console.log("Deleted empty duplicate org", otherOrgId);
        } else {
          console.log("Left org", otherOrgId, "with", remaining, "other users");
        }
      } else {
        console.log("Left org", otherOrgId, "intact (has data)");
      }
    }

    await tx.organization.update({
      where: { id: REAL_ORG_ID },
      data: { clerkOrgId: NEW_CLERK_ORG },
    });
    await tx.appUser.update({
      where: { id: realUser.id },
      data: { clerkUserId: NEW_CLERK_USER, role: "owner", passwordHash: null },
    });
  });

  const after = await prisma.organization.findUnique({
    where: { id: REAL_ORG_ID },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      _count: { select: { staff: true, devices: true, rosterWeeks: true } },
      users: { where: { email: EMAIL }, select: { email: true, clerkUserId: true, role: true } },
    },
  });
  console.log("APPLIED");
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
