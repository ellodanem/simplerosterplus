# Simple Roster Plus — SEO & Website Structure Validation Audit

**Audit date:** 16 July 2026  
**Scope:** Marketing website (`landing-page/`) and related conversion/API paths in the Next.js app  
**Method:** Repository inspection only — no live Lighthouse run, no production DNS checks, no file modifications outside this report  
**Auditor constraint:** Static HTML site; no framework migration, no copy rewrites in this pass

---

## 1. Executive summary

Simple Roster Plus has a **single-page marketing site** plus two legal stub pages, all implemented as **hand-authored static HTML** in `landing-page/`. There is **no build step**, **no templating system**, **no `robots.txt`**, **no `sitemap.xml`**, and **no structured data**. The homepage has a solid SEO baseline in `<head>` (title, description, canonical, OG/Twitter, robots, viewport, `lang="en"`), but it targets **“weekly schedules & attendance for managers”** rather than the draft primary keyword **“employee roster software.”**

The site is **functionally ready for a small launch** (CTAs, form API, legal links) but **not ready for a multi-page SEO program** without foundational infrastructure and several blocking fixes.

### Top findings (by impact)


| #   | Finding                                                                                                                         | Severity   |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Only **3 indexable HTML pages** exist; 8+ planned SEO topics have **no URL**                                                    | High       |
| 2   | **No `sitemap.xml` or `robots.txt`**                                                                                            | High       |
| 3   | Homepage keyword focus is **schedule + attendance**, not **roster-first** / primary keyword map                                 | High       |
| 4   | **Privacy/Terms are placeholders** with visible stub banners and incomplete SEO metadata                                        | High       |
| 5   | Signup/demo CTAs use **relative `/sign-up` hrefs** rewritten by JavaScript — risky for no-JS users and some crawlers            | Medium     |
| 6   | **No analytics or conversion tracking** on the marketing site (documented as out of scope)                                      | Medium     |
| 7   | **Large PNG hero/feature images** (up to ~2.7 MB) without WebP/AVIF                                                             | Medium     |
| 8   | **ZKTeco claims are vague** (“ZKTeco-ready”, “Works with ZKTeco terminals”) with no supported-device list on the marketing site | Medium     |
| 9   | **No `vercel.json` in repo** — hosting/routing behavior cannot be fully verified from source                                    | Medium     |
| 10  | **No JSON-LD** (Organization, SoftwareApplication, FAQPage) despite rich FAQ content                                            | Low–Medium |


### What works well

- Single H1, logical H2 hierarchy, semantic sections with `aria-labelledby`
- Descriptive alt text on all visible `<img>` elements (no empty alts found)
- Skip link, form labels, focus styles, `prefers-reduced-motion` handling
- Honest “Coming soon” labeling for Auto Scheduler and SMS publish
- CTA wiring to production app origin via `SRP_`* constants and runtime rewrite
- Contact form POSTs to a real API with CORS allow-list (`/api/marketing/contact`)
- Canonical/OG URLs use absolute HTTPS `www` URLs consistently in homepage head

---

## 2. Current project architecture

### Framework and entry point


| Attribute                     | Value                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Framework**                 | None — plain static HTML/CSS/JS                                                     |
| **Canonical directory**       | `landing-page/`                                                                     |
| **Entry point**               | `landing-page/index.html`                                                           |
| **Build scripts**             | None in `package.json` for the marketing site                                       |
| **CSS**                       | ~~735 lines embedded in `<style>` inside `index.html` (~~62 KB file)                |
| **JavaScript**                | Inline `<script>` blocks: URL wiring, header scroll, contact form fetch (~80 lines) |
| **External dependencies**     | Google Fonts (Plus Jakarta Sans) via CDN                                            |
| **Shared layouts/components** | **None** — each HTML file is standalone; no includes, partials, or generators       |
| **Duplication**               | Legal pages (`privacy.html`, `terms.html`) duplicate inline styles independently    |


### Relationship to the Next.js app

The repo root is a **separate Next.js 16 app** (`npm run dev` → port 3000). It does **not** serve `landing-page/` — `next.config.ts` is empty and there are no rewrites to the marketing folder.

Intended production topology (from `docs/OPERATOR_CONSOLE.md`):

```text
simplerosterplus.com         → marketing / landing (static)
app.simplerosterplus.com     → Next.js tenant app
admin.simplerosterplus.com   → operator console (rewritten to /ops)
```

### Vercel configuration


| Item                  | Status                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `vercel.json` in repo | **Not found**                                                                                                                     |
| Marketing deploy root | **Not documented in repo** — likely Vercel project with Root Directory = `landing-page/` (inferred, not confirmed)                |
| App deploy            | Standard Next.js build (`npm run build`)                                                                                          |
| Legacy redirect       | `middleware.ts` redirects `simplerosterplus.vercel.app` → `app.simplerosterplus.com` for browser routes (app only, not marketing) |


