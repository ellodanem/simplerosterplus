/**
 * Shared helpers for SEO static check and production verify runners.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CANONICAL_HOST = "www.simplerosterplus.com";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
export const APP_ORIGIN = "https://app.simplerosterplus.com";

export const APP_CTA_URLS = [
  `${APP_ORIGIN}/sign-up`,
  `${APP_ORIGIN}/sign-up?intent=demo`,
  `${APP_ORIGIN}/login`,
];

export const RELATIVE_APP_ROUTES = ["/sign-up", "/login"];

export const VIEWPORTS = [
  { width: 375, height: 812, name: "375" },
  { width: 768, height: 1024, name: "768" },
  { width: 1024, height: 768, name: "1024" },
  { width: 1440, height: 900, name: "1440" },
];

export const LIGHTHOUSE_THRESHOLDS = {
  seo: { min: 100, fail: true },
  accessibility: { min: 90, fail: true },
  "best-practices": { min: 90, fail: true },
  performance: { min: 75, fail: false },
};

export const MANUAL_REMAINING = [
  "Verify application feature behavior",
  "Review page copy and screenshots",
  "Test live URL in Google Search Console",
  "Request indexing",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * @typedef {{
 *   key: string,
 *   file: string,
 *   url: string,
 *   title?: string,
 *   h1?: string,
 *   canonical?: string,
 *   requiredSchemaTypes?: string[],
 *   requiredInternalLinks?: string[],
 *   allowedRiskyPhrases?: string[],
 * }} PageConfig
 */

/**
 * @typedef {"PASS" | "WARN" | "FAIL"} CheckStatus
 * @typedef {{ status: CheckStatus, label: string, detail?: string }} CheckResult
 */

export function createReporter() {
  /** @type {CheckResult[]} */
  const results = [];

  return {
    /**
     * @param {CheckStatus} status
     * @param {string} label
     * @param {string} [detail]
     */
    add(status, label, detail) {
      results.push({ status, label, detail });
    },
    pass(label, detail) {
      this.add("PASS", label, detail);
    },
    warn(label, detail) {
      this.add("WARN", label, detail);
    },
    fail(label, detail) {
      this.add("FAIL", label, detail);
    },
    get results() {
      return results;
    },
    get failCount() {
      return results.filter((r) => r.status === "FAIL").length;
    },
    get warnCount() {
      return results.filter((r) => r.status === "WARN").length;
    },
  };
}

/**
 * @param {string} title
 * @param {Record<string, string>} meta
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {{ sections?: { name: string, labels: string[] }[] }} [options]
 */
export function printReport(title, meta, reporter, options = {}) {
  console.log(title);
  for (const [k, v] of Object.entries(meta)) {
    console.log(`${k}: ${v}`);
  }
  console.log("");

  const sections = options.sections;
  if (sections?.length) {
    const used = new Set();
    for (const section of sections) {
      const items = reporter.results.filter((r) =>
        section.labels.some((prefix) => r.label.startsWith(prefix) || section.labels.includes(r.label)),
      );
      // Prefer explicit grouping via label prefixes encoded in section.labels as matchers
      const matched = reporter.results.filter((r) => {
        if (used.has(r)) return false;
        const hit = section.labels.some((needle) => {
          if (needle.endsWith("*")) return r.label.startsWith(needle.slice(0, -1));
          return r.label === needle || r.label.startsWith(needle);
        });
        return hit;
      });
      if (!matched.length) continue;
      console.log(section.name);
      for (const r of matched) {
        used.add(r);
        printCheck(r);
      }
      console.log("");
    }
    const leftovers = reporter.results.filter((r) => !used.has(r));
    if (leftovers.length) {
      console.log("OTHER");
      for (const r of leftovers) printCheck(r);
      console.log("");
    }
  } else {
    for (const r of reporter.results) printCheck(r);
    console.log("");
  }

  console.log("MANUAL REMAINING");
  for (const item of MANUAL_REMAINING) {
    console.log(`- ${item}`);
  }
  console.log("");
  console.log(
    `Summary: ${reporter.results.filter((r) => r.status === "PASS").length} pass, ${reporter.warnCount} warn, ${reporter.failCount} fail`,
  );
}

/** @param {CheckResult} r */
function printCheck(r) {
  if (r.detail) {
    console.log(`${r.status.padEnd(4)} ${r.label}`);
    for (const line of String(r.detail).split("\n")) {
      console.log(`       ${line}`);
    }
  } else {
    console.log(`${r.status.padEnd(4)} ${r.label}`);
  }
}

/**
 * @param {string[]} argv
 * @returns {{ page?: string, url?: string, help: boolean }}
 */
