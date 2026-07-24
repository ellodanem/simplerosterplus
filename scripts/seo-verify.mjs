#!/usr/bin/env node
/**
 * Production SEO verification for marketing pages.
 *
 * Usage:
 *   npm run seo:verify -- --page employee-leave-and-availability
 *   npm run seo:verify -- --url https://www.simplerosterplus.com/employee-leave-and-availability
 */

import path from "node:path";
import { chromium } from "playwright";
import { getPageConfig } from "./seo/page-configs.mjs";
import { scanRiskyClaims } from "./seo/prohibited-claims.mjs";
import { runLighthouse } from "./seo/lighthouse.mjs";
import {
  APP_CTA_URLS,
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  VIEWPORTS,
  artifactsDir,
  createReporter,
  ensureDir,
  extractRobotsSitemap,
  fetchRedirectChain,
  isFirstParty,
  isPermanentRedirect,
  looksLikeExtensionNoise,
  normalizeText,
  parseArgs,
  parseSitemapLocs,
  printReport,
  robotsAllowsPath,
} from "./seo/shared.mjs";

function printHelp() {
  console.log(`SEO production verification

Usage:
  npm run seo:verify -- employee-leave-and-availability
  npm run seo:verify -- https://www.simplerosterplus.com/employee-leave-and-availability
  node scripts/seo-verify.mjs --page employee-leave-and-availability
  node scripts/seo-verify.mjs --url https://www.simplerosterplus.com/employee-leave-and-availability

Requires Playwright Chromium:
  npx playwright install chromium

Artifacts are written to artifacts/seo-verification/<page-key>/
Note: when using npm run, pass the page key or URL as a positional argument.
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

  if (!args.page && !args.url) {
    console.error("Provide --page <key> or --url <absolute-url>");
    printHelp();
    process.exit(1);
  }

  /** @type {import('./seo/shared.mjs').PageConfig | null} */
  let config = null;
  /** @type {string} */
  let targetUrl;
  /** @type {string} */
  let pageKey;

  try {
    if (args.page) {
      config = getPageConfig(args.page);
      targetUrl = config.url;
      pageKey = config.key;
    } else {
      targetUrl = args.url;
      const u = new URL(targetUrl);
      pageKey = u.pathname.replace(/^\/|\/$/g, "") || "home";
    }
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }

  const outDir = artifactsDir(pageKey);
  ensureDir(outDir);

  const reporter = createReporter();

  // --- HTTP + redirects ---
  await checkRedirects(targetUrl, reporter);

  // --- Live sitemap / robots ---
  await checkLiveSitemapAndRobots(targetUrl, reporter);

  // --- Browser checks ---
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-extensions", "--no-first-run"],
    });
  } catch (err) {
    console.error(
      "Failed to launch Playwright Chromium.\n" +
        "Install the browser with: npx playwright install chromium\n" +
        String(err instanceof Error ? err.message : err),
    );
    process.exit(1);
  }

  try {
    await checkRenderedDocument(browser, targetUrl, config, reporter, outDir);
    await checkViewports(browser, targetUrl, reporter, outDir);
  } finally {
    await browser.close();
  }

  // --- Lighthouse (separate clean Chromium with remote debugging) ---
  try {
    const lh = await runLighthouse(targetUrl, outDir);
    for (const check of lh.checks) {
      reporter.add(check.status, check.label, check.detail);
    }
    reporter.pass(
      "Lighthouse report saved",
      path.relative(process.cwd(), lh.htmlPath),
    );
  } catch (err) {
    reporter.fail(
      "Lighthouse audit",
      String(err instanceof Error ? err.message : err),
    );
  }

  printReport(
    "SEO Production Verification",
    {
      Page: pageKey,
      URL: targetUrl,
      Artifacts: outDir,
    },
    reporter,
    {
      sections: [
        {
          name: "HTTP AND REDIRECTS",
          labels: [
            "Canonical returned",
            "Apex redirected",
            "Trailing slash redirected",
            "index.html redirected",
          ],
        },
        {
          name: "DOCUMENT",
          labels: [
            "Title matched",
            "Title present",
            "Meta description found",
            "Canonical matched",
            "Canonical present",
            "OG URL matched",
            "OG URL present",
            "Robots meta",
            "Exactly one H1",
            "H1 matched",
            "H1 present",
          ],
        },
        {
          name: "CONTENT AND RESOURCES",
          labels: [
            "Sitemap contains",
            "robots.txt",
            "All images",
            "Image ",
            "Required internal",
            "CTA destination",
            "Internal link response",
            "Risky phrase",
          ],
        },
        {
          name: "RESPONSIVE",
          labels: ["Viewport "],
        },
        {
          name: "RUNTIME",
          labels: [
            "No first-party console",
            "No first-party page",
            "No failed first-party",
            "Third-party",
            "Extension",
          ],
        },
        {
          name: "STRUCTURED DATA",
          labels: ["JSON-LD", "Schema type"],
        },
        {
          name: "LIGHTHOUSE",
          labels: [
            "Performance:",
            "Accessibility:",
            "Best Practices:",
            "Seo:",
            "SEO:",
            "Lighthouse ",
          ],
        },
      ],
    },
  );

  process.exit(reporter.failCount > 0 ? 1 : 0);
}

/**
 * @param {string} canonicalUrl
 * @param {ReturnType<typeof createReporter>} reporter
 */
async function checkRedirects(canonicalUrl, reporter) {
  const canonical = new URL(canonicalUrl);

  const primary = await fetchRedirectChain(canonicalUrl);
  if (primary.loop) {
    reporter.fail("Canonical returned 200", "Redirect loop detected");
  } else if (primary.finalStatus === 200 && primary.hops.length === 1) {
    reporter.pass("Canonical returned 200", `status ${primary.finalStatus}`);
  } else if (primary.finalStatus === 200) {
    reporter.warn(
      "Canonical returned 200",
      `Reached 200 after ${primary.hops.length} hop(s): ${formatHops(primary.hops)}`,
    );
  } else {
    reporter.fail(
      "Canonical returned 200",
      `Final status ${primary.finalStatus}; hops: ${formatHops(primary.hops)}`,
    );
  }

  // Apex → www
  const apexUrl = `https://simplerosterplus.com${canonical.pathname}`;
  await expectRedirectToCanonical(apexUrl, canonicalUrl, "Apex redirected to www", reporter);

  // Trailing slash
  if (!canonical.pathname.endsWith("/")) {
    const slashUrl = `${canonicalUrl}/`;
    await expectRedirectToCanonical(
      slashUrl,
      canonicalUrl,
      "Trailing slash redirected to canonical",
      reporter,
    );
  }

  // /index.html
  const indexUrl = `${canonicalUrl.replace(/\/$/, "")}/index.html`;
  await expectRedirectToCanonical(
    indexUrl,
    canonicalUrl,
    "index.html redirected to canonical",
    reporter,
  );
}

/**
 * @param {string} fromUrl
 * @param {string} expectedFinal
 * @param {string} label
 * @param {ReturnType<typeof createReporter>} reporter
 */
async function expectRedirectToCanonical(fromUrl, expectedFinal, label, reporter) {
  try {
    const chain = await fetchRedirectChain(fromUrl);
    if (chain.loop) {
      reporter.fail(label, `Redirect loop: ${formatHops(chain.hops)}`);
      return;
    }
    const redirectHop = chain.hops.find((h) => h.status >= 300 && h.status < 400);
    const permanentOk = redirectHop ? isPermanentRedirect(redirectHop.status) : false;
    const finalOk =
      normalizeUrl(chain.finalUrl) === normalizeUrl(expectedFinal) &&
      chain.finalStatus === 200;

    if (finalOk && permanentOk) {
      reporter.pass(label, formatHops(chain.hops));
    } else if (finalOk && !permanentOk) {
      reporter.warn(
        label,
        `Reached canonical but redirect was not 301/308: ${formatHops(chain.hops)}`,
      );
    } else {
      reporter.fail(
        label,
        `Expected final ${expectedFinal} with 200; got ${formatHops(chain.hops)}`,
      );
    }
  } catch (err) {
    reporter.fail(label, String(err instanceof Error ? err.message : err));
  }
}

/** @param {{ url: string, status: number, location?: string }[]} hops */
function formatHops(hops) {
  return hops
    .map((h) => `${h.status} ${h.url}${h.location ? ` → ${h.location}` : ""}`)
    .join(" | ");
}

function normalizeUrl(u) {
  const parsed = new URL(u);
  parsed.hash = "";
  let path = parsed.pathname;
  if (path.endsWith("/") && path !== "/") path = path.slice(0, -1);
  return `${parsed.origin}${path}${parsed.search}`;
}

/**
 * @param {string} targetUrl
 * @param {ReturnType<typeof createReporter>} reporter
 */
async function checkLiveSitemapAndRobots(targetUrl, reporter) {
  try {
    const sitemapRes = await fetch(`${CANONICAL_ORIGIN}/sitemap.xml`, {
      redirect: "follow",
    });
    if (!sitemapRes.ok) {
      reporter.fail("Sitemap contains URL once", `HTTP ${sitemapRes.status}`);
    } else {
      const locs = parseSitemapLocs(await sitemapRes.text());
      const exact = locs.filter((l) => l === targetUrl);
      if (exact.length === 1) reporter.pass("Sitemap contains URL once");
      else {
        reporter.fail(
          "Sitemap contains URL once",
          `Found ${exact.length} matches for ${targetUrl}`,
        );
      }
    }
  } catch (err) {
    reporter.fail("Sitemap contains URL once", String(err instanceof Error ? err.message : err));
  }

  try {
    const robotsRes = await fetch(`${CANONICAL_ORIGIN}/robots.txt`, {
      redirect: "follow",
    });
    if (!robotsRes.ok) {
      reporter.fail("robots.txt allows page", `HTTP ${robotsRes.status}`);
      return;
    }
    const robots = await robotsRes.text();
    const pathname = new URL(targetUrl).pathname;
    if (robotsAllowsPath(robots, pathname)) reporter.pass("robots.txt allows page");
    else reporter.fail("robots.txt allows page");

    const declared = extractRobotsSitemap(robots);
    const expected = `${CANONICAL_ORIGIN}/sitemap.xml`;
    if (declared === expected) reporter.pass("robots.txt sitemap declaration");
    else {
      reporter.fail(
        "robots.txt sitemap declaration",
        `got ${declared || "(missing)"}, expected ${expected}`,
      );
    }
  } catch (err) {
    reporter.fail("robots.txt allows page", String(err instanceof Error ? err.message : err));
  }
}

/**
 * @param {import('playwright').Browser} browser
 * @param {string} targetUrl
 * @param {import('./seo/shared.mjs').PageConfig | null} config
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {string} outDir
 */
async function checkRenderedDocument(browser, targetUrl, config, reporter, outDir) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "SRP-SEO-Verify/1.0 (+https://www.simplerosterplus.com; local verification runner)",
  });
  const page = await context.newPage();

  /** @type {string[]} */
  const consoleErrors = [];
  /** @type {string[]} */
  const pageErrors = [];
  /** @type {string[]} */
  const failedRequests = [];
  /** @type {string[]} */
  const ignoredNoise = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (looksLikeExtensionNoise(text)) {
      ignoredNoise.push(text);
      return;
    }
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => {
    const text = String(err);
    if (looksLikeExtensionNoise(text)) {
      ignoredNoise.push(text);
      return;
    }
    pageErrors.push(text);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    const failure = req.failure()?.errorText || "requestfailed";
    if (looksLikeExtensionNoise(url)) {
      ignoredNoise.push(`${url} (${failure})`);
      return;
    }
    failedRequests.push(`${url} (${failure})`);
  });

  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });

  const doc = await page.evaluate(() => {
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const ogUrl =
      document.querySelector('meta[property="og:url"]')?.getAttribute("content") || "";
    const robots =
      document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
    const h1Nodes = [...document.querySelectorAll("h1")];
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    const anchors = [...document.querySelectorAll("a[href]")].map((a) => ({
      href: a.getAttribute("href") || "",
      text: (a.textContent || "").trim(),
    }));
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => s.textContent || "",
    );
    return {
      title: document.title,
      canonical,
      description,
      ogUrl,
      robots,
      h1Count: h1Nodes.length,
      h1,
      anchors,
      jsonLd,
    };
  });

  if (config?.title) {
    if (doc.title === config.title) reporter.pass("Title matched");
    else reporter.fail("Title matched", `expected "${config.title}", got "${doc.title}"`);
  } else if (doc.title) {
    reporter.pass("Title present", doc.title);
  } else {
    reporter.fail("Title present");
  }

  if (doc.description) reporter.pass("Meta description found");
  else reporter.fail("Meta description found");

  if (config?.canonical) {
    if (doc.canonical === config.canonical) reporter.pass("Canonical matched");
    else {
      reporter.fail(
        "Canonical matched",
        `expected "${config.canonical}", got "${doc.canonical}"`,
      );
    }
  } else if (doc.canonical) {
    reporter.pass("Canonical present", doc.canonical);
  } else {
    reporter.fail("Canonical present");
  }

  const expectedCanonical = config?.canonical || targetUrl;
  if (doc.ogUrl === expectedCanonical || doc.ogUrl === doc.canonical) {
    reporter.pass("OG URL matched");
  } else if (!config) {
    if (doc.ogUrl) reporter.pass("OG URL present", doc.ogUrl);
    else reporter.fail("OG URL present");
  } else {
    reporter.fail("OG URL matched", `got "${doc.ogUrl}"`);
  }

  if (/\bnoindex\b/i.test(doc.robots)) {
    reporter.fail("Robots meta does not block indexing", doc.robots);
  } else {
    reporter.pass("Robots meta does not block indexing", doc.robots || "(absent)");
  }

  if (doc.h1Count === 1) reporter.pass("Exactly one H1", doc.h1);
  else reporter.fail("Exactly one H1", `Found ${doc.h1Count}`);

  if (config?.h1) {
    if (normalizeText(doc.h1) === normalizeText(config.h1)) reporter.pass("H1 matched");
    else reporter.fail("H1 matched", `expected "${config.h1}", got "${doc.h1}"`);
  } else if (doc.h1) {
    reporter.pass("H1 present", doc.h1);
  }

  // Required internal links
  for (const required of config?.requiredInternalLinks || []) {
    const found = doc.anchors.some((a) => {
      try {
        const abs = new URL(a.href, targetUrl);
        return abs.pathname.replace(/\/$/, "") === required.replace(/\/$/, "");
      } catch {
        return a.href.includes(required);
      }
    });
    if (found) reporter.pass("Required internal link found", required);
    else reporter.fail("Required internal link found", required);
  }

  // CTA destinations (exact)
  for (const cta of APP_CTA_URLS) {
    const found = doc.anchors.some((a) => {
      try {
        return new URL(a.href, targetUrl).toString() === cta;
      } catch {
        return a.href === cta;
      }
    });
    if (found) reporter.pass("CTA destination exact", cta);
    else reporter.warn("CTA destination exact", `Missing ${cta}`);
  }

  // Spot-check a few internal same-host links (avoid app signup flows)
  const internalToCheck = [];
  for (const a of doc.anchors) {
    try {
      const abs = new URL(a.href, targetUrl);
      if (abs.hostname !== CANONICAL_HOST) continue;
      if (abs.pathname === new URL(targetUrl).pathname) continue;
      if (internalToCheck.length >= 8) break;
      if (!internalToCheck.includes(abs.toString())) internalToCheck.push(abs.toString());
    } catch {
      // ignore
    }
  }
  /** @type {string[]} */
  const badInternal = [];
  let okInternal = 0;
  for (const link of internalToCheck) {
    try {
      const res = await fetch(link, { method: "GET", redirect: "follow" });
      if (res.status >= 200 && res.status < 400) okInternal += 1;
      else badInternal.push(`${res.status} ${link}`);
    } catch (err) {
      badInternal.push(`${link} (${err instanceof Error ? err.message : err})`);
    }
  }
  if (internalToCheck.length) {
    if (!badInternal.length) {
      reporter.pass("Internal link responses", `${okInternal} checked`);
    } else {
      reporter.fail("Internal link responses", badInternal.join("\n"));
    }
  }

  // Images: scroll then inspect
  await autoScroll(page);
  const imageReport = await page.evaluate(() => {
    return [...document.images].map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.getAttribute("alt"),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight,
      loading: img.getAttribute("loading") || "",
    }));
  });

  const broken = imageReport.filter((i) => !i.complete || i.naturalWidth === 0);
  if (!broken.length) reporter.pass("All images loaded", `${imageReport.length} image(s)`);
  else {
    reporter.fail(
      "All images loaded",
      broken.map((b) => b.src).join("\n"),
    );
  }

  for (const img of imageReport) {
    if (img.alt === null) reporter.fail("Image alt text present", img.src);
    if (
      img.naturalWidth > 0 &&
      img.clientWidth > 0 &&
      img.naturalWidth > img.clientWidth * 3
    ) {
      reporter.warn(
        "Image oversized vs display",
        `${img.src} natural ${img.naturalWidth}px displayed ~${img.clientWidth}px`,
      );
    }
  }

  // JSON-LD from rendered DOM
  /** @type {string[]} */
  const types = [];
  for (const [i, block] of doc.jsonLd.entries()) {
    try {
      const data = JSON.parse(block);
      const found = collectTypes(data);
      types.push(...found);
      reporter.pass(`JSON-LD block ${i + 1} parses`, found.join(", ") || "(no @type)");
    } catch (err) {
      reporter.fail(
        `JSON-LD block ${i + 1} parses`,
        String(err instanceof Error ? err.message : err),
      );
    }
  }
  for (const type of config?.requiredSchemaTypes || []) {
    if (types.includes(type)) reporter.pass("Schema type present", type);
    else reporter.fail("Schema type present", `Missing ${type}`);
  }

  // Risky claims on rendered HTML
  const html = await page.content();
  const findings = scanRiskyClaims(html, {
    allowedPhrases: config?.allowedRiskyPhrases || [],
  });
  const review = findings.filter((f) => f.status === "review");
  if (!findings.length) reporter.pass("Risky phrase scan", "No risky terms found");
  else if (!review.length) {
    reporter.pass(
      "Risky phrase scan",
      `${findings.length} match(es) appear in limitation/negation context`,
    );
  } else {
    reporter.warn(
      "Risky phrases require manual review",
      review.map((f) => `[${f.term}] ${f.excerpt}`).join("\n"),
    );
  }

  // Runtime classification
  const origin = new URL(targetUrl).origin;
  const firstPartyConsole = consoleErrors.filter(
    (t) => isFirstParty(t, origin) || !/https?:\/\//.test(t),
  );
  const thirdPartyConsole = consoleErrors.filter(
    (t) => /https?:\/\//.test(t) && !isFirstParty(t, origin),
  );
  const firstPartyFailed = failedRequests.filter((t) => isFirstParty(t, origin));
  const thirdPartyFailed = failedRequests.filter((t) => !isFirstParty(t, origin));

  if (!pageErrors.length) reporter.pass("No first-party page errors");
  else reporter.fail("No first-party page errors", pageErrors.join("\n"));

  if (!firstPartyConsole.length) reporter.pass("No first-party console errors");
  else reporter.fail("No first-party console errors", firstPartyConsole.join("\n"));

  if (!firstPartyFailed.length) reporter.pass("No failed first-party resources");
  else reporter.fail("No failed first-party resources", firstPartyFailed.join("\n"));

  if (thirdPartyConsole.length || thirdPartyFailed.length) {
    reporter.warn(
      "Third-party runtime noise",
      [...thirdPartyConsole, ...thirdPartyFailed].join("\n"),
    );
  }
  if (ignoredNoise.length) {
    reporter.warn("Extension/DevTools noise ignored", ignoredNoise.join("\n"));
  }

  await page.screenshot({
    path: path.join(outDir, "document-1440.png"),
    fullPage: true,
  });

  await context.close();
}

