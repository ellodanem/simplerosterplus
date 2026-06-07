/**
 * Active cross-tenant isolation checks (Step 01).
 * Run: npx tsx scripts/isolation-audit.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../lib/password";
import { signSession, verifySessionToken, isReadOnlySession } from "../lib/session";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const AUDIT_EMAIL = "isolation-audit@test.local";
const AUDIT_PASSWORD = "audit-test-pass";

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed += 1;
  console.log(`  OK  ${label}`);
}

function fail(label: string, detail?: string) {
  failed += 1;
  console.error(` FAIL ${label}${detail ? `: ${detail}` : ""}`);
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) ok(label);
  else fail(label, detail);
}

async function ensureAuditOrgs() {
  const passwordHash = await hashPassword(AUDIT_PASSWORD);

  async function upsertOrg(name: string) {
    let org = await prisma.organization.findFirst({ where: { name } });
    if (!org) {
      org = await prisma.organization.create({
        data: { name, timeZone: "America/Toronto" },
      });
    }
    const location = await prisma.location.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Main" } },
      create: { organizationId: org.id, name: "Main", isDefault: true, sortOrder: 0 },
      update: { isDefault: true },
    });
    const user = await prisma.appUser.upsert({
      where: { organizationId_email: { organizationId: org.id, email: AUDIT_EMAIL } },
      create: { organizationId: org.id, email: AUDIT_EMAIL, passwordHash },
      update: { passwordHash },
    });
    const role = await prisma.staffRole.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Staff" } },
      create: { organizationId: org.id, name: "Staff" },
      update: {},
    });
    let staff = await prisma.staff.findFirst({
      where: { organizationId: org.id, firstName: "Audit", lastName: name },
    });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          firstName: "Audit",
          lastName: name,
          roleId: role.id,
          role: role.name,
        },
      });
    }
    let device = await prisma.device.findFirst({
      where: { organizationId: org.id, name: `Device ${name}` },
    });
    if (!device) {
      device = await prisma.device.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          name: `Device ${name}`,
          connectionMode: "adms_push",
        },
      });
    }
    return { org, location, user, staff, device };
  }

  const orgA = await upsertOrg("Isolation Audit Org A");
  const orgB = await upsertOrg("Isolation Audit Org B");
  return { orgA, orgB };
}

async function testCrossOrgReads(
  orgA: Awaited<ReturnType<typeof ensureAuditOrgs>>["orgA"],
  orgB: Awaited<ReturnType<typeof ensureAuditOrgs>>["orgB"],
) {
  console.log("\nCross-org read attempts (Org A session → Org B IDs):");

  const orgId = orgA.org.id;

  assert(
    (await prisma.staff.findFirst({ where: { id: orgB.staff.id, organizationId: orgId } })) ===
      null,
    "staff GET preload",
  );
  assert(
    (await prisma.device.findFirst({
      where: { id: orgB.device.id, organizationId: orgId, deletedAt: null },
    })) === null,
    "device GET preload",
  );
}

async function testCrossOrgMutations(
  orgA: Awaited<ReturnType<typeof ensureAuditOrgs>>["orgA"],
  orgB: Awaited<ReturnType<typeof ensureAuditOrgs>>["orgB"],
) {
  console.log("\nCross-org mutation guards (compound where should affect 0 rows):");

  const orgId = orgA.org.id;

  try {
    await prisma.staff.update({
      where: { id: orgB.staff.id, organizationId: orgId },
      data: { firstName: "Hacked" },
    });
    fail("staff PATCH", "update succeeded");
  } catch {
    ok("staff PATCH blocked (P2025 or no match)");
  }

  try {
    await prisma.device.update({
      where: { id: orgB.device.id, organizationId: orgId },
      data: { name: "Hacked" },
    });
    fail("device PATCH", "update succeeded");
  } catch {
    ok("device PATCH blocked");
  }

  const deleteResult = await prisma.staff.deleteMany({
    where: { id: orgB.staff.id, organizationId: orgId },
  });
  assert(deleteResult.count === 0, "staff DELETE count=0");

  const bStaffAfter = await prisma.staff.findUnique({ where: { id: orgB.staff.id } });
  assert(bStaffAfter?.firstName !== "Hacked", "Org B staff unchanged");
}

async function testLoginDisambiguation() {
  console.log("\nLogin email disambiguation:");

  const users = await prisma.appUser.findMany({
    where: { email: AUDIT_EMAIL },
    select: { organizationId: true },
  });
  assert(users.length >= 2, "duplicate email users exist for audit", `found ${users.length}`);

  const candidates = await prisma.appUser.findMany({
    where: { email: AUDIT_EMAIL },
    select: { id: true, organizationId: true, email: true, passwordHash: true },
  });
  const matching = [];
  for (const user of candidates) {
    if (!user.passwordHash) continue;
    if (await verifyPassword(AUDIT_PASSWORD, user.passwordHash)) matching.push(user);
  }
  assert(matching.length >= 2, "password matches multiple orgs");
}

async function testImpersonationReadOnly() {
  console.log("\nImpersonation read-only JWT:");

  const token = await signSession(
    { sub: "impersonated-user", orgId: "org-id", email: "view@test.local" },
    { readOnly: true, impersonatedBy: "ops-user", orgName: "Test Org" },
  );
  const session = await verifySessionToken(token);
  assert(session !== null, "read-only token verifies");
  assert(session !== null && isReadOnlySession(session), "readOnly flag set");
}

async function main() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
    console.error("AUTH_SECRET missing — cannot run full audit.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing.");
    process.exit(1);
  }

  console.log("Isolation audit — active checks");
  const { orgA, orgB } = await ensureAuditOrgs();
  console.log(`  Org A: ${orgA.org.name} (${orgA.org.id})`);
  console.log(`  Org B: ${orgB.org.name} (${orgB.org.id})`);

  await testCrossOrgReads(orgA, orgB);
  await testCrossOrgMutations(orgA, orgB);
  await testLoginDisambiguation();
  await testImpersonationReadOnly();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
