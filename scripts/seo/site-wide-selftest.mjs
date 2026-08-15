#!/usr/bin/env node
/**
 * Deterministic regression checks for site-wide SEO helpers.
 * Mutates in-memory fixtures only — does not touch landing-page files.
 *
 * Usage:
 *   node scripts/seo/site-wide-selftest.mjs
 */

import { listPageConfigs } from "./page-configs.mjs";
import { createReporter, parseSitemapLocs, readText, repoPath } from "./shared.mjs";
import {
  checkConfigUniqueness,
  checkDescriptionUniqueness,
  checkSitemapConsistency,
  checkTitleUniqueness,
  collectHtmlDescriptions,
  collectHtmlTitles,
  findExactDuplicateGroups,
  normalizeMetadataText,
  runSiteWideChecks,
} from "./site-wide.mjs";

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const cases = [];

function assert(name, condition, detail = "") {
  cases.push({ name, ok: Boolean(condition), detail });
}

function clonePages() {
  return listPageConfigs().map((p) => ({ ...p, requiredInternalLinks: [...(p.requiredInternalLinks || [])] }));
}

function realHtmlMap() {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const page of listPageConfigs()) {
    map.set(page.key, readText(repoPath(page.file)));
  }
  return map;
}

function readFromMap(map) {
  return (page) => {
    const html = map.get(page.key);
    if (html == null) throw new Error(`No fixture HTML for ${page.key}`);
    return html;
  };
}

const realSitemap = readText(repoPath("landing-page", "sitemap.xml"));
const pages = clonePages();
const htmlMap = realHtmlMap();

// --- Baseline: real project data must pass ---
{
  const reporter = runSiteWideChecks(pages, {
    readHtml: readFromMap(htmlMap),
    sitemapXml: realSitemap,
  });
  assert(
    "real site-wide checks pass",
    reporter.failCount === 0,
    `${reporter.failCount} fail(s)`,
  );
}

// --- Normalization ---
assert(
  "normalize collapses whitespace and case",
  normalizeMetadataText("  Foo   BAR ") === "foo bar",
);

// --- Duplicate title ---
{
  const titles = collectHtmlTitles(pages, readFromMap(htmlMap));
  const donor = titles.find((t) => t.key !== "homepage");
  const titlesDup = titles.map((t) =>
    t.key === "homepage" ? { ...t, value: donor.value } : t,
  );
  const reporter = createReporter();
  checkTitleUniqueness(pages, titlesDup, reporter);
  const fail = reporter.results.find((r) => r.status === "FAIL" && r.label === "Duplicate metadata title");
  assert(
    "duplicate title FAILS",
    Boolean(fail && fail.detail?.includes("homepage") && fail.detail?.includes(donor.key)),
    fail?.detail || "no FAIL",
  );
  assert(
    "findExactDuplicateGroups detects title pair",
    findExactDuplicateGroups(titlesDup).some((g) => g.keys.includes("homepage")),
  );
}

// --- Duplicate description ---
{
  const descriptions = collectHtmlDescriptions(pages, readFromMap(htmlMap));
  const donor = descriptions.find((d) => d.key !== "homepage");
  const descDup = descriptions.map((d) =>
    d.key === "homepage" ? { ...d, value: donor.value } : d,
  );
  const reporter = createReporter();
  checkDescriptionUniqueness(pages, descDup, reporter);
  const fail = reporter.results.find((r) => r.status === "FAIL" && r.label === "Duplicate meta description");
  assert(
    "duplicate description FAILS",
    Boolean(fail && fail.detail?.includes("homepage") && fail.detail?.includes(donor.key)),
    fail?.detail || "no FAIL",
  );
}

// --- Missing sitemap URL ---
{
  const locs = parseSitemapLocs(realSitemap).filter(
    (l) => !l.includes("employee-time-clock-app"),
  );
  const reporter = createReporter();
  checkSitemapConsistency(pages, locs, reporter);
  const fail = reporter.results.find(
    (r) => r.status === "FAIL" && r.label === "Configured page missing from sitemap",
  );
  assert(
    "missing sitemap URL FAILS",
    Boolean(fail && fail.detail?.includes("employee-time-clock-app")),
    fail?.detail || "no FAIL",
  );
}

// --- Extra managed sitemap URL without config ---
{
  const locs = [
    ...parseSitemapLocs(realSitemap),
    "https://www.simplerosterplus.com/not-a-configured-page",
  ];
  const reporter = createReporter();
  checkSitemapConsistency(pages, locs, reporter);
  const fail = reporter.results.find(
    (r) => r.status === "FAIL" && r.label === "Sitemap URL has no page config",
  );
  assert(
    "extra sitemap URL without config FAILS",
    Boolean(fail && fail.detail?.includes("not-a-configured-page")),
    fail?.detail || "no FAIL",
  );
}

// --- Duplicate canonical / config URL ---
{
  const bad = clonePages();
  const scheduling = bad.find((p) => p.key === "employee-scheduling-software");
  const attendance = bad.find((p) => p.key === "employee-attendance-software");
  attendance.url = scheduling.url;
  attendance.canonical = scheduling.canonical;
  const reporter = createReporter();
  checkConfigUniqueness(bad, reporter);
  const failUrl = reporter.results.find(
    (r) => r.status === "FAIL" && r.label === "Duplicate canonical URL",
  );
  const failCan = reporter.results.find(
    (r) => r.status === "FAIL" && r.label === "Duplicate configured canonical",
  );
  assert(
    "duplicate config URL FAILS",
    Boolean(failUrl && failUrl.detail?.includes("employee-scheduling-software")),
    failUrl?.detail || "no FAIL",
  );
  assert(
    "duplicate config canonical FAILS",
    Boolean(failCan),
    failCan?.detail || "no FAIL",
  );
}

// --- Duplicate production path ---
{
  const bad = clonePages();
  const a = bad.find((p) => p.key === "employee-scheduling-software");
  const b = bad.find((p) => p.key === "employee-attendance-software");
  b.file = a.file;
  const reporter = createReporter();
  checkConfigUniqueness(bad, reporter);
  const fail = reporter.results.find(
    (r) => r.status === "FAIL" && r.label === "Duplicate production path",
  );
  assert("duplicate production path FAILS", Boolean(fail), fail?.detail || "no FAIL");
}

const failed = cases.filter((c) => !c.ok);
console.log("Site-wide SEO selftest");
for (const c of cases) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? `\n       ${c.detail}` : ""}`);
}
console.log("");
console.log(`Summary: ${cases.length - failed.length} pass, ${failed.length} fail`);
process.exit(failed.length ? 1 : 0);