/**
 * @param {import('playwright').Browser} browser
 * @param {string} targetUrl
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {string} outDir
 */
async function checkViewports(browser, targetUrl, reporter, outDir) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });

    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const overflowX = docEl.scrollWidth > docEl.clientWidth + 1;
      const nav = document.querySelector("header, nav, .site-header, .nav");
      const cta = document.querySelector(
        'a.btn-primary, a[href*="sign-up"], .btn-primary',
      );
      const navBox = nav?.getBoundingClientRect();
      const ctaBox = cta?.getBoundingClientRect();
      return {
        overflowX,
        scrollWidth: docEl.scrollWidth,
        clientWidth: docEl.clientWidth,
        navVisible: !!(nav && navBox && navBox.width > 0 && navBox.height > 0),
        ctaVisible: !!(
          cta &&
          ctaBox &&
          ctaBox.width > 0 &&
          ctaBox.height > 0 &&
          ctaBox.bottom > 0 &&
          ctaBox.top < window.innerHeight
        ),
        ctaInDom: !!cta,
      };
    });

    const shot = path.join(outDir, `viewport-${vp.name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    if (metrics.overflowX) {
      reporter.fail(
        `Viewport ${vp.name} no horizontal overflow`,
        `scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
      );
    } else {
      reporter.pass(`Viewport ${vp.name} no horizontal overflow`);
    }

    if (metrics.navVisible) reporter.pass(`Viewport ${vp.name} navigation usable`);
    else reporter.warn(`Viewport ${vp.name} navigation usable`, "Header/nav not clearly visible");

    if (metrics.ctaVisible || metrics.ctaInDom) {
      reporter.pass(
        `Viewport ${vp.name} main CTA accessible`,
        metrics.ctaVisible ? "visible in viewport" : "present in DOM",
      );
    } else {
      reporter.fail(`Viewport ${vp.name} main CTA accessible`);
    }

    await context.close();
  }
}

/** @param {import('playwright').Page} page */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 600;
      const timer = setInterval(() => {
        const { scrollHeight } = document.documentElement;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve(undefined);
        }
      }, 100);
    });
  });
  await page.waitForTimeout(400);
}

/** @param {unknown} data */
function collectTypes(data) {
  /** @type {string[]} */
  const types = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if ("@type" in node) {
      const t = /** @type {{ "@type": unknown }} */ (node)["@type"];
      if (typeof t === "string") types.push(t);
      else if (Array.isArray(t)) {
        for (const item of t) if (typeof item === "string") types.push(item);
      }
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(data);
  return types;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