### Routing and clean URLs

- Homepage: `/` or `/index.html` (hosting-dependent)
- Legal: `privacy.html`, `terms.html` — `**.html` extensions in footer links**
- In-page anchors: `#hero`, `#features`, `#pricing`, `#faq`, `#contact`, `#cta-close`
- **No trailing-slash policy documented**
- **No custom 404 page** in `landing-page/`
- Clean URL behavior (extensionless `/privacy`) depends on **Vercel dashboard settings**, not repo files

### Legacy / non-canonical copy

`landing page/` (space in path, repo sibling per `LANDING-PAGE.md`) is an **experiment only** — must not be deployed or indexed.

### File structure (marketing)

```text
landing-page/
├── index.html          ← homepage (all sections, CSS, JS)
├── privacy.html
├── terms.html
├── favicon.ico, favicon.svg
├── MAPPING.md, LANDING-PAGE.md   ← internal docs, not public pages
├── brand/              ← logos, icons (PNG/SVG)
└── images/             ← product screenshots (PNG)
```

---

## 3. Public page inventory


| Current page     | Source file                 | Expected public URL                                                                   | Page purpose                  | Title               | Meta description                            | H1                                                                                                                                           | Main CTA                                                     | Indexable?                                  | Notes / concerns          |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------- | ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- | ------------------------- |
| Homepage         | `landing-page/index.html`   | `https://www.simplerosterplus.com/`                                                   | Product marketing, conversion | `Simple Roster Plus | Weekly Schedules & Attendance for Managers` | `Free for up to 10 staff. Build the weekly schedule and track attendance in minutes. For shift managers—no payroll bloat or HR suite noise.` | `Build the weekly schedule and track attendance—in minutes.` | **Start Free** (mixed: signup + `#contact`) | **Yes** (`index, follow`) |
| Privacy Policy   | `landing-page/privacy.html` | `https://www.simplerosterplus.com/privacy.html` (or `/privacy` if clean URLs enabled) | Legal                         | `Privacy Policy     | Simple Roster Plus`                         | **Missing**                                                                                                                                  | `Privacy Policy`                                             | Back link only                              | **Yes** (no `noindex`)    |
| Terms of Service | `landing-page/terms.html`   | `https://www.simplerosterplus.com/terms.html`                                         | Legal                         | `Terms of Service   | Simple Roster Plus`                         | **Missing**                                                                                                                                  | `Terms of Service`                                           | Back link only                              | **Yes**                   |


**Total public HTML pages identified:** 3

**Not public / out of scope for marketing SEO:** Next.js app routes (`app.simplerosterplus.com/`*), operator console, shared roster links (`/share/roster/`* — `robots: noindex` in app), internal markdown in `landing-page/*.md`.

---

## 4. Homepage assessment

### Head metadata (evidence: `landing-page/index.html` lines 6–19)


| Element          | Current value                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `<title>`        | `Simple Roster Plus                                                                                                                          |
| Meta description | `Free for up to 10 staff. Build the weekly schedule and track attendance in minutes. For shift managers—no payroll bloat or HR suite noise.` |
| Canonical        | `https://www.simplerosterplus.com/` (also rewritten at runtime from `SRP_SITE_URL`)                                                          |
| Meta robots      | `index, follow`                                                                                                                              |
| OG / Twitter     | Present; image = `images/solution-attendance.png`                                                                                            |
| `lang`           | `en`                                                                                                                                         |


### H1 and H2 structure

**H1 (one only):**

> Build the weekly schedule and track attendance—in minutes.

**H2 sections (in document order):**

1. The weekly grind... Gone! (`#why`)
2. Three things done well (`#features`)
3. Set up once, then a fast weekly loop (`#how`)
4. Spreadsheets & group chats vs. Simple Roster Plus (`#compare`)
5. Simple plans for shift teams (`#pricing`)
6. Common questions (`#faq`)
7. Start free—or tell us about your team (`#contact`)
8. Your week's schedule and attendance—fast, simple, in one place. (`#cta-close`)

Heading order is **valid** (H1 → H2 → H3 within sections). No skipped levels observed.

### Opening paragraph (hero lead)

> Simple Roster Plus gives shift managers **one place** to publish the week's roster and see who was scheduled, who clocked in, and who needs attention—without payroll bloat or HR-suite noise.

### Main calls to action


| Label            | Target (after JS)                                                                         | Locations                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Start Free**   | `https://app.simplerosterplus.com/sign-up` (`.cta-signup`) OR `#contact` (`.cta-contact`) | Hero signup, header/footer/how/contact close → mixed paths |
| **Explore demo** | `https://app.simplerosterplus.com/sign-up?intent=demo`                                    | Hero, contact, cta-close                                   |
| **Log in**       | `https://app.simplerosterplus.com/login`                                                  | Header, footer, contact, cta-close                         |
| **Contact us**   | `#contact`                                                                                | Pro pricing card                                           |


