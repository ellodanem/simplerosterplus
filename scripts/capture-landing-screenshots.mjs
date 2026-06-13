/**
 * One-off script: capture landing page solution screenshots from the running app.
 * Usage: node scripts/capture-landing-screenshots.mjs
 */
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(root, "..", "landing page", "images");
const tmpDir = path.resolve(root, "tmp", "landing-screenshots");

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "demo";

const shots = [
  { url: "/", file: "solution-ai-assist.png", waitMs: 800 },
  { url: "/roster", file: "solution-schedule-builder.png", waitMs: 2000 },
  { url: "/attendance?view=week", file: "solution-attendance.png", waitMs: 2000 },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
}

async function main() {
  await mkdir(tmpDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: +2,
  });
  const page = await context.newPage();

  try {
    await login(page);

    for (const { url, file, waitMs } of shots) {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(waitMs);
      const tmpPath = path.join(tmpDir, file);
      await page.screenshot({ path: tmpPath, fullPage: false });
      await copyFile(tmpPath, path.join(outDir, file));
      console.log("Saved", path.join(outDir, file));
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
