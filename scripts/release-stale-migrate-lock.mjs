/**
 * Terminate idle Postgres sessions still holding Prisma's migrate advisory lock.
 * Safe no-op when nothing is stuck. Uses DIRECT_URL (or derived direct Neon host).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ensureDirectUrl } from "./ensure-direct-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_FILE = join(__dirname, "sql", "release-stale-migrate-advisory-lock.sql");

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean} true if release ran without CLI failure
 */
export function releaseStaleMigrateLock(env) {
  const withDirect = ensureDirectUrl({ ...env });
  const url = withDirect.DIRECT_URL?.trim() || withDirect.DATABASE_URL?.trim();
  if (!url) {
    console.warn("[migrate-deploy] Skipping stale lock release: no database URL.");
    return false;
  }

  const result = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--file", SQL_FILE, "--url", url],
    { stdio: "inherit", shell: true, env: withDirect },
  );

  if ((result.status ?? 1) !== 0) {
    console.warn("[migrate-deploy] Stale lock release failed (continuing to migrate).");
    return false;
  }

  return true;
}