**CTA model:** Gate 2 hybrid — self-serve signup and nurture-to-contact coexist (`landing-page/LANDING-PAGE.md`).

### Keyword focus vs draft SEO map


| Topic                                | Present on homepage? | Notes                                                             |
| ------------------------------------ | -------------------- | ----------------------------------------------------------------- |
| Employee roster / rostering software | Partial              | “roster” in body, features, compare; **not in title or H1**       |
| Employee scheduling software         | **Strong**           | H1, title, multiple sections                                      |
| Attendance tracking                  | **Strong**           | Title, features, FAQ                                              |
| Small business                       | Implicit             | “shift-based teams”, industry chips; no “small business” phrase   |
| Time clock                           | Partial              | “clock-ins”, “Try your clock free for 30 days” in pricing/contact |
| ZKTeco                               | Brief                | Trust badge, one feature bullet, FAQ answer                       |
| Leave / availability                 | **Absent**           | Not mentioned (product has leave in app)                          |
| Shift management                     | Partial              | “shift managers”, shift presets                                   |


### Positioning assessment


| Question                            | Assessment                                                                |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Clearly explains what SRP does?     | **Yes** — roster + attendance + plan vs actual                            |
| Roster-first?                       | **Partial** — H1 leads with **schedule**; roster is secondary in headline |
| Too vague?                          | **No** — concrete workflow and comparison table                           |
| Feature-heavy?                      | **Moderate** — three feature blocks, pricing, FAQ; still scannable        |
| Product-centric vs outcome-centric? | Balanced toward **manager outcomes** (minutes, exceptions, one place)     |
| Content in HTML (not JS-rendered)?  | **Yes** — all copy is server-deliverable static HTML                      |


### Internal links on homepage


| Type                 | Targets                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| Anchor links         | `#hero`, `#features`, `#pricing`, `#faq`, `#contact` (footer)                 |
| Legal                | `privacy.html`, `terms.html`                                                  |
| External app         | `app.simplerosterplus.com/login`, `/sign-up`, `/sign-up?intent=demo` (via JS) |
| Email                | `mailto:hello@simplerosterplus.com`                                           |
| Cross-page SEO links | **None** (no other landing pages exist)                                       |


---

## 5. Technical SEO findings

### Missing infrastructure

### No robots.txt

- **Severity:** High
- **Evidence:**
  - No `robots.txt` in `landing-page/` or repo root
- **Why it matters:** Search engines lack crawl guidance; sitemap location cannot be declared; future staging rules have no canonical file-based home.
- **Recommended action:** Add `landing-page/robots.txt` referencing sitemap URL; allow `/`; disallow nothing unless staging paths exist.
- **Implementation effort:** Small
- **Confidence:** High

### No sitemap.xml

- **Severity:** High
- **Evidence:**
  - No `sitemap.xml` anywhere in repo
  - Only 3 pages today, but SEO program assumes 8+ URLs
- **Why it matters:** New landing pages will not be discovered efficiently; no single URL inventory for Search Console.
- **Recommended action:** Add static or generated `sitemap.xml` listing all indexable marketing URLs with `<lastmod>`.
- **Implementation effort:** Small (static) / Medium (generated as pages grow)
- **Confidence:** High

### No structured data (JSON-LD)

- **Severity:** Medium
- **Evidence:**
  - Grep across `landing-page/` — no `application/ld+json`
  - FAQ section uses `<details>` but no FAQPage schema
- **Why it matters:** Misses rich-result eligibility (FAQ, organization, software product).
- **Recommended action:** Add Organization + WebSite on homepage; FAQPage on FAQ section; SoftwareApplication when product claims are finalized.
- **Implementation effort:** Medium
- **Confidence:** High

### Legal pages missing SEO metadata

- **Severity:** High
- **Evidence:**
  - `landing-page/privacy.html` — title only; no meta description, canonical, robots, OG
  - `landing-page/terms.html` — same
  - Both show visible placeholder: *“Replace with your legal privacy policy before collecting signups or running paid marketing.”*
- **Why it matters:** Thin/placeholder legal pages indexed alongside product site hurt trust; duplicate-title risk if expanded without unique descriptions.
- **Recommended action:** Finalize legal copy; add unique title/description/canonical per page; consider `noindex` until legal review complete **or** replace stubs before SEO launch.
- **Implementation effort:** Medium (legal + meta)
- **Confidence:** High

### Signup CTAs use relative URLs pre-JavaScript

- **Severity:** Medium
- **Evidence:**

```774:775:landing-page/index.html
            <a class="btn btn-primary btn-lg cta-signup" href="/sign-up" rel="noopener noreferrer">Start Free</a>
            <a class="btn btn-secondary btn-lg demo-cta" href="/sign-up?intent=demo" rel="noopener noreferrer">Explore demo</a>
```

