#!/usr/bin/env node
/**
 * Static SEO validation for local marketing-page files.
 *
 * Usage:
 *   npm run seo:check
 *   npm run seo:check -- --page employee-leave-and-availability
 */

import path from "node:path";
import { getPageConfig, listPageConfigs } from "./seo/page-configs.mjs";
import { scanRiskyClaims } from "./seo/prohibited-claims.mjs";
import {
  APP_CTA_URLS,
  createReporter,
  extractAnchors,
  extractHeadingLevels,
  extractH1s,
  extractImages,
  extractJsonLdBlocks,
  extractLinkHref,
  extractMetaByName,
  extractMetaByProperty,
  extractRobotsSitemap,
  extractTitle,
  collectSchemaTypes,
  collectSchemaUrls,
  fileExists,
  getAttr,
  isRelativeAppCta,
  parseArgs,
  parseSitemapLocs,
  printReport,
  readText,
  repoPath,
  resolveLandingRoute,
  resolveLocalAsset,
  robotsAllowsPath,
  validateCanonicalShape,
  CANONICAL_ORIGIN,
} from "./seo/shared.mjs";
import { runSiteWideChecks } from "./seo/site-wide.mjs";

function printHelp() {
  console.log(`SEO static check

Usage:
  npm run seo:check
  npm run seo:check:all
  npm run seo:check -- employee-leave-and-availability
  node scripts/seo-check.mjs --page employee-leave-and-availability

Validates local landing-page files before deployment.
Site-wide config/sitemap/metadata uniqueness checks run once per invocation.
seo:check:all runs the same site-wide checks then every configured page.
Note: when using npm run, pass the page key as a positional argument.
npm may strip --page / --url flags as config options.
`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.url) {
    console.error("seo:check validates local files only. Use seo:verify for --url.");
    process.exit(1);
  }

  /** @type {import('./seo/shared.mjs').PageConfig[]} */
  let pages;
  try {
    pages = args.page ? [getPageConfig(args.page)] : listPageConfigs();
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }

  if (!pages.length) {
    console.error("No page configs found in scripts/seo/page-configs.mjs");
    process.exit(1);
  }

  let exitCode = 0;

  // Inexpensive site-wide assertions once per invocation (all configured pages).
  const siteWide = runSiteWideChecks(listPageConfigs());
  printReport(
    "SEO Site-Wide Static Check",
    {
      Scope: "all configured indexable marketing pages",
      Pages: String(listPageConfigs().length),
    },
    siteWide,
    {
      sections: [
        { name: "CONFIG UNIQUENESS", labels: ["Site-wide config", "Duplicate page key", "Duplicate production path", "Duplicate canonical URL", "Duplicate configured canonical", "Configured page URL"] },
        { name: "METADATA UNIQUENESS", labels: ["Cross-page title", "Cross-page meta-description", "Duplicate metadata title", "Duplicate meta description", "Read indexable page"] },
        { name: "SITEMAP CONSISTENCY", labels: ["Sitemap ", "Configured page missing", "Configured page appears", "Sitemap URL"] },
      ],
    },
  );
  if (siteWide.failCount > 0) exitCode = 1;

  for (const page of pages) {
    const reporter = createReporter();
    runStaticPageCheck(page, reporter);
    printReport(
      "SEO Static Check",
      {
        Page: page.key,
        File: page.file,
        URL: page.url,
      },
      reporter,
      {
        sections: [
          { name: "FILE AND ASSETS", labels: ["Configured page file", "Local image", "Local stylesheet", "Local script", "Referenced "] },
          { name: "HTML STRUCTURE", labels: ["Exactly one <title>", "Exactly one H1", "Non-empty H1", "Heading order", "Meta description", "Canonical ", "Open Graph URL", "Indexable"] },
          { name: "PAGE EXPECTATIONS", labels: ["Title matched", "H1 matched", "Canonical matched"] },
          { name: "CALLS TO ACTION", labels: ["Relative app CTA", "Absolute app CTA"] },
          { name: "IMAGES", labels: ["Image ", "WebP "] },
          { name: "STRUCTURED DATA", labels: ["JSON-LD", "Schema type", "Breadcrumb", "Duplicate"] },
          { name: "SITEMAP AND ROBOTS", labels: ["Sitemap ", "robots.txt"] },
          { name: "INTERNAL LINKS", labels: ["Required internal link", "Local page link"] },
          { name: "RISKY CLAIMS", labels: ["Risky phrase"] },
        ],
      },
    );
    if (reporter.failCount > 0) exitCode = 1;
  }

  process.exit(exitCode);
}

