/**
 * CLI: provision a tenant without SQL. Mirrors the operator console create action.
 *
 * Usage (from repo root):
 *   npm run provision-org
 *
 * Env (required unless noted):
 *   PROVISION_ORG_NAME
 *   PROVISION_ORG_TIMEZONE   — IANA, e.g. America/Toronto
 *   PROVISION_ADMIN_EMAIL
 *   PROVISION_ADMIN_PASSWORD — optional; auto-generated when omitted
 */
import { config } from "dotenv";
import { provisionOrganization } from "../lib/ops/provision-org";
import { prisma } from "../lib/prisma";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const name = process.env.PROVISION_ORG_NAME?.trim();
  const timeZone = process.env.PROVISION_ORG_TIMEZONE?.trim();
  const adminEmail = process.env.PROVISION_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.PROVISION_ADMIN_PASSWORD?.trim();

  if (!name || !timeZone || !adminEmail) {
    console.error(
      "Missing env. Set PROVISION_ORG_NAME, PROVISION_ORG_TIMEZONE, PROVISION_ADMIN_EMAIL.",
    );
    console.error("Optional: PROVISION_ADMIN_PASSWORD (min 8 chars; otherwise auto-generated).");
    process.exit(1);
  }

  const created = await provisionOrganization({
    name,
    timeZone,
    adminEmail,
    adminPassword: adminPassword || undefined,
  });

  const base = process.env.PROVISION_LOGIN_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  console.log("\nOrganization provisioned:\n");
  console.log(`  Org:      ${created.organizationName} (${created.organizationId})`);
  console.log(`  Location: ${created.locationName} (${created.locationId})`);
  console.log(`  Login:    ${base}/login`);
  console.log(`  Email:    ${created.adminEmail}`);
  console.log(
    `  Password: ${created.adminPassword}${
      created.passwordGenerated ? " (auto-generated)" : ""
    }`,
  );
  console.log(`\nFirst sign-in will use /setup until roles, staff, and shift templates exist.\n`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