- Rewritten at runtime (lines 1228–1229) to `https://app.simplerosterplus.com/sign-up`
- On `www.simplerosterplus.com`, raw href resolves to marketing host `/sign-up` — likely 404 unless undocumented Vercel rewrite exists
- **Why it matters:** Broken conversion path for no-JS users; crawler link equity may hit wrong host.
- **Recommended action:** Set `href` to full app URLs in HTML **or** document/verify marketing-host rewrite to app.
- **Implementation effort:** Small
- **Confidence:** Medium (404 on marketing host inferred, not live-tested)

### www vs apex canonical consistency

- **Severity:** Medium
- **Evidence:**
  - Homepage canonical: `https://www.simplerosterplus.com/`
  - CORS allow-list includes both `https://www.simplerosterplus.com` and `https://simplerosterplus.com` (`lib/marketing/contact.ts` lines 139–140)
  - Apex redirect behavior **not in repo**
- **Why it matters:** Duplicate indexing if both hosts serve 200 without redirect.
- **Recommended action:** Verify live 301 from apex → www (or reverse); document in deploy runbook.
- **Implementation effort:** Small (DNS/hosting config)
- **Confidence:** Low for live behavior — **cannot verify from repository**

### Legal back links use `index.html`

- **Severity:** Low
- **Evidence:** `privacy.html` line 19: `<a href="index.html">← Back to Simple Roster Plus</a>`
- **Why it matters:** Exposes `.html` URL variant; minor inconsistency with clean `/` homepage canonical.
- **Recommended action:** Link to `/` instead of `index.html`.
- **Implementation effort:** Small
- **Confidence:** High

### Present and correct (homepage)


| Check                                    | Status       | Evidence                                        |
| ---------------------------------------- | ------------ | ----------------------------------------------- |
| Viewport meta                            | ✅            | `width=device-width, initial-scale=1.0`         |
| Language                                 | ✅            | `<html lang="en">`                              |
| Favicon                                  | ✅            | `favicon.ico`, `favicon.svg`, apple-touch-icon  |
| Web manifest                             | ❌            | Not found                                       |
| Canonical (absolute HTTPS)               | ✅            | `https://www.simplerosterplus.com/`             |
| Meta robots (homepage)                   | ✅            | `index, follow`                                 |
| Open Graph                               | ✅            | type, site_name, title, description, url, image |
| Twitter cards                            | ✅            | `summary_large_image`                           |
| Multiple H1                              | ✅ None       | Single H1                                       |
| Duplicate titles across pages            | ✅ None       | Three unique titles                             |
| Duplicate meta descriptions              | N/A          | Only homepage has description                   |
| Image alt text                           | ✅            | All 6 `<img>` tags have descriptive alt         |
| Empty alt                                | ✅ None found |                                                 |
| Analytics scripts                        | ❌            | None (confirmed out of scope in `MAPPING.md`)   |
| Staging/localhost URLs in marketing HTML | ✅ None       | Production URLs in `SRP`_* constants            |
| Legacy vercel.app in marketing HTML      | ✅ None       | Only in app CORS defaults                       |


### Redirects and 404


| Item                | Repo evidence                                                        |
| ------------------- | -------------------------------------------------------------------- |
| Marketing redirects | **Not in repo**                                                      |
| Marketing 404 page  | **Not found**                                                        |
| App legacy redirect | `middleware.ts` — `simplerosterplus.vercel.app` → app canonical host |


---

## 6. Content and keyword-gap assessment

### Draft SEO page map vs current site


| Planned topic / URL                   | Primary keyword                                 | Current coverage                                               | Gap                                               |
| ------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| Homepage                              | employee roster software                        | Schedule/attendance positioning; “roster” in body not H1/title | **Expand homepage** + metadata retarget           |
| `/employee-scheduling-software`       | employee scheduling software                    | Strong homepage overlap                                        | **No dedicated page** — homepage partially covers |
| `/small-business-employee-scheduling` | employee scheduling software for small business | Implicit audience only                                         | **No page**                                       |
| `/employee-attendance-software`       | employee attendance software                    | Strong homepage section                                        | **No dedicated page** — could split or expand     |
| `/employee-time-clock-app`            | employee time clock app                         | “clock” language in pricing only                               | **No page**                                       |
| `/zkteco-attendance-integration`      | ZKTeco attendance software                      | 3 brief mentions                                               | **No page** — high-intent gap                     |
| `/employee-leave-and-availability`    | employee leave management software              | **Not on marketing site**; exists in app                       | **No page**                                       |
| `/shift-management-software`          | shift management software                       | Overlaps scheduling                                            | **Defer** — likely duplicates scheduling page     |
| `/resources` hub + templates/guides   | long-tail informational                         | **None**                                                       | **No content program**                            |


