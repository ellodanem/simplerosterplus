# SEO Phase 1 — Implementation Report

**Date:** 16 July 2026  
**Scope:** Technical SEO foundation, homepage roster-first optimization, legal noindex, image WebP, structured data  
**Source audit:** [`docs/seo-validation-audit.md`](./seo-validation-audit.md)  
**Canonical host:** `https://www.simplerosterplus.com`

---

## 1. Files changed or created

| Path | Action |
|------|--------|
| `landing-page/index.html` | Updated (metadata, H1/hero, roster-first copy, ZKTeco wording, absolute CTAs, JSON-LD, WebP `<picture>`) |
| `landing-page/privacy.html` | Updated (`noindex`, canonical, back link `/`) |
| `landing-page/terms.html` | Updated (`noindex`, canonical, back link `/`) |
| `landing-page/robots.txt` | **Created** |
| `landing-page/sitemap.xml` | **Created** |
| `landing-page/images/solution-attendance.webp` | **Created** |
| `landing-page/images/solution-attendance@2x.webp` | **Created** |
| `landing-page/images/app-roster-week.webp` | **Created** |
| `landing-page/images/solution-auto-scheduler.webp` | **Created** |
| `docs/seo-phase-1-implementation.md` | **Created** (this file) |

Original PNG files were **not** deleted.

---

## 2. Homepage title

| | Value |
|---|--------|
| **Previous** | `Simple Roster Plus \| Weekly Schedules & Attendance for Managers` |
| **New** | `Employee Roster Software for Small Teams \| Simple Roster Plus` |

---

## 3. Homepage H1

| | Value |
|---|--------|
| **Previous** | `Build the weekly schedule and track attendance—in minutes.` |
| **New** | `Build and Share Staff Rosters—Then Track What Actually Happened` |

Hero lead (refined from brief for natural flow):

> Simple employee roster software for creating weekly schedules, sharing shifts with your team, and comparing scheduled hours with actual attendance—built for small, shift-based teams.

---

## 4. Technical SEO files added

### `landing-page/robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://www.simplerosterplus.com/sitemap.xml
```

### `landing-page/sitemap.xml`

Includes only:

- `https://www.simplerosterplus.com/`

Privacy and terms are **excluded** while stub pages remain `noindex`.

---

## 5. CTA URL changes

All signup/demo/login CTAs now use absolute app URLs in the **raw HTML** (not only via JS):

| Action | Absolute URL |
|--------|----------------|
| Signup (`.cta-signup`) | `https://app.simplerosterplus.com/sign-up` |
| Demo (`.demo-cta`) | `https://app.simplerosterplus.com/sign-up?intent=demo` |
| Login | `https://app.simplerosterplus.com/login` |

JavaScript in `index.html` still rewrites these from `SRP_*` constants as a central override. Relative `/sign-up` and `/login` hrefs were removed.

Nurture CTAs (`.cta-contact`) still correctly point to `#contact` on the marketing site.

---

## 6. Legal-page noindex changes

On both `privacy.html` and `terms.html`:

- Added `<meta name="robots" content="noindex, follow">`
- Added HTML comment: `TODO(seo): Remove noindex once approved legal copy replaces this placeholder.`
- Added canonical URLs:
  - `https://www.simplerosterplus.com/privacy.html`
  - `https://www.simplerosterplus.com/terms.html`
- Back links changed from `index.html` → `/`
- Placeholder legal body copy was **not** rewritten
- Pages are **not** listed in the sitemap

---

## 7. Structured data added

JSON-LD `@graph` on the homepage:

| Type | Notes |
|------|--------|
| **Organization** | Name, URL, logo (`/brand/srp-logo-lockup.png`), email `hello@simplerosterplus.com` (already public on site) |
| **WebSite** | Name + URL; publisher → Organization |
| **SoftwareApplication** | Category `BusinessApplication`, OS `Web`, roster-first description; Offers Free `$0`, Plus `$19.99`, Pro `$49.99` USD (matches published pricing on page) |

### FAQPage schema — omitted

**Why:** FAQ markup uses `<details>`/`<summary>`, which can work with FAQ rich results, but requirements and eligibility change over time. To avoid shipping inaccurate or rejected FAQ markup in Phase 1, FAQPage was deferred. Organization / WebSite / SoftwareApplication are sufficient for foundation.

No aggregate ratings, review scores, or unsupported feature claims were added.

---

## 8. ZKTeco wording changes

