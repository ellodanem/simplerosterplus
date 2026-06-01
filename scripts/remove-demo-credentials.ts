/**
 * Remove or disable seed/demo logins in the connected database.
 * Usage: npx tsx scripts/remove-demo-credentials.ts --confirm
 *
 * Safe to run against production after accidental seed. Requires --confirm.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  DEMO_OPERATOR_EMAIL,
  DEMO_TENANT_EMAIL,
  isProductionDeploy,
} from "../lib/production-hardening";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.error("Pass --confirm to disable/delete demo credentials in the target DATABASE_URL.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const prod = isProductionDeploy();
  console.log(`Target: ${prod ? "production" : "non-production"} deploy flag`);
  console.log("Removing demo tenant users (@demo.local) and disabling demo operator…\n");

  const tenantDeleted = await prisma.appUser.deleteMany({
    where: { email: { endsWith: "@demo.local", mode: "insensitive" } },
  });

  const operator = await prisma.operatorUser.updateMany({
    where: {
      OR: [
        { email: { equals: DEMO_OPERATOR_EMAIL, mode: "insensitive" } },
        { email: { endsWith: "@demo.local", mode: "insensitive" } },
      ],
    },
    data: { disabledAt: new Date() },
  });

  console.log({
    tenantAppUsersDeleted: tenantDeleted.count,
    operatorUsersDisabled: operator.count,
    notedDefaults: { tenant: DEMO_TENANT_EMAIL, operator: DEMO_OPERATOR_EMAIL },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