### Topics mentioned only briefly

- **ZKTeco** — badge, one bullet, FAQ sentence
- **Leave / availability** — absent from marketing (present in app: `lib/leave-blocks.ts`, day-off/vacation APIs)
- **Time clock** — “Try your clock free” pricing line only
- **Small business** — implied via industries, not keyword-targeted
- **WhatsApp / spreadsheet pain** — comparison section and FAQ, good for narrative SEO but not keyword-targeted pages

### Potential duplicate / cannibalization


| Keyword groups                                                                | Recommendation                                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| employee scheduling software vs shift management software vs staff scheduling | **One scheduling page** + homepage support; defer separate shift-management URL unless content diverges (e.g. multi-site shift swaps) |
| employee attendance software vs employee time clock app                       | **Separate pages justified** if time-clock page focuses on device/punch capture and attendance page on plan-vs-actual reporting       |
| homepage vs `/employee-scheduling-software`                                   | Homepage should own **roster** head term; scheduling page owns **scheduling** modifiers to avoid H1/title collision                   |
| small business scheduling vs generic scheduling                               | **Section or FAQ on scheduling page** first; standalone URL only if unique proof points (pricing, limits, 10-staff free tier)         |


### Homepage topic breadth

The homepage currently targets **scheduling + attendance + manager speed** in one URL. It does **not** yet target the draft primary keyword **“employee roster software”** in title/H1. For the planned page map, the homepage is **trying to cover too many intents in one URL** once dedicated pages launch — acceptable **only until** satellite pages exist and homepage metadata is refocused on roster-first head terms.

### Expand vs create new


| Action              | Rationale                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Expand homepage** | Add roster-first headline/meta alignment; strengthen roster vocabulary without duplicating future scheduling page |
| **Create new**      | ZKTeco integration (unique intent, needs device/limitation detail), resources hub, attendance vs time-clock split |
| **Defer**           | Shift management standalone page                                                                                  |


---

## 7. Navigation and internal-linking assessment

### Header navigation

- Logo → `#hero`
- **Log in** → app login (absolute URL)
- **Start Free** → `#contact` (`.cta-contact`) — **not** direct signup

**No** header links to Features, Pricing, FAQ, or future product pages. **No** mobile hamburger menu — only two header actions (acceptable at current scale).

### Footer navigation

- `#features`, `#pricing`, `#faq`, `#contact` (Start Free)
- `privacy.html`, `terms.html`
- **Log in**

### Reachability


| Page                  | Reachable from homepage?        |
| --------------------- | ------------------------------- |
| Homepage              | —                               |
| privacy.html          | ✅ Footer                        |
| terms.html            | ✅ Footer                        |
| All homepage sections | ✅ Footer anchors + in-page CTAs |


**Orphan pages:** None (all 3 pages linked).

### Product hierarchy in navigation

Navigation reflects a **single-page funnel**, not a product hierarchy (Roster → Scheduling → Attendance → Integrations → Resources). Footer anchors map to **conversion sections**, not SEO topic clusters.

### Attendance prominence

Attendance is **co-equal** with scheduling in H1/title and feature block #2. For roster-first positioning, attendance is **slightly over-weighted in the headline** relative to product strategy — but appropriately supported as a differentiator (plan vs actual).

### ZKTeco in navigation

ZKTeco appears as a **trust badge and feature bullet**, not a dedicated integration nav item. No unsupported “all devices” claim on the live page — but **“ZKTeco-ready” is undefined** without a linked integration page.

### Internal linking opportunities (for SEO implementation)

1. Footer **Product** column: Scheduling, Attendance, ZKTeco integration, Resources
2. Contextual links from FAQ “Can we connect clock-in hardware?” → future ZKTeco page
3. Comparison section → scheduling page (“Build the roster” row)
4. Breadcrumbs on child pages → homepage
5. Resources hub → template downloads (lead magnets)

---

## 8. ZKTeco compatibility findings

### Claims visible on the marketing website


| Location       | Claim                                                                |
| -------------- | -------------------------------------------------------------------- |
| Hero trust row | `ZKTeco-ready`                                                       |
| Features block | `Works with ZKTeco terminals`                                        |
| FAQ            | `Yes—many teams use terminals (including ZKTeco) alongside the app.` |
| Contact form   | Field: “Using ZKTeco (or similar) today?”                            |


**Not found on live marketing HTML:** universal compatibility, BioTime, ZKBio, specific model lists, ADMS protocol name, setup steps.

**Draft copy in `MAPPING.md` (not live):** more aggressive ZKTeco-forward headlines and “We configure your terminal” — **do not treat as published claims**.

### Functionality confirmed in application code / docs


