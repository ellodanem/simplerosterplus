/**
 * Lighthouse runner using Playwright Chromium (clean browser, no extensions).
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import {
  LIGHTHOUSE_THRESHOLDS,
  ensureDir,
} from "./shared.mjs";

/**
 * @param {string} url
 * @param {string} outDir
 * @returns {Promise<{
 *   scores: Record<string, number | null>,
 *   htmlPath: string,
 *   jsonPath: string,
 *   checks: { status: "PASS" | "WARN" | "FAIL", label: string, detail?: string }[],
 * }>}
 */
export async function runLighthouse(url, outDir) {
  ensureDir(outDir);

  // Pick a free-ish debugging port in an ephemeral range.
  const port = 9222 + Math.floor(Math.random() * 1000);

  const browser = await chromium.launch({
    headless: true,
    args: [
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
    ],
  });

  try {
    // Wait briefly for the debugging endpoint to come up.
    await waitForDebugPort(port, 10000);

    const result = await lighthouse(url, {
      port,
      output: ["json", "html"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        disabled: false,
      },
      // Disable storage reset warnings; clean Chromium profile already.
      disableStorageReset: false,
    });

    if (!result?.lhr) {
      throw new Error("Lighthouse returned no results");
    }

    const htmlReport = Array.isArray(result.report)
      ? result.report.find((r) => typeof r === "string" && r.includes("<!DOCTYPE html>")) ||
        result.report[1]
      : result.report;
    const jsonReport = JSON.stringify(result.lhr, null, 2);

    const htmlPath = path.join(outDir, "lighthouse.html");
    const jsonPath = path.join(outDir, "lighthouse.json");
    fs.writeFileSync(htmlPath, String(htmlReport ?? ""), "utf8");
    fs.writeFileSync(jsonPath, jsonReport, "utf8");

    /** @type {Record<string, number | null>} */
    const scores = {};
    /** @type {{ status: "PASS" | "WARN" | "FAIL", label: string, detail?: string }[]} */
    const checks = [];

    for (const [id, rule] of Object.entries(LIGHTHOUSE_THRESHOLDS)) {
      const cat = result.lhr.categories[id];
      const score =
        cat && typeof cat.score === "number" ? Math.round(cat.score * 100) : null;
      scores[id] = score;
      const labelName = id === "best-practices" ? "Best Practices" : capitalize(id);

      if (score == null) {
        checks.push({
          status: rule.fail ? "FAIL" : "WARN",
          label: `${labelName}: (missing)`,
        });
        continue;
      }

      if (score >= rule.min) {
        checks.push({ status: "PASS", label: `${labelName}: ${score}` });
      } else if (rule.fail) {
        checks.push({
          status: "FAIL",
          label: `${labelName}: ${score}`,
          detail: `Required minimum ${rule.min}`,
        });
      } else {
        checks.push({
          status: "WARN",
          label: `${labelName}: ${score}`,
          detail: `Warning threshold ${rule.min} (does not fail the command)`,
        });
      }
    }

    return { scores, htmlPath, jsonPath, checks };
  } finally {
    await browser.close();
  }
}

/**
 * @param {number} port
 * @param {number} timeoutMs
 */
async function waitForDebugPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(
    `Chromium remote debugging port ${port} did not become ready. ` +
      `Ensure Chromium is installed: npx playwright install chromium`,
  );
}

function capitalize(s) {
  if (s === "seo") return "SEO";
  if (s === "best-practices") return "Best Practices";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
