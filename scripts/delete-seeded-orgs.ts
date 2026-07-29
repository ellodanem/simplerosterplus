/**
 * ONE-OFF cleanup: delete specific seeded/test organizations for a clean slate.
 *
 * Deletes each org by exact name. Tenant-scoped child rows (staff, roster,
 * attendance, devices, settings, locations, etc.) cascade via `onDelete: Cascade`
 * on their `organizationId` FKs. Cross-tenant audit rows use `SetNull`, so history
 * is preserved with a null org reference.
 *
 * By default this also deletes the matching Clerk organization (when Clerk is
 * configured and the org has a `clerkOrgId`). Pass --skip-clerk to leave Clerk
 * orgs untouched (Prisma-only cleanup).
 *
 * Usage (dry run — prints plan only, no writes):
 *   npx tsx scripts/delete-seeded-orgs.ts
 *
 * Apply (writes to DATABASE_URL):
 *   npx tsx scripts/delete-seeded-orgs.ts --confirm
 *
 * Flags:
 *   --confirm      Apply deletes (required to write). Without it, dry-run only.
 *   --skip-clerk   Do not delete matching Clerk organizations.
 *
 * NOTE: This is intentionally a throwaway script for a specific cleanup. The
 * durable path is an audited "Delete org" action in the Operator Console —
 * see docs/OPERATOR_CONSOLE.md (§3.1 lifecycle actions).
 */
import { config } from "dotenv";
import { prisma } from "../lib/prisma";
import { clerkConfigured } from "../lib/clerk/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/** Exact org names to remove (the circled seeded/test orgs). */
const ORG_NAMES_TO_DELETE = [
  "Demo Total Auto",
  "Demo sandbox",
  "My New Organization",
  "Field Test Cafe",
  "MVP Test Org",
  "Isolation Audit Org A",
  "Isolation Audit Org B",
] as const;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const confirm = process.argv.includes("--confirm");
  const skipClerk = process.argv.includes("--skip-clerk");
  const clerkAvailable = clerkConfigured();

  const orgs = await prisma.organization.findMany({
    where: { name: { in: [...ORG_NAMES_TO_DELETE] } },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      _count: {
        select: { staff: true, devices: true, rosterWeeks: true, locations: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const foundNames = new Set(orgs.map((o) => o.name));
  const missing = ORG_NAMES_TO_DELETE.filter((n) => !foundNames.has(n));

  console.log(`\n${confirm ? "APPLYING" : "DRY RUN"} — delete seeded orgs\n`);
  console.log(`  DATABASE_URL host: ${maskDbHost(process.env.DATABASE_URL)}`);
  console.log(
    `  Clerk cleanup:     ${
      skipClerk ? "skipped (--skip-clerk)" : clerkAvailable ? "enabled" : "unavailable (Clerk not configured)"
    }\n`,
  );

  if (orgs.length === 0) {
    console.log("  No matching organizations found. Nothing to do.\n");
    return;
  }

  for (const o of orgs) {
    console.log(
      `  • ${o.name} (${o.id})\n` +
        `      staff=${o._count.staff} devices=${o._count.devices} ` +
        `rosterWeeks=${o._count.rosterWeeks} locations=${o._count.locations} ` +
        `clerkOrgId=${o.clerkOrgId ?? "—"}`,
    );
  }
  if (missing.length > 0) {
    console.log(`\n  Not found (skipped): ${missing.join(", ")}`);
  }

  if (!confirm) {
    console.log("\nRe-run with --confirm to apply.\n");
    return;
  }

  console.log("");
  let deleted = 0;
  const errors: string[] = [];

  for (const o of orgs) {
    if (!skipClerk && clerkAvailable && o.clerkOrgId) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        await client.organizations.deleteOrganization(o.clerkOrgId);
        console.log(`  Clerk org deleted: ${o.clerkOrgId} (${o.name})`);
      } catch (err) {
        errors.push(`Clerk delete ${o.clerkOrgId} (${o.name}): ${(err as Error).message}`);
      }
    }

    try {
      await prisma.organization.delete({ where: { id: o.id } });
      deleted += 1;
      console.log(`  Deleted: ${o.name} (${o.id})`);
    } catch (err) {
      errors.push(`Prisma delete ${o.id} (${o.name}): ${(err as Error).message}`);
    }
  }

  console.log(`\nDone. Deleted ${deleted}/${orgs.length} organizations.`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
    process.exitCode = 1;
  }
  console.log("");
}

/** Show only the host of DATABASE_URL so we don't print credentials. */
function maskDbHost(url: string | undefined): string {
  if (!url) return "—";
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