| Capability                                    | Evidence                                                                                                 | Confirmed?                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| ADMS push ingest (`/iclock/`*)                | `lib/zk-iclock-push.ts`, `docs/device-ingest/STATUS.md` (step 01 complete)                               | **Yes**                              |
| F22-first field testing                       | `docs/DEVICE_INGEST_FIELD_TEST.md`, `docs/device-ingest/step-01-adms-ingest-port.md`                     | **Yes** (primary test device)        |
| Serial-number device identification (ADMS v1) | `docs/device-ingest/step-01-adms-ingest-port.md` — SN only, no comm key required                         | **Yes**                              |
| Fingerprint verify method stored              | `prisma/migrations/20260514093000_attendance_verify_method/migration.sql`                                | **Yes**                              |
| Default connection mode ADMS push             | `prisma/migrations/20260513210000_device_zkteco_fields/migration.sql` — default `adms_push`              | **Yes**                              |
| Pull TCP (LAN SDK)                            | Enum exists; `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` — **ADMS-only for cloud MVP**; UI hidden/advanced | **Deferred, not MVP**                |
| Windows agent / port 4370 pull                | Documented in pull TCP decision — not cloud MVP                                                          | **Not verified as marketed feature** |
| All ZKTeco models                             | **No evidence** of universal support                                                                     | **Cannot claim**                     |


### Comments / placeholders

- `app/components/add-device-drawer.tsx` — UI copy “Add a ZKTeco terminal”; pairing checklist for ADMS
- `app/api/devices/route.ts` — “Optional on many F22 units” re comm key
- `lib/marketing/contact.ts` — captures `hasZkteco` on form submissions

### Marketing vs product truth gap

The site says **“ZKTeco-ready”** and **“Works with ZKTeco terminals”** without specifying:

- ADMS push protocol (not pull TCP for cloud)
- Tested/reference device (F22 in docs)
- Firmware/menu requirements (ATTLOG, HTTPS 443, hyphen-free hostname)
- Models **not** supported

**Risk:** Reasonable for partnership SEO **after** a dedicated integration page scopes claims; current copy is **broad but not explicitly false** — insufficient for high-intent “ZKTeco attendance software” SEO.

---

## 9. Conversion-path findings

### Conversion elements inventory


| Element           | Destination                                    | Wording         |
| ----------------- | ---------------------------------------------- | --------------- |
| `.cta-signup`     | `SRP_APP_SIGNUP_URL` → `/sign-up`              | Start Free      |
| `.cta-contact`    | `#contact`                                     | Start Free      |
| `.demo-cta`       | `/sign-up?intent=demo`                         | Explore demo    |
| Log in (×4 IDs)   | `/login`                                       | Log in          |
| Pro plan          | `#contact`                                     | Contact us      |
| Contact form POST | `SRP_MARKETING_API` → `/api/marketing/contact` | Send my request |
| Email             | `hello@simplerosterplus.com`                   | mailto          |


### Path clarity

**Mostly clear:** Free tier, demo, and login are repeated across hero, contact, and closing band. Hybrid model means **“Start Free” in header/footer routes to contact**, while hero/closing **Start Free** routes to signup — **same label, two paths** (documented in `MAPPING.md`).

### Issues

### Inconsistent “Start Free” destination

- **Severity:** Medium
- **Evidence:** `.cta-signup` → app signup; `.cta-contact` → `#contact` — both labeled “Start Free”
- **Why it matters:** SEO landing tests and ad QA may measure wrong funnel step; user expectation mismatch.
- **Recommended action:** Document as intentional hybrid **or** differentiate labels (“Start Free” vs “Talk to us”) before paid traffic.
- **Implementation effort:** Small
- **Confidence:** High

### No conversion analytics

- **Severity:** Medium
- **Evidence:** `landing-page/MAPPING.md` line 11: “Out of scope for now: Analytics / conversion tracking”; no gtag/plausible in HTML
- **Why it matters:** SEO implementation cannot measure CTA performance or form completion.
- **Recommended action:** Add privacy-preserving analytics before paid acquisition; document in cookie policy.
- **Implementation effort:** Small–Medium
- **Confidence:** High

### Contact form depends on cross-origin API + CORS

- **Severity:** Low–Medium
- **Evidence:** `fetch(marketingApi)` to app host; CORS via `marketingAllowedOrigins()` in `lib/marketing/contact.ts`
- **Why it matters:** New marketing domains (staging, alternate apex) must be added to `MARKETING_ALLOWED_ORIGINS` or form fails with 403.
- **Recommended action:** Document env var for new hosts during SEO staging.
- **Implementation effort:** Small
- **Confidence:** High

### Pricing claims vs app

Free tier, Plus $19.99, Pro $49.99 align with `docs/PRICING.md`. **Auto Scheduler** and **SMS publish** marked coming soon on page — matches `LANDING-PAGE.md` ship status. **No broken placeholder CTAs** (form is wired, not `alert()`).

---

## 10. Performance and accessibility observations

