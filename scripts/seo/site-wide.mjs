/**
 * Site-wide static SEO assertions (config uniqueness, metadata uniqueness,
 * sitemap ↔ page-config consistency). Pure helpers — no network.
 */

import {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  createReporter,
  extractMetaByName,
  extractTitle,
  fileExists,
  parseSitemapLocs,
  readText,
  repoPath,
} from "./shared.mjs";

/** Paths intentionally noindex and excluded from the marketing sitemap. */
export const SITEMAP_EXCLUDED_PATHS = ["/privacy", "/terms"];

/**
 * Conservative metadata normalization for exact-duplicate detection.
 * @param {string} value
 */
export function normalizeMetadataText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalize a marketing URL for map keys while preserving homepage `/`.
 * @param {string} url
 */
export function normalizeMarketingUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path =
    parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.hostname}${path}`;
}

/**
 * @param {{ key: string, value: string }[]} entries
 * @returns {{ value: string, keys: string[] }[]}
 */
export function findExactDuplicateGroups(entries) {
  /** @type {Map<string, { value: string, keys: string[] }>} */
  const byNorm = new Map();
  for (const entry of entries) {
    const normalized = normalizeMetadataText(entry.value);
    if (!normalized) continue;
    const existing = byNorm.get(normalized);
    if (existing) {
      if (!existing.keys.includes(entry.key)) existing.keys.push(entry.key);
    } else {
      byNorm.set(normalized, { value: entry.value, keys: [entry.key] });
    }
  }
  return [...byNorm.values()].filter((g) => g.keys.length > 1);
}

/**
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {(page: import('./shared.mjs').PageConfig) => string} readHtml
 * @returns {{ key: string, value: string }[]}
 */
export function collectHtmlTitles(pages, readHtml) {
  return pages.map((page) => {
    const titles = extractTitle(readHtml(page));
    return { key: page.key, value: titles[0] || "" };
  });
}

/**
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {(page: import('./shared.mjs').PageConfig) => string} readHtml
 * @returns {{ key: string, value: string }[]}
 */
export function collectHtmlDescriptions(pages, readHtml) {
  return pages.map((page) => {
    const descriptions = extractMetaByName(readHtml(page), "description");
    return { key: page.key, value: descriptions[0] || "" };
  });
}

/**
 * Config-level uniqueness (keys, files, urls, canonicals). No filesystem/network.
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {ReturnType<typeof createReporter>} reporter
 */
export function checkConfigUniqueness(pages, reporter) {
  /** @type {Map<string, string[]>} */
  const byKey = new Map();
  /** @type {Map<string, string[]>} */
  const byFile = new Map();
  /** @type {Map<string, string[]>} */
  const byUrl = new Map();
  /** @type {Map<string, string[]>} */
  const byCanonical = new Map();

  for (const page of pages) {
    pushMap(byKey, page.key, page.key);
    pushMap(byFile, page.file, page.key);
    const urlNorm = normalizeMarketingUrl(page.url || "");
    if (urlNorm) pushMap(byUrl, urlNorm, page.key);
    else reporter.fail("Configured page URL is valid", `${page.key}: ${page.url || "(empty)"}`);
    if (page.canonical) {
      const canNorm = normalizeMarketingUrl(page.canonical);
      if (canNorm) pushMap(byCanonical, canNorm, page.key);
      else {
        reporter.fail(
          "Configured page canonical is valid",
          `${page.key}: ${page.canonical}`,
        );
      }
    }
  }

  const before = reporter.failCount;
  reportDuplicateMap(reporter, byKey, "Duplicate page key");
  reportDuplicateMap(reporter, byFile, "Duplicate production path");
  reportDuplicateMap(reporter, byUrl, "Duplicate canonical URL", (norm) => norm);
  // Canonical field may match url; still fail if two pages share the same canonical.
  reportDuplicateMap(
    reporter,
    byCanonical,
    "Duplicate configured canonical",
    (norm) => norm,
  );

  if (reporter.failCount === before) {
    reporter.pass(
      "Site-wide config uniqueness",
      `${pages.length} page key(s); unique paths, urls, and canonicals`,
    );
  }
}

/**
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {{ key: string, value: string }[]} titles
 * @param {ReturnType<typeof createReporter>} reporter
 */
export function checkTitleUniqueness(pages, titles, reporter) {
  void pages;
  const groups = findExactDuplicateGroups(titles);
  if (!groups.length) {
    reporter.pass("Cross-page title uniqueness", `${titles.length} indexable page(s)`);
    return;
  }
  for (const g of groups) {
    reporter.fail(
      "Duplicate metadata title",
      `${g.keys.join("\n")}\n"${g.value}"`,
    );
  }
}

/**
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {{ key: string, value: string }[]} descriptions
 * @param {ReturnType<typeof createReporter>} reporter
 */
export function checkDescriptionUniqueness(pages, descriptions, reporter) {
  void pages;
  const groups = findExactDuplicateGroups(descriptions);
  if (!groups.length) {
    reporter.pass(
      "Cross-page meta-description uniqueness",
      `${descriptions.length} indexable page(s)`,
    );
    return;
  }
  for (const g of groups) {
    reporter.fail(
      "Duplicate meta description",
      `${g.keys.join("\n")}\n"${g.value}"`,
    );
  }
}

/**
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {string[]} sitemapLocs
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {{ excludedPaths?: string[] }} [opts]
 */
export function checkSitemapConsistency(pages, sitemapLocs, reporter, opts = {}) {
  const excludedPaths = opts.excludedPaths || SITEMAP_EXCLUDED_PATHS;

  /** @type {Map<string, string>} normalized URL -> page key */
  const configByUrl = new Map();
  for (const page of pages) {
    const target = page.url || page.canonical || "";
    const norm = normalizeMarketingUrl(target);
    if (!norm) {
      reporter.fail("Configured page URL for sitemap", `${page.key}: ${target || "(empty)"}`);
      continue;
    }
    if (configByUrl.has(norm)) {
      reporter.fail(
        "Configured page appears multiple times in config URL map",
        `${configByUrl.get(norm)}\n${page.key}\n${norm}`,
      );
    } else {
      configByUrl.set(norm, page.key);
    }
  }

  /** @type {Map<string, number>} */
  const locCounts = new Map();
  /** @type {string[]} */
  const badShape = [];
  /** @type {string[]} */
  const excludedPresent = [];

  for (const loc of sitemapLocs) {
    const norm = normalizeMarketingUrl(loc);
    if (!norm) {
      badShape.push(`${loc} (unparseable)`);
      continue;
    }
    locCounts.set(norm, (locCounts.get(norm) || 0) + 1);

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      badShape.push(loc);
      continue;
    }

    if (parsed.protocol !== "https:" || parsed.hostname !== CANONICAL_HOST) {
      badShape.push(`${loc} (host must be ${CANONICAL_ORIGIN})`);
    }
    if (/\.html?$/i.test(parsed.pathname)) {
      badShape.push(`${loc} (must be extensionless)`);
    }
    const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "") || "/";
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      badShape.push(`${loc} (unintended trailing slash)`);
    }
    if (excludedPaths.includes(path)) {
      excludedPresent.push(loc);
    }
  }

  if (badShape.length) {
    reporter.fail("Sitemap URL shape", [...new Set(badShape)].join("\n"));
  } else {
    reporter.pass(
      "Sitemap URL shape",
      `HTTPS ${CANONICAL_HOST}, extensionless, no trailing-slash variants`,
    );
  }

  if (excludedPresent.length) {
    reporter.fail(
      "Sitemap excludes intentional noindex pages",
      excludedPresent.join("\n"),
    );
  } else {
    reporter.pass(
      "Sitemap excludes intentional noindex pages",
      excludedPaths.join(", "),
    );
  }

  for (const [norm, count] of locCounts) {
    if (count > 1) {
      reporter.fail(
        "Sitemap URL appears multiple times",
        `${norm} (${count} times)`,
      );
    }
  }

  for (const [norm, key] of configByUrl) {
    const count = locCounts.get(norm) || 0;
    if (count === 0) {
      reporter.fail(
        "Configured page missing from sitemap",
        `${key}\n${norm === `${CANONICAL_ORIGIN}` || norm === `${CANONICAL_ORIGIN}/` ? `${CANONICAL_ORIGIN}/` : norm}`,
      );
    } else if (count === 1) {
      // counted in aggregate pass below
    } else {
      reporter.fail(
        "Configured page appears multiple times in sitemap",
        `${key}\n${norm}`,
      );
    }
  }

  for (const [norm, count] of locCounts) {
    if (!configByUrl.has(norm)) {
      reporter.fail(
        "Sitemap URL has no page config",
        `${norm}${count > 1 ? ` (${count} times)` : ""}`,
      );
    }
  }

  const missing = [...configByUrl.keys()].filter((u) => !locCounts.has(u));
  const extras = [...locCounts.keys()].filter((u) => !configByUrl.has(u));
  const multi = [...locCounts.entries()].filter(([, c]) => c > 1);
  if (!missing.length && !extras.length && !multi.length && !badShape.length && !excludedPresent.length) {
    reporter.pass(
      "Sitemap ↔ page-config consistency",
      `${pages.length} configured indexable URL(s) match sitemap exactly once`,
    );
  }
}

/**
 * Run all site-wide static checks against configured indexable pages.
 *
 * @param {import('./shared.mjs').PageConfig[]} pages
 * @param {{
 *   readHtml?: (page: import('./shared.mjs').PageConfig) => string,
 *   sitemapXml?: string,
 *   sitemapPath?: string,
 * }} [options]
 */
export function runSiteWideChecks(pages, options = {}) {
  const reporter = createReporter();

  const readHtml =
    options.readHtml ||
    ((page) => {
      const abs = repoPath(page.file);
      if (!fileExists(abs)) {
        throw new Error(`Missing page file for ${page.key}: ${page.file}`);
      }
      return readText(abs);
    });

  checkConfigUniqueness(pages, reporter);

  let titles;
  let descriptions;
  try {
    titles = collectHtmlTitles(pages, readHtml);
    descriptions = collectHtmlDescriptions(pages, readHtml);
  } catch (err) {
    reporter.fail(
      "Read indexable page HTML for site-wide metadata",
      String(err instanceof Error ? err.message : err),
    );
    return reporter;
  }

  checkTitleUniqueness(pages, titles, reporter);
  checkDescriptionUniqueness(pages, descriptions, reporter);

  let sitemapXml = options.sitemapXml;
  if (sitemapXml == null) {
    const sitemapPath = options.sitemapPath || repoPath("landing-page", "sitemap.xml");
    if (!fileExists(sitemapPath)) {
      reporter.fail("Sitemap file exists for site-wide check", sitemapPath);
      return reporter;
    }
    sitemapXml = readText(sitemapPath);
  }

  const locs = parseSitemapLocs(sitemapXml);
  checkSitemapConsistency(pages, locs, reporter);

  return reporter;
}

/**
 * @param {Map<string, string[]>} map
 * @param {string} key
 * @param {string} pageKey
 */
function pushMap(map, key, pageKey) {
  const list = map.get(key);
  if (list) list.push(pageKey);
  else map.set(key, [pageKey]);
}

/**
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {Map<string, string[]>} map
 * @param {string} label
 * @param {(key: string) => string} [formatKey]
 */
function reportDuplicateMap(reporter, map, label, formatKey = (k) => k) {
  for (const [key, keys] of map) {
    if (keys.length > 1) {
      reporter.fail(label, `${[...new Set(keys)].join("\n")}\n${formatKey(key)}`);
    }
  }
}