/**
 * @param {import('./seo/shared.mjs').PageConfig} page
 * @param {ReturnType<typeof createReporter>} reporter
 */
function runStaticPageCheck(page, reporter) {
  const abs = repoPath(page.file);
  if (!fileExists(abs)) {
    reporter.fail("Configured page file exists", abs);
    return;
  }
  reporter.pass("Configured page file exists");

  const html = readText(abs);

  // --- HTML structure ---
  const titles = extractTitle(html);
  if (titles.length === 1) reporter.pass("Exactly one <title>", titles[0]);
  else reporter.fail("Exactly one <title>", `Found ${titles.length}`);

  const h1s = extractH1s(html);
  if (h1s.length === 1) reporter.pass("Exactly one H1", h1s[0]);
  else reporter.fail("Exactly one H1", `Found ${h1s.length}: ${h1s.join(" | ") || "(none)"}`);

  if (h1s.length === 1 && h1s[0]) reporter.pass("Non-empty H1");
  else if (h1s.length === 1) reporter.fail("Non-empty H1");

  const levels = extractHeadingLevels(html);
  let headingOk = true;
  if (levels[0] !== 1) {
    headingOk = false;
    reporter.warn("Heading order", `First heading is H${levels[0] ?? "(none)"}, expected H1`);
  } else {
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        headingOk = false;
        reporter.warn(
          "Heading order",
          `Skipped from H${levels[i - 1]} to H${levels[i]}`,
        );
        break;
      }
    }
  }
  if (headingOk) reporter.pass("Heading order");

  const descriptions = extractMetaByName(html, "description");
  if (descriptions.length >= 1 && descriptions[0]) {
    reporter.pass("Meta description exists");
  } else {
    reporter.fail("Meta description exists");
  }

  const canonicals = extractLinkHref(html, "canonical");
  if (canonicals.length === 1 && canonicals[0]) {
    const shapeIssues = validateCanonicalShape(canonicals[0]);
    if (shapeIssues.length) {
      for (const issue of shapeIssues) reporter.fail("Canonical shape", issue);
    } else {
      reporter.pass("Canonical exists and uses HTTPS www without trailing slash/index.html");
    }
  } else {
    reporter.fail("Canonical exists", `Found ${canonicals.length}`);
  }

  const ogUrls = extractMetaByProperty(html, "og:url");
  if (canonicals[0] && ogUrls[0] === canonicals[0]) {
    reporter.pass("Open Graph URL matches canonical");
  } else {
    reporter.fail(
      "Open Graph URL matches canonical",
      `og:url=${ogUrls[0] || "(missing)"} canonical=${canonicals[0] || "(missing)"}`,
    );
  }

  const robotsMeta = extractMetaByName(html, "robots").join(",").toLowerCase();
  if (/\bnoindex\b/.test(robotsMeta)) {
    reporter.fail("Indexable pages are not marked noindex", robotsMeta || "(empty)");
  } else {
    reporter.pass("Indexable pages are not marked noindex");
  }

  // --- Page expectations ---
  if (page.title) {
    if (titles[0] === page.title) reporter.pass("Title matched");
    else reporter.fail("Title matched", `expected "${page.title}", got "${titles[0] || ""}"`);
  }
  if (page.h1) {
    if (h1s[0] === page.h1) reporter.pass("H1 matched");
    else reporter.fail("H1 matched", `expected "${page.h1}", got "${h1s[0] || ""}"`);
  }
  if (page.canonical) {
    if (canonicals[0] === page.canonical) reporter.pass("Canonical matched");
    else {
      reporter.fail(
        "Canonical matched",
        `expected "${page.canonical}", got "${canonicals[0] || ""}"`,
      );
    }
  }

  // --- CTAs ---
  const anchors = extractAnchors(html);
  let relativeCtaFail = false;
  for (const a of anchors) {
    if (isRelativeAppCta(a.href)) {
      relativeCtaFail = true;
      reporter.fail("Relative app CTA", a.href);
    }
  }
  if (!relativeCtaFail) reporter.pass("Relative app CTA", "None found");

  const hrefSet = new Set(anchors.map((a) => a.href));
  for (const cta of APP_CTA_URLS) {
    if (hrefSet.has(cta)) reporter.pass("Absolute app CTA present", cta);
    else reporter.warn("Absolute app CTA present", `Missing ${cta}`);
  }

  // --- Images / local assets ---
  const images = extractImages(html);
  let pngCount = 0;
  let webpCount = 0;
  /** @type {string[]} */
  const missingAlts = [];
  /** @type {string[]} */
  const missingDims = [];
  /** @type {string[]} */
  const missingFiles = [];
  let localImageOk = 0;

  for (const img of images) {
    if (!img.src) {
      reporter.fail("Image has src");
      continue;
    }
    if (/\.webp(\?|$)/i.test(img.src)) webpCount += 1;
    if (/\.png(\?|$)/i.test(img.src)) pngCount += 1;

    if (img.alt === null) missingAlts.push(img.src);
    // Empty alt is allowed for decorative images.

    if (!img.width || !img.height) missingDims.push(img.src);

    const candidates = [img.src];
    const srcset = getAttr(img.tag, "srcset");
    if (srcset) {
      for (const part of srcset.split(",")) {
        const candidate = part.trim().split(/\s+/)[0];
        if (candidate) {
          candidates.push(candidate);
          // Prefer-WebP pages often list .webp in <img srcset> as well.
          if (/\.webp(\?|$)/i.test(candidate)) webpCount += 1;
        }
      }
    }
    for (const candidate of candidates) {
      const local = resolveLocalAsset(candidate, abs);
      if (!local) continue;
      if (fileExists(local)) localImageOk += 1;
      else missingFiles.push(path.relative(repoPath(), local));
    }
  }

  // Marketing pages commonly use <picture><source type="image/webp" srcset="…webp">
  // with a PNG <img> fallback. Counting only <img src> produced false WebP WARNs.
  for (const m of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = m[0];
    const type = getAttr(tag, "type") || "";
    if (!/^image\/webp$/i.test(type.trim())) continue;
    webpCount += 1;
    const srcset = getAttr(tag, "srcset") || "";
    const src = getAttr(tag, "src") || "";
    for (const part of `${srcset},${src}`.split(",")) {
      const candidate = part.trim().split(/\s+/)[0];
      if (!candidate) continue;
      const local = resolveLocalAsset(candidate, abs);
      if (!local) continue;
      if (fileExists(local)) localImageOk += 1;
      else missingFiles.push(path.relative(repoPath(), local));
    }
  }

  // Favicons / icons
  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const full = m[0];
    const href = m[1];
    if (!/\brel=["'][^"']*(icon|apple-touch-icon)[^"']*["']/i.test(full)) continue;
    const local = resolveLocalAsset(href, abs);
    if (!local) continue;
    if (fileExists(local)) localImageOk += 1;
    else missingFiles.push(path.relative(repoPath(), local));
  }

  if (!missingAlts.length) {
    reporter.pass("Image alt attributes", `${images.length} image(s); empty alt allowed for decorative`);
  } else {
    reporter.fail("Image alt attributes", missingAlts.join("\n"));
  }
  if (missingDims.length) {
    reporter.warn("Image dimensions missing", missingDims.join("\n"));
  }
  if (missingFiles.length) {
    reporter.fail("Local image exists", [...new Set(missingFiles)].join("\n"));
  } else if (localImageOk) {
    reporter.pass("Local image exists", `${localImageOk} local image/icon file(s)`);
  }
  // WARN only when PNG <img> assets exist with no WebP via <img> or <source type="image/webp">.
  // PNG fallbacks inside <picture> are expected and should not fail this heuristic.
  if (pngCount > 0 && webpCount === 0) {
    reporter.warn("WebP usage", `${pngCount} PNG image(s) and 0 WebP references`);
  } else if (webpCount > 0) {
    reporter.pass("WebP usage", `${webpCount} WebP reference(s)`);
  }

  // CSS / JS local refs
  /** @type {string[]} */
  const missingAssets = [];
  let assetOk = 0;
  for (const m of html.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    const tag = m[0].toLowerCase();
    const isCss = tag.startsWith("<link") && /\brel=["']stylesheet["']/.test(tag);
    const isJs = tag.startsWith("<script") && /\bsrc=/.test(tag);
    if (!isCss && !isJs) continue;
    const href = isCss
      ? (tag.match(/\bhref=["']([^"']+)["']/) || [])[1]
      : (tag.match(/\bsrc=["']([^"']+)["']/) || [])[1];
    if (!href || /^https?:\/\//i.test(href)) continue;
    const local = resolveLocalAsset(href, abs);
    if (!local) continue;
    if (fileExists(local)) assetOk += 1;
    else missingAssets.push(path.relative(repoPath(), local));
  }
  if (missingAssets.length) {
    reporter.fail("Local stylesheet/script exists", missingAssets.join("\n"));
  } else if (assetOk) {
    reporter.pass("Local stylesheet/script exists", `${assetOk} file(s)`);
  }

  // --- Structured data ---
  const blocks = extractJsonLdBlocks(html);
  if (!blocks.length) {
    reporter.fail("JSON-LD blocks present");
  }
  /** @type {string[]} */
  const allTypes = [];
  /** @type {string[]} */
  const allUrls = [];
  for (const [i, block] of blocks.entries()) {
    try {
      const data = JSON.parse(block);
      const types = collectSchemaTypes(data);
      const urls = collectSchemaUrls(data);
      allTypes.push(...types);
      allUrls.push(...urls);
      reporter.pass(`JSON-LD block ${i + 1} parses`, types.join(", ") || "(no @type)");
    } catch (err) {
      reporter.fail(`JSON-LD block ${i + 1} parses`, String(err instanceof Error ? err.message : err));
    }
  }

  for (const type of page.requiredSchemaTypes || []) {
    if (allTypes.includes(type)) reporter.pass("Schema type present", type);
    else reporter.fail("Schema type present", `Missing ${type}`);
  }

  const breadcrumbBad = allUrls.filter((u) => {
    try {
      const parsed = new URL(u);
      return (
        parsed.hostname !== "www.simplerosterplus.com" &&
        parsed.hostname !== "simplerosterplus.com"
      );
    } catch {
      return false;
    }
  });
  // Prefer checking breadcrumb items specifically via type presence + host on collected URLs
  const hostIssues = allUrls.filter((u) => {
    try {
      const parsed = new URL(u);
      return (
        parsed.protocol === "https:" &&
        parsed.hostname !== "www.simplerosterplus.com" &&
        /simplerosterplus\.com$/i.test(parsed.hostname) === false
      );
    } catch {
      return false;
    }
  });
  void breadcrumbBad;
  const nonWww = allUrls.filter((u) => {
    try {
      const parsed = new URL(u);
      return parsed.hostname === "simplerosterplus.com";
    } catch {
      return false;
    }
  });
  if (nonWww.length) {
    reporter.fail("Breadcrumb URLs use canonical host", nonWww.join(", "));
  } else if (allTypes.includes("BreadcrumbList")) {
    reporter.pass("Breadcrumb URLs use canonical host");
  }

  if (hostIssues.length) {
    reporter.warn("Structured data URL host", hostIssues.join(", "));
  }

  if (page.canonical) {
    const entityCanonicals = allUrls.filter((u) => u.replace(/#.*$/, "") === page.canonical);
    // Detect conflicting same-page URLs that differ only by slash/index.html
    const conflicts = allUrls.filter((u) => {
      const bare = u.replace(/#.*$/, "");
      return (
        bare === `${page.canonical}/` ||
        bare === `${page.canonical}/index.html` ||
        bare === page.canonical.replace("https://www.", "https://")
      );
    });
    if (conflicts.length) {
      reporter.fail("Duplicate or conflicting canonical entities", conflicts.join(", "));
    } else if (entityCanonicals.length || !page.canonical) {
      reporter.pass("No conflicting canonical entity URLs detected");
    } else {
      reporter.warn("Canonical URL in structured data", "Expected page URL not found in JSON-LD urls");
    }
  }

  // --- Sitemap ---
  const sitemapPath = repoPath("landing-page", "sitemap.xml");
  if (!fileExists(sitemapPath)) {
    reporter.fail("Sitemap file exists", sitemapPath);
  } else {
    const locs = parseSitemapLocs(readText(sitemapPath));
    const target = page.url || page.canonical;
    const exact = locs.filter((l) => l === target);
    if (exact.length === 1) reporter.pass("Sitemap contains URL once");
    else reporter.fail("Sitemap contains URL once", `Found ${exact.length} exact matches for ${target}`);

    const slashDup = locs.filter((l) => l === `${target}/`);
    const indexDup = locs.filter((l) => l === `${target}/index.html`);
    if (slashDup.length) reporter.fail("Sitemap trailing-slash duplicate", slashDup.join(", "));
    else reporter.pass("Sitemap has no trailing-slash duplicate");
    if (indexDup.length) reporter.fail("Sitemap /index.html duplicate", indexDup.join(", "));
    else reporter.pass("Sitemap has no /index.html duplicate");

    const badHosts = locs.filter((l) => {
      try {
        const u = new URL(l);
        return u.protocol !== "https:" || u.hostname !== "www.simplerosterplus.com";
      } catch {
        return true;
      }
    });
    if (badHosts.length) reporter.fail("Sitemap URLs use HTTPS www", badHosts.join(", "));
    else reporter.pass("Sitemap URLs use HTTPS www");
  }

  // --- robots ---
  const robotsPath = repoPath("landing-page", "robots.txt");
  if (!fileExists(robotsPath)) {
    reporter.fail("robots.txt exists");
  } else {
    const robots = readText(robotsPath);
    const pathname = new URL(page.url).pathname;
    if (robotsAllowsPath(robots, pathname)) {
      reporter.pass("robots.txt allows page");
    } else {
      reporter.fail("robots.txt allows page");
    }
    const declared = extractRobotsSitemap(robots);
    const expected = `${CANONICAL_ORIGIN}/sitemap.xml`;
    if (declared === expected) reporter.pass("robots.txt sitemap declaration");
    else reporter.fail("robots.txt sitemap declaration", `got ${declared || "(missing)"}, expected ${expected}`);
  }

  // --- Internal links ---
  for (const required of page.requiredInternalLinks || []) {
    const found = anchors.some((a) => {
      const href = a.href.split("#")[0].split("?")[0];
      return href === required || href === `${required}/` || a.href.includes(required);
    });
    if (found) reporter.pass("Required internal link present", required);
    else reporter.fail("Required internal link present", required);
  }

  for (const a of anchors) {
    const resolved = resolveLandingRoute(a.href);
    if (resolved.skip) continue;
    if (resolved.missing) {
      reporter.fail("Local page link resolves", a.href);
    } else if (resolved.file && fileExists(resolved.file)) {
      // Quiet pass — avoid flooding. Count via single summary later.
    } else if (resolved.file) {
      reporter.fail("Local page link resolves", a.href);
    }
  }
  const localLinkIssues = anchors
    .map((a) => ({ a, resolved: resolveLandingRoute(a.href) }))
    .filter(({ resolved }) => resolved.missing);
  if (!localLinkIssues.length) {
    reporter.pass("Local page links resolve to landing-page routes");
  }

  // --- Risky claims ---
  const findings = scanRiskyClaims(html, {
    allowedPhrases: page.allowedRiskyPhrases || [],
  });
  const review = findings.filter((f) => f.status === "review");
  const allowed = findings.filter((f) => f.status === "allowed");
  if (!findings.length) {
    reporter.pass("Risky phrase scan", "No risky terms found");
  } else if (!review.length) {
    reporter.pass(
      "Risky phrase scan",
      `${allowed.length} match(es) appear in limitation/negation context`,
    );
  } else {
    reporter.warn(
      "Risky phrases require manual review",
      review.map((f) => `[${f.term}] ${f.excerpt}`).join("\n"),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