| Location | Previous | New |
|----------|----------|-----|
| Hero trust row | `ZKTeco-ready` | `Supports selected ZKTeco terminals` |
| Features bullet | `Works with ZKTeco terminals` | `Connect supported ZKTeco devices using ADMS push` |
| FAQ (hardware) | Broad “including ZKTeco” | `ZKTeco attendance integration is available for supported devices using ADMS push` |

Contact form still asks “Using ZKTeco (or similar) today?” (qualification field, not a compatibility claim).

No device model list on the homepage. Pull TCP / LAN SDK / universal compatibility are **not** claimed.

---

## 9. Image optimization results

Only images referenced by `landing-page/index.html` screenshots were converted (PIL, quality 82). Logos left as PNG.

| File | Before (PNG) | After (WebP) | Reduction |
|------|--------------|--------------|-----------|
| `solution-attendance.png` | 1,381.5 KB | 107.0 KB | **92.3%** |
| `solution-attendance@2x.png` | 2,698.9 KB | 238.2 KB | **91.2%** |
| `app-roster-week.png` | 151.2 KB | 70.2 KB | **53.5%** |
| `solution-auto-scheduler.png` | 1,342.3 KB | 99.0 KB | **92.6%** |

Markup uses `<picture>` with WebP `<source>` and PNG fallback. Hero keeps `fetchpriority="high"`; below-the-fold images keep `loading="lazy"`. Width/height and alt text preserved.

**OG/Twitter image** switched from `solution-attendance.png` to `app-roster-week.png` (roster-first visual, still an existing asset). Absolute PNG URLs retained for social crawler compatibility.

Unused oversized PNGs (`pain-before-workflow.png`, `hero-weekly-schedule-attendance.png`, etc.) were **not** optimized in this phase.

---

## 10. Wording decisions beyond the brief

| Decision | Rationale |
|----------|-----------|
| Meta description extended slightly to “…—Simple Roster Plus for small teams.” (~144 chars) | Closer to 150–160 while staying faithful to supplied meaning |
| Hero accent span on “What Actually Happened” | Preserves existing accent styling without changing H1 meaning |
| Feature H3 “Create the weekly roster” / “Track attendance against the roster” | Small roster-first alignment without new sections |
| How-it-works step “Build the roster” | Same |
| Closing H2 “Your week's roster and attendance…” | Aligns with H1 without rewriting the page |
| Footer HTML comment listing future URLs | Prep for Phase 2; no dead links |
| FAQPage omitted | See §7 |
| OG image → roster week screenshot | Clearer match to primary keyword positioning |

Pricing amounts and “Coming soon” labels for Auto Scheduler / SMS were **not** changed.

---

## 11. Not implemented (and why)

| Item | Reason |
|------|--------|
| Future landing pages (`/employee-scheduling-software`, etc.) | Explicitly out of Phase 1 scope |
| FAQPage JSON-LD | Uncertainty / accuracy risk — deferred |
| Apex → www redirect in repo | Managed outside repository; no `vercel.json` present |
| Analytics / conversion tracking | Not in Phase 1 brief |
| Legal policy rewrite | Placeholder only; `noindex` until approved |
| Optimize unused images | Not referenced by `index.html` |
| Framework / CMS / permanent image build pipeline | Conversion done once with PIL; no runtime dependency added |
| Web manifest / custom 404 | Later improvements per audit |

---

## 12. Manual checks required after deployment

### Deployment checklist

- [ ] Confirm apex `simplerosterplus.com` redirects to `https://www.simplerosterplus.com` with **one** permanent (301/308) redirect
- [ ] Confirm `https://www.simplerosterplus.com/robots.txt` is publicly reachable and matches repo content
- [ ] Confirm `https://www.simplerosterplus.com/sitemap.xml` is publicly reachable and lists only the homepage for now
- [ ] Confirm signup / demo / login links work with **JavaScript disabled** (absolute `app.simplerosterplus.com` URLs)
- [ ] Validate structured data (e.g. [Google Rich Results Test](https://search.google.com/test/rich-results) or Schema Markup Validator)
- [ ] Inspect production View Source: title, H1, canonical, no relative `/sign-up`
- [ ] Confirm `privacy.html` and `terms.html` include `noindex, follow` in production
- [ ] Confirm no staging, localhost, or `*.vercel.app` URLs in marketing HTML
- [ ] Spot-check WebP delivery in DevTools (Network) with PNG fallback on older browsers
- [ ] Submit sitemap in Google Search Console when ready
- [ ] After legal copy is approved: remove `noindex`, add pages to sitemap, update canonicals if clean URLs are adopted

### Future page order (do not publish yet)

1. `/employee-scheduling-software`
2. `/employee-attendance-software`
3. `/zkteco-attendance-integration`

---

*End of Phase 1 implementation report.*
