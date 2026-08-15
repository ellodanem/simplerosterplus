# SEO verification runner

Operational guide for the Simple Roster Plus marketing-site SEO checks.

## Purpose

Automate repetitive technical SEO checks for static commercial pages under `landing-page/` before and after deploy.

This is a small local CLI — not a dashboard, crawler platform, or Search Console integration.

## Installation

From the repo root (npm):

```bash
npm install
npx playwright install chromium
```

`playwright` and `lighthouse` are devDependencies. Chromium must be installed separately for browser and Lighthouse runs.

## Commands

### Static repository validation

```bash
npm run seo:check
npm run seo:check:all
npm run seo:check -- homepage
npm run seo:check -- employee-leave-and-availability
node scripts/seo-check.mjs --page employee-leave-and-availability
npm run seo:selftest:site-wide
```

Validates local HTML, assets, sitemap, robots, schema, CTAs, and page config expectations. No network required for the page itself (reads `landing-page/` files).

**`seo:check:all`** runs the footer drift check, then the same static runner with every configured page (identical to `seo:check` with no page key). Prefer it when you want an explicit all-site static pass.

**npm note:** npm may treat `--page` / `--url` as npm config flags and strip them. Prefer a positional page key after `--`, or call `node scripts/...` directly with flags.

### Site-wide static assertions (Phase 4E)

Every `seo:check` / `seo:check:all` invocation runs inexpensive **site-wide** checks once before per-page checks. Helpers live in `scripts/seo/site-wide.mjs` (no network).

| Check | Behavior |
|-------|----------|
| Config uniqueness | FAIL if two configs share the same page key, production `file` path, `url`, or `canonical` |
| Cross-page `<title>` uniqueness | FAIL on exact normalized title duplicates across configured indexable pages (trim, collapse whitespace, case-insensitive) |
| Cross-page meta description uniqueness | FAIL on exact normalized description duplicates (same normalization) |
| Sitemap ↔ page-config consistency | FAIL if a configured indexable URL is missing, duplicated, or if a sitemap marketing URL has no page config; enforce HTTPS `www.simplerosterplus.com`, extensionless paths, and no trailing-slash variants (homepage `/` allowed). `/privacy` and `/terms` stay excluded (intentional `noindex`) |

Shared phrases across titles (for example “Employee Scheduling Software”) are **not** failed unless the full normalized string matches.

**Intentionally not checked in static verification**

- Near-duplicate / semantic title or description similarity
- Title or meta-description length hard gates
- Keyword density or word-count scores
- Lighthouse, Core Web Vitals, or accessibility hard gates
- Large PNG “primary vs `<picture>` fallback vs OG” size warnings (deferred — cannot stay low-noise without fragile heuristics; orphan files under `landing-page/images/` are also out of scope)
- Broken external-link crawling
- AI copy review or search-volume APIs
- Production `seo:verify`, live URLs, or deployment health (kept out of required PR CI)

Lighthouse remains outside static verification because it needs a browser, network (or served HTML), and non-deterministic scoring. Use `seo:verify` locally or after deploy when you need production confirmation — never as a required PR gate.

Regression coverage for the site-wide helpers (in-memory fixtures only):

```bash
npm run seo:selftest:site-wide
```

### GitHub Actions (Phase 4F)

Workflow: `.github/workflows/seo-static.yml`

Runs on pull requests and pushes to `main` when marketing/SEO paths change:

- `landing-page/**`
- `scripts/seo/**`
- `scripts/seo-check.mjs`
- `package.json`
- `docs/seo-verification-runner.md`
- `.github/workflows/seo-static.yml`

CI steps (no `npm install`, no network):

1. `npm run seo:selftest:site-wide`
2. `npm run seo:check:all`

Expected homepage and SMB risky-phrase WARNs do **not** fail the job. FAILs exit non-zero.

**Not in CI:** `seo:verify`, Lighthouse, Playwright, Vercel deploy checks, or production URL fetches.

Phase 4 technical SEO hardening ends here. Remaining image/font/OG polish is opportunistic, not a blocker for Phase 5 (Search Console-led growth).

### Production validation

```bash
npm run seo:verify -- homepage
npm run seo:verify -- employee-leave-and-availability
npm run seo:verify -- https://www.simplerosterplus.com/employee-leave-and-availability
node scripts/seo-verify.mjs --page employee-leave-and-availability
node scripts/seo-verify.mjs --url https://www.simplerosterplus.com/employee-leave-and-availability
```

`--page` loads expectations from `scripts/seo/page-configs.mjs`.  
`--url` runs generic live checks without exact title/H1 expectations.