export function parseArgs(argv) {
  /** @type {{ page?: string, url?: string, help: boolean }} */
  const out = { help: false };
  /** @type {string[]} */
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--page") out.page = argv[++i];
    else if (arg.startsWith("--page=")) out.page = arg.slice("--page=".length);
    else if (arg === "--url") out.url = argv[++i];
    else if (arg.startsWith("--url=")) out.url = arg.slice("--url=".length);
    else if (arg === "--") continue;
    else if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    else positionals.push(arg);
  }
  // npm may strip `--page` / `--url` as config flags; accept positionals.
  for (const value of positionals) {
    if (/^https?:\/\//i.test(value)) {
      if (out.url) throw new Error(`Unexpected argument: ${value}`);
      out.url = value;
    } else {
      if (out.page) throw new Error(`Unexpected argument: ${value}`);
      out.page = value;
    }
  }
  return out;
}

/** @param {string} rel */
export function repoPath(...parts) {
  return path.join(REPO_ROOT, ...parts);
}

/** @param {string} p */
export function readText(p) {
  return fs.readFileSync(p, "utf8");
}

/** @param {string} p */
export function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** @param {string} p */
export function dirExists(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(html) {
  return normalizeText(String(html || "").replace(/<[^>]+>/g, " "));
}

/**
 * Lightweight HTML attribute/content extractors (no HTML parser dependency).
 * Sufficient for static marketing pages authored in-repo.
 */

/** @param {string} html */
export function extractTitle(html) {
  const matches = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)];
  return matches.map((m) => normalizeText(m[1]));
}

/**
 * @param {string} html
 * @param {string} name
 */
export function extractMetaByName(html, name) {
  const re = new RegExp(
    `<meta\\b[^>]*\\bname=["']${escapeRegExp(name)}["'][^>]*>`,
    "gi",
  );
  return [...html.matchAll(re)].map((m) => getAttr(m[0], "content"));
}

/**
 * @param {string} html
 * @param {string} property
 */
export function extractMetaByProperty(html, property) {
  const re = new RegExp(
    `<meta\\b[^>]*\\bproperty=["']${escapeRegExp(property)}["'][^>]*>`,
    "gi",
  );
  return [...html.matchAll(re)].map((m) => getAttr(m[0], "content"));
}

/**
 * @param {string} html
 * @param {string} rel
 */
export function extractLinkHref(html, rel) {
  const re = new RegExp(
    `<link\\b[^>]*\\brel=["']${escapeRegExp(rel)}["'][^>]*>`,
    "gi",
  );
  return [...html.matchAll(re)].map((m) => getAttr(m[0], "href")).filter(Boolean);
}

/** @param {string} html */
export function extractH1s(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    stripTags(m[1]),
  );
}

/** @param {string} html */
export function extractHeadingLevels(html) {
  return [...html.matchAll(/<(h[1-6])\b[^>]*>/gi)].map((m) =>
    Number(m[1].slice(1)),
  );
}

/** @param {string} html */
export function extractJsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1].trim(),
  );
}

/**
 * @param {unknown} data
 * @returns {string[]}
 */
export function collectSchemaTypes(data) {
  /** @type {string[]} */
  const types = [];
  walk(data, (node) => {
    if (node && typeof node === "object" && !Array.isArray(node) && "@type" in node) {
      const t = /** @type {{ "@type": unknown }} */ (node)["@type"];
      if (typeof t === "string") types.push(t);
      else if (Array.isArray(t)) {
        for (const item of t) if (typeof item === "string") types.push(item);
      }
    }
  });
  return types;
}

/**
 * @param {unknown} data
 * @returns {string[]}
 */
export function collectSchemaUrls(data) {
  /** @type {string[]} */
  const urls = [];
  walk(data, (node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    for (const key of ["url", "item", "@id"]) {
      const val = /** @type {Record<string, unknown>} */ (node)[key];
      if (typeof val === "string" && /^https?:\/\//i.test(val)) urls.push(val);
    }
  });
  return urls;
}

/**
 * @param {unknown} node
 * @param {(n: unknown) => void} visit
 */
function walk(node, visit) {
  visit(node);
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
  } else if (node && typeof node === "object") {
    for (const value of Object.values(node)) walk(value, visit);
  }
}

/**
 * @param {string} tag
 * @param {string} attr
 */
