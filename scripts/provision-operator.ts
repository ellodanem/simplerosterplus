/**
 * CLI: create or reset an operator console user without running the full seed.
 *
 * Usage (from repo root):
 *   npm run provision-operator
 *
 * Env (required):
 *   PROVISION_OPERATOR_EMAIL
 *   PROVISION_OPERATOR_PASSWORD
 *
 * Optional:
 *   PROVISION_OPERATOR_ROLE — readonly | support | billing | superadmin (default: superadmin)
 */
import { config } from "dotenv";
import type { OperatorRole } from "@prisma/client";
import { provisionOperator } from "../lib/ops/provision-operator";
import { prisma } from "../lib/prisma";
import { isProductionDeploy } from "../lib/production-hardening";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const email = process.env.PROVISION_OPERATOR_EMAIL?.trim();
  const password = process.env.PROVISION_OPERATOR_PASSWORD ?? "";
  const role = (process.env.PROVISION_OPERATOR_ROLE?.trim() ?? "superadmin") as OperatorRole;

  if (!email || !password) {
    console.error("Missing env. Set PROVISION_OPERATOR_EMAIL and PROVISION_OPERATOR_PASSWORD.");
    console.error("Optional: PROVISION_OPERATOR_ROLE (default: superadmin).");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const result = await provisionOperator({ email, password, role });

  const base = process.env.PROVISION_LOGIN_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const action = result.created ? "created" : "updated (password reset)";

  console.log(`\nOperator ${action}:\n`);
  console.log(`  ID:    ${result.operatorUserId}`);
  console.log(`  Email: ${result.email}`);
  console.log(`  Role:  ${result.role}`);
  console.log(`  Login: ${base}/ops/login`);
  if (isProductionDeploy()) {
    console.log("\n  Production target — demo credentials remain blocked at the API.");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
