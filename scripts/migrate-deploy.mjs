/**
 * Run `prisma migrate deploy` on Vercel/CI with retries and a direct Postgres URL.
 *
 * Neon pooler hosts (`-pooler` in the hostname) can stall advisory locks; migrations should
 * use a direct connection. Set DIRECT_URL in Vercel, or this script derives it from
 * DATABASE_URL by removing `-pooler` from the hostname (Neon's documented pattern).
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { ensureDirectUrl } from "./ensure-direct-url.mjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 8000;

if (!process.env.DATABASE_URL?.trim()) {
  console.error("[migrate-deploy] Missing DATABASE_URL.");
  process.exit(1);
}

const migrateEnv = ensureDirectUrl({ ...process.env });
if (
  !process.env.DIRECT_URL?.trim() &&
  process.env.DATABASE_URL.includes("-pooler.")
) {
  console.warn(
    "[migrate-deploy] DIRECT_URL unset; using direct Neon host derived from DATABASE_URL for migrations.",
  );
}

function sleep(ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    // busy-wait — short delays only, keeps the script dependency-free
  }
}

function runMigrate() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: migrateEnv,
  });
  return result.status ?? 1;
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  if (attempt > 1) {
    console.warn(`[migrate-deploy] Retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})…`);
    sleep(RETRY_DELAY_MS);
  } else {
    console.log(`[migrate-deploy] attempt ${attempt}/${MAX_ATTEMPTS}`);
  }

  const code = runMigrate();
  if (code === 0) {
    process.exit(0);
  }

  if (attempt === MAX_ATTEMPTS) {
    console.error(
      "[migrate-deploy] Failed after all attempts. If P1002 persists, check for a stuck advisory lock or concurrent deploys; set DIRECT_URL to Neon's direct host.",
    );
    process.exit(code);
  }
}
