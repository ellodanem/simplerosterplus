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
npm run seo:check -- employee-leave-and-availability
node scripts/seo-check.mjs --page employee-leave-and-availability
```

Validates local HTML, assets, sitemap, robots, schema, CTAs, and page config expectations. No network required for the page itself (reads `landing-page/` files).

**npm note:** npm may treat `--page` / `--url` as npm config flags and strip them. Prefer a positional page key after `--`, or call `node scripts/...` directly with flags.

### Production validation

```bash
npm run seo:verify -- employee-leave-and-availability
npm run seo:verify -- https://www.simplerosterplus.com/employee-leave-and-availability
node scripts/seo-verify.mjs --page employee-leave-and-availability
node scripts/seo-verify.mjs --url https://www.simplerosterplus.com/employee-leave-and-availability
```

`--page` loads expectations from `scripts/seo/page-configs.mjs`.  
`--url` runs generic live checks without exact title/H1 expectations.

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
| Production redirect failures | Confirm Vercel/host redirects for apex, trailing slash, and `/index.html` |

## File map

```text
scripts/seo-check.mjs          # npm run seo:check
scripts/seo-verify.mjs         # npm run seo:verify
scripts/seo/shared.mjs         # HTML helpers, CLI args, reporting
scripts/seo/page-configs.mjs   # Per-page expectations
scripts/seo/prohibited-claims.mjs
scripts/seo/lighthouse.mjs
docs/seo-verification-runner.md
```
