/**
 * Load .env then .env.local (override), then run Prisma so DATABASE_URL
 * is found the same way developers often configure Next.js.
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";

config({ path: ".env" });
config({ path: ".env.local", override: true });

if (!process.env.DATABASE_URL?.trim()) {
  console.error(`
Missing DATABASE_URL.

1. In the repo root (next to package.json), create a file named .env
2. Add a line (Neon / Postgres URL), for example:
   DATABASE_URL="postgresql://..."

3. Optional: put overrides in .env.local (loaded after .env).

4. Add AUTH_SECRET= (16+ characters) for login and seed.

Then run this command again.
`);
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/run-prisma.mjs <prisma args…>\nExample: node scripts/run-prisma.mjs migrate dev");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
