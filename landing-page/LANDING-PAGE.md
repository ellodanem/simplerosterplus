# Simple Roster Plus — Landing page (canonical)

**This is the main marketing landing page for the product.** All landing-page work, copy, assets, and deploys should target this directory unless explicitly noted otherwise.

| | |
|---|---|
| **Canonical path** | `srp/landing-page/` |
| **Entry file** | `index.html` |
| **Related** | `privacy.html`, `terms.html`, `favicon.svg`, `MAPPING.md` |
| **Legacy / experiment** | `landing page/` at repo sibling path — see [Two copies](#two-copies) below |

---

## Current configuration (`srp/landing-page/index.html`)

What is live in the canonical page today.

### Conversion model (Gate 2 hybrid — Step 11)

Self-serve signup and demo sandbox are live in the app. The landing page uses **one label, two paths**.

| Item | Value |
|------|--------|
| Primary CTA label | **Start Free** (everywhere) |
| **Self-serve** (`cta-signup`) | `/sign-up` — hero, `#contact` panel, `#cta-close` |
| **Nurture** (`cta-contact`) | `#contact` — header, how-it-works, footer |
| Secondary CTA | **Explore demo** (`demo-cta`) → `/sign-up?intent=demo` — hero, how-it-works, `#contact`, `#cta-close` |
| Contact section | `#contact` — self-serve buttons + optional form for hand-onboard / multi-site |
| Form backend | `POST` to `SRP_MARKETING_API` (`/api/marketing/contact`) |
| Log in | App `/login` (Clerk when configured) |

URL wiring: `SRP_APP_SIGNUP_URL`, `SRP_APP_DEMO_URL`, `SRP_APP_LOGIN_URL` in page script. Classes `cta-signup` and `demo-cta` are rewritten on load; `cta-contact` stays on `#contact`.

See `MAPPING.md` for section-level CTA map.

### Page structure (current — 2026 modern redesign)

Full rebuild for a leaner, more modern feel (tip: *simple is better*). Only the H1 copy was retained verbatim; everything else was redesigned. Reference review: [roapp.io](https://roapp.io/roster-management/) (clean benefit blocks, honest free-trial line), [rosterelf.com](https://www.rosterelf.com/) (spreadsheets-vs-software comparison), [shifton.com](https://shifton.com/) (problem→fix "why switch", floating hero status chips, 4-step how-it-works).

1. Header — Log in · Start Free (`#contact`), glass bar with scroll shadow (`is-scrolled`)
2. `#hero` — retained H1, gradient + grid backdrop, dual CTA, checkmark trust row, `solution-attendance.png` + `@2x` with floating status chips (`.hero-chip`)
3. `.context-strip` — "Built for shift-based teams in" industry chips
4. `#why` — "Why managers switch": three problem→fix cards (Shifton-style)
5. `#features` — three alternating image/text rows (`app-roster-week.png`, `solution-attendance.png`, `solution-auto-scheduler.png`) + Start Free
6. `#how` — four numbered steps + Start Free
7. `#compare` — spreadsheets & chats vs Simple Roster Plus table (RosterElf-style, stacks on mobile)
8. `#pricing` — Free / Plus / Pro plan grid + footnote
9. `#faq` — single-column accordions (support-card column removed)
10. `#contact` — self-serve CTAs + collapsible contact form (`<details class="contact-toggle">`) + pricing line
11. `#cta-close` — Start Free + Explore demo (dark emerald band)
12. Footer

**Removed in redesign (simplicity):** `#audience` cards, separate `#pain`/`#dream` sections (folded into `#why`), `#in-action` four-slide carousel + its JS, FAQ support-card column. CTA classes (`cta-signup`/`cta-contact`/`demo-cta`), login IDs, `SRP_*` config, and the `#contact` form backend are all preserved.

### SEO and head (canonical only)

- `canonical`, `og:*`, `twitter:*`, `robots`
- `og:image` / `twitter:image` → `images/solution-attendance.png`
- `favicon.svg`
- `SRP_SITE_URL`, `SRP_MARKETING_API`, `SRP_APP_SIGNUP_URL`, `SRP_APP_DEMO_URL` in page script

### Terminology (canonical page)

- Customer-facing copy does **not** use “AI”.
- Product feature is **Auto Scheduler** (capitalized in headings, pricing, FAQ).
- Solution block 3 uses `solution-auto-scheduler.png`.
- FAQ: “How does Auto Scheduler help?”
- **Coming soon (Jul 2026):** Auto Scheduler and SMS roster publish are labeled with `.soon-tag` badges on the live page until they ship in the app (`lib/auto-scheduler-feature.ts`). Do not imply they are live in marketing copy.
- **Available today:** weekly roster, copy last week, publish + share link/print, attendance week view, ZKTeco ADMS ingest, weekly exception summary on Home.

### Coming-soon UI (`.soon-tag`)

Amber pill badge used on hero trust row, feature headings, pricing bullets, comparison table, and FAQ. Clock icon replaces checkmark for coming-soon hero trust item (`.hero-trust li.is-soon`). Pricing list items use `.plan-features li.is-soon` with clock-style bullet.

### Images (canonical page references)

| File | Used in |
|------|---------|
| `images/solution-attendance.png` | Hero, solution block 2, carousel |
| `images/solution-attendance@2x.png` | Hero srcset |
| `images/pain-before-workflow.png` | Pain |
| `images/app-roster-week.png` | Solution block 1, carousel |
| `images/app-roster-week@2x.png` | Available for retina srcset |
| `images/solution-auto-scheduler.png` | Solution block 3, carousel |

---

## Two copies

There are **two** landing page directories in the repo. Only **`srp/landing-page/`** is canonical.

| | **`srp/landing-page/`** *(canonical)* | **`landing page/`** *(session experiment)* |
|--|--------------------------------------|---------------------------------------------|
| **Role** | Production marketing + Gate 2 hybrid funnel | Source mockup (13 Jun 2026); **ported into canonical** |
| **CTA** | Start Free → `/sign-up` or `#contact` + Explore demo | Was Start Free Trial → `/login` |
| **Contact form** | Yes (`#contact`) | No |
| **Demo CTA** | Yes | No |
| **Pricing** | `#pricing` grid + contact pricing line | Same grid (source) |
| **Audience** | `#audience` cards + chips | Same (source) |
| **In action** | `#in-action` carousel | Same (source) |
| **Hero image** | `solution-attendance.png` + `@2x` | Same |
| **SEO meta** | Yes | No |

The sibling `landing page/` folder is retained as a design reference only. **Do not deploy it**—ship `srp/landing-page/`.

### Experiment features — port status (June 2026)

| Feature | Status |
|---------|--------|
| `#audience` cards | ✅ Ported |
| `#in-action` carousel | ✅ Ported |
| `#pricing` grid | ✅ Ported |
| Hero attendance image + `@2x` + bleed layout | ✅ Ported |
| `solution-auto-scheduler.png` | ✅ Ported |
| `app-roster-week.png` | ✅ Ported |
| FAQ support cards | ✅ Ported |
| Section accent bars | ✅ Ported |
| Gate 2 hybrid CTAs (`cta-signup`, `cta-contact`, `demo-cta`) | ✅ Ported |
| `#contact` self-serve + form | ✅ Ported |
| SEO head + `SRP_*` URL wiring | ✅ Ported |

### Legacy experiment notes (historical)

---

## Session work log — 13 June 2026

Summary of work done in chat against the **experiment** copy (`landing page/`). Use this when porting features into the canonical page.

### Motivation

- UI review of [distilbook.com](https://distilbook.com/) informed layout direction (not a clone): product screenshot hero, audience cards, scenario proof, FAQ support row, single closing CTA.
- Full-page mockup generated, then implemented in `landing page/index.html`.
- User provided real app roster screenshot; generated missing section images.
- Terminology shifted from **AI** to **Auto Scheduler**.

### Experiment page structure (session target)

1. Header — Log in · Start Free Trial  
2. `#hero`  
3. `#audience`  
4. `#pain`  
5. `#dream`  
6. `#solution`  
7. `#in-action` (carousel)  
8. `#how-it-works`  
9. `#pricing`  
10. `#faq` (+ support cards)  
11. `#cta-close`  
12. Footer  

### Session copy highlights

- **H1:** “Build the weekly schedule and track attendance—in minutes.” *(same on both copies)*
- **Hero meta:** “No credit card · Up and running in minutes”
- **CTA:** Start Free Trial (experiment only)
- **Dream H2:** “A fast weekly rhythm you can actually keep”
- **How it works H2:** “Four steps, then a fast weekly loop”
- **In action:** Monday morning · Mid-shift · Friday close · New hire week

### Session images generated

| File | Description |
|------|-------------|
| `hero-weekly-schedule-attendance.png` | Early generated weekly grid mockup |
| `pain-before-workflow.png` | Laptop spreadsheet + phone shift chat |
| `solution-attendance.png` | Attendance week view (on time / late / absent) |
| `solution-attendance@2x.png` | 2× retina upscale for hero |
| `solution-auto-scheduler.png` | Home + Auto Scheduler + exceptions |
| `app-roster-week.png` | Real app roster screenshot (user-provided) |
| `app-roster-week@2x.png` | 2× upscale |
| `landing-page-full-mockup*.png` | Design reference mockups |
| `landing-page-screenshot.png` | Playwright capture of experiment page |

### Session UI / JS

- Wider hero (`max-width: 1280px`), ~40/60 copy/visual split, right-edge bleed
- Scenario carousel: `data-scenario-carousel`, prev/next, dots, one slide per view
- FAQ two-column layout with support cards
- Vanilla JS only; no dependencies

### Hero image evolution (experiment)

1. `hero-weekly-schedule-attendance.png` (generated mockup)  
2. `app-roster-week.png` (real roster)  
3. **`solution-attendance.png`** + `@2x` srcset (final experiment hero)

---

## Terminology standard (all future work)

| Use | Avoid |
|-----|--------|
| **Auto Scheduler** (product feature name) + **Coming soon** when not shipped | Implying Auto Scheduler is live today |
| **SMS roster publish** + **Coming soon** when not shipped | Promising automated SMS on publish |
| Share link + print (available today) | Screenshots & texts only (understate what ships) |
| the auto scheduler (in running prose, if lowercase fits) | chatbot hype |
| managers, weekly schedule, attendance in minutes | enterprise HR, payroll suite |
| Honest scope (roster + attendance) | fake testimonials, fake logos |

When editing **canonical** `index.html`, prefer capitalized **Auto Scheduler** for headings, pricing bullets, and FAQ titles. Rename `solution-ai-assist.png` to `solution-auto-scheduler.png` when the asset is swapped.

---

## Follow-ups (canonical backlog)

| Priority | Item | Status |
|----------|------|--------|
| — | Distillbook experiment port (audience, carousel, pricing, hero, images) | ✅ Done Jun 2026 |
| Low | Custom domain (`simplerosterplus.com`) — update `SRP_SITE_URL` + canonical URLs | Open |
| Low | Real customer logos / testimonials when available | Open |
| Later | Analytics / conversion tracking (MVP Step 10) | Deferred |
| Low | Native 2× app screenshots (replace upscaled assets) | Open |
| Low | Carousel swipe on mobile | Open |

---

## File inventory (`srp/landing-page/images/`)

```
app-roster-week.png
app-roster-week@2x.png
hero-weekly-schedule-attendance.png
landing-page-full-mockup.png
landing-page-full-mockup-lower.png
landing-page-full-mockup-upper.png
landing-page-screenshot.png
pain-before-workflow.png
solution-ai-assist.png          (legacy filename)
solution-attendance.png
solution-attendance@2x.png
solution-auto-scheduler.png
```

Legacy filenames (`solution-ai-assist.png`, `hero-weekly-schedule-attendance.png`) may remain in the folder but are no longer referenced by canonical `index.html`.

---

## For agents and contributors

- **Always edit** `srp/landing-page/` for landing page work.
- Read this file + `MAPPING.md` before structural changes.
- Positioning lens: `srp/.cursor/rules/simple-roster-plus-positioning.mdc`
- Do not treat `landing page/` as deploy source unless explicitly merging an experiment.

---

*Last updated: 10 July 2026 — Auto Scheduler and SMS roster publish marked **Coming soon** on live page (hero, features, pricing, FAQ, footer); share link + print called out as available today.*
