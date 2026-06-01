/**
 * Scan tracked source for likely committed secrets (heuristic).
 * Usage: npx tsx scripts/secret-hygiene-scan.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "tmp",
  "out",
  "coverage",
  ".vercel",
]);

const SCAN_ROOTS = ["app", "lib", "scripts", "prisma", "landing-page", "docs"];

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "stripe_live_secret", re: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "stripe_test_secret", re: /sk_test_[A-Za-z0-9]{16,}/ },
  { name: "stripe_webhook", re: /whsec_[A-Za-z0-9]{16,}/ },
  {
    name: "postgres_url_with_password",
    re: /postgresql:\/\/[^:]+:[^@\s"']+@(?!localhost|127\.0\.0\.1)[^\s"']+/i,
  },
  { name: "jwt_like", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./ },
];

const ALLOWLIST_SUBSTRINGS = [
  "sk_test_xxx",
  "sk_live_xxx",
  "whsec_xxx",
  "USER:PASSWORD@localhost",
  "user:pass@ep-xxx",
  "postgresql://USER:PASSWORD@",
  "dev-only-change-me",
  "dev-only-operator-secret",
];

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|mjs|cjs|json|html|md|css|env\.example)$/.test(name)) {
      files.push(rel);
    }
  }
  return files;
}

function isAllowlisted(line: string): boolean {
  return ALLOWLIST_SUBSTRINGS.some((s) => line.includes(s));
}

const hits: { file: string; line: number; pattern: string; excerpt: string }[] = [];

for (const scanRoot of SCAN_ROOTS) {
  const abs = path.join(root, scanRoot);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  for (const file of walk(abs)) {
    if (file === ".env" || file.startsWith(".env.")) continue;
    const content = readFileSync(path.join(root, file), "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isAllowlisted(line)) return;
      for (const { name, re } of PATTERNS) {
        if (re.test(line)) {
          hits.push({
            file,
            line: index + 1,
            pattern: name,
            excerpt: line.trim().slice(0, 120),
          });
        }
      }
    });
  }
}

console.log("\nSecret hygiene scan\n");
if (hits.length === 0) {
  console.log("OK — no suspicious secret patterns in scanned paths.");
  process.exit(0);
}

for (const hit of hits) {
  console.log(`${hit.file}:${hit.line} [${hit.pattern}]`);
  console.log(`  ${hit.excerpt}\n`);
}
console.error(`Found ${hits.length} potential issue(s). Review before production.`);
process.exit(1);