*Code-level only — no Lighthouse run performed.*

### Oversized images


| File                                  | Size         | Used on live page?               |
| ------------------------------------- | ------------ | -------------------------------- |
| `solution-attendance@2x.png`          | **2,699 KB** | ✅ Hero srcset                    |
| `solution-attendance.png`             | **1,382 KB** | ✅ Hero + feature                 |
| `pain-before-workflow.png`            | **1,793 KB** | ❌ Not referenced in `index.html` |
| `hero-weekly-schedule-attendance.png` | **1,309 KB** | ❌ Not referenced                 |
| `solution-auto-scheduler.png`         | **1,342 KB** | ✅ Feature block                  |
| `app-roster-week@2x.png`              | **727 KB**   | ❌ Not referenced (1x used)       |


### Render-blocking resources

- Google Fonts CSS from `fonts.googleapis.com` — **render-blocking** `<link rel="stylesheet">` (no `media` trick or `font-display` in URL beyond Google's default)
- Large inline CSS in `<head>` — blocks first paint (~62 KB HTML)

### JavaScript

- Minimal inline JS (~80 lines) — **no frameworks**
- No unused libraries on marketing site

### Image attributes

- Hero: `width`, `height`, `fetchpriority="high"`, `decoding="async"`, responsive `srcset`
- Feature images: `width`, `height`, `loading="lazy"`
- Logo images: `width`, `height`, `srcset`

### Accessibility positives

- Skip link to `#main`
- `aria-labelledby` on sections
- Form fields have `<label for=...>`
- Focus-visible styles on buttons/links
- `prefers-reduced-motion` disables hero float animation
- Comparison table uses `role="table"` with column headers

### Accessibility / UX risks


| Issue                                      | Severity | Notes                                 |
| ------------------------------------------ | -------- | ------------------------------------- |
| FAQ `<details open>` on first item         | Low      | One open by default — fine            |
| Decorative hero chips `aria-hidden="true"` | OK       | Correct                               |
| No web manifest / installable PWA          | Low      | Not required for SEO                  |
| Header sticky + no section nav on mobile   | Low      | Long page — consider jump links later |


---

## 11. Hosting-migration considerations

### Hosting-independent (portable)

- All HTML, CSS, images, favicons in `landing-page/`
- Absolute canonical/OG URLs (configurable via `SRP_SITE_URL` script)
- Meta tags in source
- Contact form API is on app host — marketing site stays static anywhere

### Vercel-dependent or undocumented


| Behavior                                   | Risk on migration                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| No `vercel.json` in repo                   | Clean URLs, redirects, headers unknown — **must export from Vercel dashboard** before move |
| Root Directory = `landing-page/` (assumed) | Other hosts need equivalent publish path                                                   |
| HTTPS / CDN                                | Any static host works                                                                      |
| Form CORS                                  | Must update `MARKETING_ALLOWED_ORIGINS` if marketing domain changes                        |
| Apex/www redirects                         | DNS/hosting config — not in repo                                                           |


### URLs that should remain stable

- `https://www.simplerosterplus.com/` (homepage canonical)
- `https://app.simplerosterplus.com/sign-up`, `/login`, `/sign-up?intent=demo`
- `https://app.simplerosterplus.com/api/marketing/contact`
- Future SEO paths once published (avoid renaming `/employee-scheduling-software` etc.)

### Document before migration

1. Vercel project settings (root dir, domains, redirects, clean URLs)
2. `SRP_`* URL constants in `index.html`
3. `MARKETING_ALLOWED_ORIGINS` env on app deployment
4. DNS: apex, www, app, admin subdomains

---

## 12. Recommended next steps

Grouped by implementation phase. See **Final summary table** for prioritized view.

### Fix before writing SEO content

1. Add `robots.txt` and `sitemap.xml`
2. Resolve legal placeholder pages (finalize or temporary `noindex`)
3. Fix signup/demo hrefs to absolute app URLs in HTML
4. Decide and verify **www vs apex** redirect policy
5. Decide homepage keyword focus: **roster-first** vs current schedule-first H1
6. Document Vercel/hosting routing assumptions

### Fix while implementing the homepage

1. Retitle/rewrite meta for primary keyword map (when copy approved)
2. Add JSON-LD (Organization, WebSite, FAQPage)
3. Add footer product links scaffold for future pages
4. Optimize hero/feature images (WebP/AVIF, right-size @2x)
5. Add unique meta to legal pages

### Fix while creating landing pages

1. Create shared head/footer partial or copy template to reduce duplication
2. Publish ZKTeco integration page with ADMS/F22 scope from docs
3. Launch scheduling vs attendance split per cannibalization plan
4. Build `/resources` hub last (content-heavy)
5. Expand sitemap; add breadcrumbs and cross-links

### Later improvements

1. Analytics / conversion tracking
2. Web manifest
3. Custom 404 page
4. Split CSS to external cached file
5. Self-host fonts
6. hreflang (only if multi-region)

---

## Final summary table


| Priority                             | Action                                                    | Reason                                      | Relevant files                    | Effort | Dependency                 |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------- | --------------------------------- | ------ | -------------------------- |
| **Fix before SEO content**           | Add `robots.txt` + `sitemap.xml`                          | Crawl/discovery baseline missing            | `landing-page/`                   | Small  | None                       |
| **Fix before SEO content**           | Finalize or `noindex` legal stubs                         | Placeholder text indexed; trust risk        | `privacy.html`, `terms.html`      | Medium | Legal review               |
| **Fix before SEO content**           | Use absolute app URLs in signup/demo `href`               | Pre-JS broken links on marketing host       | `index.html`                      | Small  | None                       |
| **Fix before SEO content**           | Verify apex ↔ www 301 redirects                           | Duplicate content risk                      | DNS/Vercel (not in repo)          | Small  | Hosting access             |
| **Fix before SEO content**           | Decide homepage primary keyword (roster vs schedule)      | Drives H1, title, page map                  | `index.html`, SEO brief           | Small  | Product/marketing decision |
| **Fix before SEO content**           | Export/document Vercel routing settings                   | Migration + clean URL behavior unknown      | Vercel dashboard                  | Small  | Hosting access             |
| **Fix while implementing homepage**  | Retarget title/H1/meta to roster-first + supporting terms | Gap vs “employee roster software” map       | `index.html`                      | Medium | Keyword decision           |
| **Fix while implementing homepage**  | Add JSON-LD (Org, WebSite, FAQPage)                       | Rich results                                | `index.html`                      | Medium | Copy finalized             |
| **Fix while implementing homepage**  | Compress/convert hero images to WebP                      | 1.4–2.7 MB PNGs hurt LCP                    | `landing-page/images/`            | Medium | None                       |
| **Fix while implementing homepage**  | Add meta description + canonical to legal pages           | Incomplete head metadata                    | `privacy.html`, `terms.html`      | Small  | Legal finalized            |
| **Fix while creating landing pages** | Create ZKTeco integration page with ADMS/F22 limits       | High-intent keyword; claim safety           | New HTML + `docs/DEVICE_INGEST_`* | Large  | Device documentation       |
| **Fix while creating landing pages** | Add scheduling page; defer shift-management duplicate     | Cannibalization control                     | New HTML                          | Large  | Homepage focus set         |
| **Fix while creating landing pages** | Introduce HTML head/footer template pattern               | 3+ pages — manual duplication unsustainable | `landing-page/`                   | Medium | Page list approved         |
| **Fix while creating landing pages** | Footer + contextual internal links                        | Site architecture + PageRank flow           | All marketing HTML                | Medium | Pages exist                |
| **Later**                            | Add analytics                                             | Measure SEO/CTA ROI                         | `index.html`, privacy policy      | Medium | Privacy policy             |
| **Later**                            | Custom 404 + remove unused image assets                   | UX + deploy weight                          | `landing-page/`                   | Small  | None                       |
| **Later**                            | `/resources` template hub                                 | Long-tail SEO                               | New pages                         | Large  | Content creation           |


---

## Appendix A — ZKTeco search reference index (repository)

Key files for integration page authors (not exhaustive):


| Path                                                    | Relevance                        |
| ------------------------------------------------------- | -------------------------------- |
| `docs/DEVICE_INGEST_FIELD_TEST.md`                      | F22 setup, ADMS menu, ATTLOG     |
| `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`               | ADMS-only MVP; pull TCP deferred |
| `docs/device-ingest/step-01-adms-ingest-port.md`        | ADMS port, SN-only auth          |
| `docs/device-ingest/step-04-devices-ui-truthfulness.md` | UI truthfulness, F22 checklist   |
| `lib/zk-iclock-push.ts`                                 | Ingest implementation            |
| `app/iclock/`*                                          | ADMS routes                      |
| `app/components/add-device-drawer.tsx`                  | Terminal pairing UX              |
| `landing-page/index.html`                               | Current marketing claims         |
| `landing-page/MAPPING.md`                               | Draft (non-live) ZKTeco copy     |


---

## Appendix B — Information not verifiable from repository

The following were **not confirmed** in this audit:

- Live DNS records and redirect chains (`www` vs apex vs `app.`)
- Vercel project Root Directory, clean URLs, and redirect rules (no `vercel.json`)
- Whether production HTML matches current `main` branch
- Lighthouse / Core Web Vitals scores
- Search Console indexing status
- Whether `www.simplerosterplus.com/sign-up` 404s (marketing-host relative href)
- Live form submission success in production (API exists; env vars not inspected)
- Exact list of ZKTeco models/firmware versions supported beyond F22-first documentation

---

*End of audit.*