### Shared marketing footer

The homepage and six commercial pages contain generated footer regions. Edit the
page-specific mission or shared link contract in `scripts/seo/footer-generator.mjs`,
then regenerate and verify from the repository root:

```bash
npm run footer:generate
npm run footer:check
```

`footer:check` is non-mutating and exits non-zero when a generated footer differs
from its authoritative template. Do not hand-edit content between the generated
footer markers. The standard `npm run seo:check` command runs this drift check
before page-level SEO validation.

## Adding a page config

Edit `scripts/seo/page-configs.mjs` and add an entry:

```js
"your-page-key": {
  key: "your-page-key",
  file: "landing-page/your-page-key/index.html",
  url: "https://www.simplerosterplus.com/your-page-key",
  title: "Exact document title",
  h1: "Exact H1 textContent (nested tags flattened)",
  canonical: "https://www.simplerosterplus.com/your-page-key",
  requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
  requiredInternalLinks: ["/other-page"],
  // optional:
  // allowedRiskyPhrases: ["exact phrase that is intentionally allowed"],
},
```

Inspect the live HTML before setting `title` / `h1` — do not invent values.

## PASS / WARN / FAIL

| Status | Meaning | Exit code impact |
|--------|---------|------------------|
| PASS | Check succeeded | none |
| WARN | Review recommended; not blocking | none |
| FAIL | Critical failure | non-zero |

Exit code is `0` when there are no FAILs. Warnings alone still exit `0`.

## Lighthouse thresholds

| Category | Threshold | Behavior |
|----------|-----------|----------|
| SEO | 100 | FAIL below |
| Accessibility | 90 | FAIL below |
| Best Practices | 90 | FAIL below |
| Performance | 75 | WARN below (does not fail the command) |

Lighthouse runs against Playwright’s Chromium with extensions disabled.

## Artifacts

Production verify writes to:

```text
artifacts/seo-verification/<page-key>/
  viewport-375.png
  viewport-768.png
  viewport-1024.png
  viewport-1440.png
  document-1440.png
  lighthouse.html
  lighthouse.json
```

This directory is gitignored. Do not commit generated screenshots or reports.

## What remains manual

Printed at the end of every run:

- Verify application feature behavior
- Review page copy and screenshots
- Test live URL in Google Search Console
- Request indexing

Search Console submission and the Google Indexing API are intentionally not automated.

## Risky claim scan

`scripts/seo/prohibited-claims.mjs` flags marketing terms that often overclaim product scope (for example accrual, self-service, WhatsApp).

Version one:

- Emits WARN with surrounding excerpts when a term looks like a feature claim
- Treats nearby negation / limitation language as allowed (no WARN)
- Does **not** use an AI classifier

Always skim WARN excerpts before treating a page as clean.

## Why browser-extension errors should not appear

`seo:verify` launches a clean Playwright Chromium profile with `--disable-extensions`. That isolates checks from installed Chrome extensions that inject scripts and console noise into normal browsing sessions. Lighthouse uses the same Playwright Chromium via remote debugging, not your everyday Chrome profile.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Executable doesn't exist` / browser launch failure | `npx playwright install chromium` |
| Unknown page key | Add the key to `scripts/seo/page-configs.mjs` or pass `--url` |
| Lighthouse port / debugging errors | Re-run; ensure nothing else binds the ephemeral debug port; reinstall Chromium |
| Static check cannot find images | Confirm paths relative to the page HTML under `landing-page/` |
| WebP WARN despite `<picture>` | Older checks counted only `<img src>`. Current `seo-check` also counts `<source type="image/webp">` and WebP entries in `srcset`. |
| Production redirect failures | Confirm Vercel/host redirects for apex, trailing slash, and `/index.html` |

## File map

```text
.github/workflows/seo-static.yml  # Phase 4F path-filtered static CI
scripts/seo-check.mjs          # npm run seo:check / seo:check:all
scripts/seo-verify.mjs         # npm run seo:verify (local/production only)
scripts/seo/shared.mjs         # HTML helpers, CLI args, reporting
scripts/seo/page-configs.mjs   # Per-page expectations
scripts/seo/site-wide.mjs      # Cross-page + sitemap consistency helpers
scripts/seo/site-wide-selftest.mjs  # npm run seo:selftest:site-wide
scripts/seo/prohibited-claims.mjs
scripts/seo/lighthouse.mjs
scripts/seo/footer-generator.mjs # Shared marketing-footer generation and drift check
docs/seo-verification-runner.md
```
