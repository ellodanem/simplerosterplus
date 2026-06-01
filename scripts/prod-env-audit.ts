/**
 * Audit required environment variables (values never printed).
 * Usage: npx tsx scripts/prod-env-audit.ts [--development]
 */
import { config } from "dotenv";
import { auditRequiredEnv } from "../lib/production-hardening";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const devMode = process.argv.includes("--development");
const target = devMode ? "development" : "production";

const issues = auditRequiredEnv(target);
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

console.log(`\nProduction env audit (${target}, local .env / .env.local)\n`);

if (issues.length === 0) {
  console.log("OK — required variables present and pass length checks.");
} else {
  for (const issue of issues) {
    const tag = issue.level === "error" ? "ERROR" : "WARN ";
    console.log(`${tag} [${issue.code}] ${issue.message}`);
  }
}

console.log("\nRequired on Vercel Production + Preview:");
console.log("  DATABASE_URL, AUTH_SECRET (16+), OPERATOR_AUTH_SECRET (16+)");
console.log("Optional until Gate 2: Stripe, Clerk (see docs/OPERATOR_CONSOLE.md)\n");

process.exit(errors.length > 0 ? 1 : 0);
