/**
 * Run `prisma migrate deploy` on Vercel/CI with retries and a direct Postgres URL.
 *
 * Neon pooler hosts (`-pooler` in the hostname) can stall advisory locks; migrations should
 * use a direct connection. Set DIRECT_URL in Vercel, or this script derives it from
 * DATABASE_URL by removing `-pooler` from the hostname (Neon's documented pattern).
 *
 * Vercel Preview builds skip migrations by default so they do not compete with Production
 * for Prisma's advisory lock when both use the same DATABASE_URL. Set RUN_DB_MIGRATE=1 to override.
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { ensureDirectUrl } from "./ensure-direct-url.mjs";
import { releaseStaleMigrateLock } from "./release-stale-migrate-lock.mjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 12_000;

if (!process.env.DATABASE_URL?.trim()) {
  console.error("[migrate-deploy] Missing DATABASE_URL.");
  process.exit(1);
}

const vercelEnv = process.env.VERCEL_ENV?.trim();
if (vercelEnv === "preview" && process.env.RUN_DB_MIGRATE !== "1") {
  console.log(
    "[migrate-deploy] Skipping on Vercel Preview (shared DATABASE_URL would contend for Prisma's advisory lock). " +
      "Migrations run on Production deploy only. Set RUN_DB_MIGRATE=1 to force, or use a separate preview database.",
  );
  process.exit(0);
}

const migrateEnv = ensureDirectUrl({ ...process.env });
if (
  !process.env.DIRECT_URL?.trim() &&
  process.env.DATABASE_URL.includes("-pooler.")
) {
  console.warn(
    "[migrate-deploy] DIRECT_URL unset; using direct Neon host derived from DATABASE_URL for migrations. " +
      "Set DIRECT_URL explicitly in Vercel (Neon dashboard → Connection string → direct).",
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
    console.warn(
      `[migrate-deploy] Retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})…`,
    );
    sleep(RETRY_DELAY_MS);
  } else {
    console.log(`[migrate-deploy] attempt ${attempt}/${MAX_ATTEMPTS}`);
  }

  releaseStaleMigrateLock(migrateEnv);

  const code = runMigrate();
  if (code === 0) {
    process.exit(0);
  }

  if (attempt === MAX_ATTEMPTS) {
    console.error(
      "[migrate-deploy] Failed after all attempts. P1002 = advisory lock timeout: " +
        "another deploy or a stuck idle session may hold lock 72707369. " +
        "In Neon SQL: SELECT * FROM pg_locks WHERE objid = 72707369; terminate stale idle backends. " +
        "Set DIRECT_URL to Neon's direct host; avoid concurrent migrate deploys.",
    );
    process.exit(code);
  }
}
