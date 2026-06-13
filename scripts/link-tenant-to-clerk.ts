/**
 * Link a legacy password-provisioned tenant to Clerk without losing org data.
 *
 * Usage (dry run — prints plan only):
 *   npm run link-tenant-to-clerk -- --email dane.elrus1@gmail.com --resolve-clerk --promote-owner
 *
 * Apply (writes to DATABASE_URL):
 *   npm run link-tenant-to-clerk -- --email dane.elrus1@gmail.com --resolve-clerk --promote-owner --confirm
 *
 * Explicit Clerk IDs (skip Clerk API lookup):
 *   npm run link-tenant-to-clerk -- --email you@example.com --org-id cuid... --clerk-org-id org_... --clerk-user-id user_... --confirm
 *
 * Flags:
 *   --email            Tenant admin email (required)
 *   --org-id           Prisma Organization id when the email exists in multiple orgs
 *   --clerk-org-id     Clerk organization id (org_...)
 *   --clerk-user-id    Clerk user id (user_...)
 *   --resolve-clerk    Look up Clerk ids by email (requires CLERK_SECRET_KEY)
 *   --promote-owner    Set AppUser.role to owner after linking
 *   --keep-password    Do not null passwordHash (default clears it)
 *   --takeover-clerk-org
 *                      Delete an empty webhook-provisioned org that already holds the Clerk org id
 *   --confirm          Apply changes (required to write)
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  linkLegacyTenant,
  parseLinkLegacyTenantArgs,
  printLinkLegacyTenantPlan,
} from "../lib/clerk/link-legacy-tenant";
import { clerkConfigured } from "../lib/clerk/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  if (!clerkConfigured()) {
    console.error("Clerk is not configured (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY).");
    process.exit(1);
  }

  const input = parseLinkLegacyTenantArgs();
  const confirm = process.argv.includes("--confirm");
  const result = await linkLegacyTenant(prisma, input, confirm);
  printLinkLegacyTenantPlan(result, result.applied);

  if (!confirm) {
    console.log("Re-run with --confirm to apply.\n");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