export function getAttr(tag, attr) {
  const re = new RegExp(`\\b${escapeRegExp(attr)}=["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : "";
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} html
 * @returns {{ tag: string, src: string, alt: string | null, width?: string, height?: string, loading?: string }[]}
 */
export function extractImages(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => {
    const tag = m[0];
    const altMatch = tag.match(/\balt=(["'])([\s\S]*?)\1/i);
    return {
      tag,
      src: getAttr(tag, "src"),
      alt: altMatch ? altMatch[2] : null,
      width: getAttr(tag, "width") || undefined,
      height: getAttr(tag, "height") || undefined,
      loading: getAttr(tag, "loading") || undefined,
    };
  });
}

/**
 * @param {string} html
 * @returns {{ href: string, text: string }[]}
 */
export function extractAnchors(html) {
  return [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map(
    (m) => ({
      href: m[2],
      text: stripTags(m[3]),
    }),
  );
}

/**
 * @param {string} href
 * @param {string} pageFileAbs
 */
export function resolveLocalAsset(href, pageFileAbs) {
  if (!href || href.startsWith("data:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }
  if (/^https?:\/\//i.test(href)) return null;
  if (href.startsWith("#")) return null;
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;
  if (clean.startsWith("/")) {
    return path.join(REPO_ROOT, "landing-page", clean.replace(/^\//, ""));
  }
  return path.resolve(path.dirname(pageFileAbs), clean);
}

/**
 * Map a site-relative path to a landing-page file when possible.
 * @param {string} href
 */
export function resolveLandingRoute(href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return { skip: true };
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (u.hostname !== CANONICAL_HOST && u.hostname !== "simplerosterplus.com") {
        return { skip: true, external: true };
      }
      href = u.pathname;
    } catch {
      return { skip: true };
    }
  }
  const pathname = href.split("#")[0].split("?")[0];
  if (!pathname.startsWith("/")) return { skip: true };

  if (pathname === "/" || pathname === "") {
    return { file: repoPath("landing-page", "index.html") };
  }

  const trimmed = pathname.replace(/\/$/, "");
  const directHtml = repoPath("landing-page", `${trimmed.slice(1)}.html`);
  if (fileExists(directHtml)) return { file: directHtml };

  const indexHtml = repoPath("landing-page", trimmed.slice(1), "index.html");
  if (fileExists(indexHtml)) return { file: indexHtml };

  return { missing: true, pathname };
}

/** @param {string} xml */
export function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

/**
 * @param {string} robotsTxt
 * @param {string} pathname
 */
export function robotsAllowsPath(robotsTxt, pathname) {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  /** @type {string[]} */
  const disallows = [];
  /** @type {string[]} */
  const allows = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const ua = line.slice("user-agent:".length).trim();
      inStar = ua === "*";
      continue;
    }
    if (!inStar) continue;
    if (lower.startsWith("disallow:")) {
      disallows.push(line.slice("disallow:".length).trim());
    } else if (lower.startsWith("allow:")) {
      allows.push(line.slice("allow:".length).trim());
    }
  }

  // Empty Disallow means allow all.
  const blocked = disallows.some((rule) => rule && pathname.startsWith(rule));
  if (!blocked) return true;
  const allowed = allows.some((rule) => rule && pathname.startsWith(rule));
  return allowed;
}

/** @param {string} robotsTxt */
export function extractRobotsSitemap(robotsTxt) {
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.toLowerCase().startsWith("sitemap:")) {
      return line.slice("sitemap:".length).trim();
    }
  }
  return null;
}

/**
 * Validate a canonical URL shape used by commercial pages.
 * @param {string} canonical
 */
export function validateCanonicalShape(canonical) {
  /** @type {string[]} */
  const issues = [];
  let url;
  try {
    url = new URL(canonical);
  } catch {
    return ["Canonical is not a valid URL"];
  }
  if (url.protocol !== "https:") issues.push("Canonical must use HTTPS");
  if (url.hostname !== CANONICAL_HOST) {
    issues.push(`Canonical host must be ${CANONICAL_HOST}`);
  }
  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    issues.push("Canonical must not have a trailing slash");
  }
  if (/\/index\.html$/i.test(url.pathname)) {
    issues.push("Canonical must not end with /index.html");
  }
  if (url.search || url.hash) {
    issues.push("Canonical should not include query or hash");
  }
  return issues;
}

/**
 * @param {string} href
 */
export function isRelativeAppCta(href) {
  try {
    if (/^https?:\/\//i.test(href)) return false;
    const pathOnly = href.split("?")[0].split("#")[0];
    return RELATIVE_APP_ROUTES.includes(pathOnly);
  } catch {
    return false;
  }
}

/**
 * Follow redirects manually to report each hop.
 * @param {string} startUrl
 * @param {{ maxHops?: number }} [opts]
 */
export async function fetchRedirectChain(startUrl, opts = {}) {
  const maxHops = opts.maxHops ?? 8;
  /** @type {{ url: string, status: number, location?: string }[]} */
  const hops = [];
  let current = startUrl;

  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, { redirect: "manual", method: "GET" });
    const location = res.headers.get("location") || undefined;
    hops.push({ url: current, status: res.status, location });
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return { hops, finalUrl: current, finalStatus: res.status, loop: false };
  }
  return { hops, finalUrl: current, finalStatus: hops.at(-1)?.status ?? 0, loop: true };
}

export function isPermanentRedirect(status) {
  return status === 301 || status === 308;
}

/**
 * Classify whether a URL/console message is first-party for this marketing site.
 * @param {string} urlOrText
 * @param {string} pageOrigin
 */
export function isFirstParty(urlOrText, pageOrigin) {
  try {
    const u = new URL(urlOrText, pageOrigin);
    return (
      u.hostname === CANONICAL_HOST ||
      u.hostname === "simplerosterplus.com" ||
      u.hostname.endsWith(".simplerosterplus.com")
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} text
 */
export function looksLikeExtensionNoise(text) {
  return /chrome-extension:|moz-extension:|safari-extension:|devtools:\/\/|extensions::/i.test(
    text,
  );
}

/**
 * Artifact directory for a page key or URL slug.
 * @param {string} key
 */
export function artifactsDir(key) {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return repoPath("artifacts", "seo-verification", safe);
}
