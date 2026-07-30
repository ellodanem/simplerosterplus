/**
 * CLI: reset the dedicated recording sandbox org(s) to pre-wizard state.
 *
 * Usage (from repo root):
 *   npm run recording:reset
 *   RECORDING_ORG_ID=clxxx npm run recording:reset
 *
 * After reset, sign in with the Clerk account for that org and run setup → publish.
 * Film Clerk signup once as a separate B-roll cut.
 */
import { config } from "dotenv";
import {
  findRecordingSandboxOrgs,
  resetRecordingSandbox,
} from "../lib/ops/recording-sandbox";
import { prisma } from "../lib/prisma";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const explicitId = process.env.RECORDING_ORG_ID?.trim();

  let targets: Array<{ id: string; name: string }>;
  if (explicitId) {
    const org = await prisma.organization.findUnique({
      where: { id: explicitId },
      select: { id: true, name: true, isRecordingSandbox: true },
    });
    if (!org) {
      console.error(`Organization not found: ${explicitId}`);
      process.exit(1);
    }
    if (!org.isRecordingSandbox) {
      console.error(
        `Organization ${org.name} (${org.id}) is not flagged isRecordingSandbox.\n` +
          `Mark it in Ops (Org 360 → Use for recording) first.`,
      );
      process.exit(1);
    }
    targets = [{ id: org.id, name: org.name }];
  } else {
    targets = await findRecordingSandboxOrgs();
    if (targets.length === 0) {
      console.error(
        "No recording sandbox org found.\n" +
          "1. Sign up once with a dedicated Clerk account and create an org\n" +
          "2. In Ops → Org 360 → enable “Use for recording”\n" +
          "3. Re-run: npm run recording:reset",
      );
      process.exit(1);
    }
  }

  for (const org of targets) {
    process.stdout.write(`Resetting ${org.name} (${org.id})… `);
    await resetRecordingSandbox(org.id);
    console.log("ok");
  }

  console.log(
    "\nReady for the next take: sign in → /setup → build roster → publish.\n" +
      "(Clerk signup is a one-time B-roll cut — do not re-create the account.)\n",
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
