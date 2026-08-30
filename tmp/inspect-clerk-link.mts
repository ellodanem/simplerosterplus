import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const orgId = "cmp41dhse0000dur8uf9gqwyn";
const newClerkOrg = "org_3GKYC0lSvbjuVw7dHLhRd5iAswP";
const org = await prisma.organization.findUnique({
  where: { id: orgId },
  select: { id: true, name: true, clerkOrgId: true, isDemo: true, timeZone: true, _count: { select: { staff: true, devices: true, rosterWeeks: true, users: true } } },
});
const users = await prisma.appUser.findMany({
  where: { organizationId: orgId },
  select: { id: true, email: true, clerkUserId: true, role: true },
});
const emptyWebhookOrg = await prisma.organization.findUnique({
  where: { clerkOrgId: newClerkOrg },
  select: { id: true, name: true, clerkOrgId: true, isDemo: true, timeZone: true, _count: { select: { staff: true, devices: true, rosterWeeks: true } } },
});
const appUsersForEmail = await prisma.appUser.findMany({
  where: { email: "dane.elrus1@gmail.com" },
  select: { id: true, email: true, clerkUserId: true, role: true, organizationId: true, organization: { select: { name: true, clerkOrgId: true } } },
});
console.log(JSON.stringify({ org, users, emptyWebhookOrg, appUsersForEmail }, null, 2));
await prisma.$disconnect();
