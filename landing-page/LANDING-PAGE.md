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

### Page structure (current)

1. Header — Log in · Start Free  
2. `#hero` — H1, Start Free + Explore demo, badges, hero image  
3. `#trust` — industry workplace chips  
4. `#pain` — problem questions + `pain-before-workflow.png`  
5. `#dream` — three outcome cards  
6. `#solution` — three feature blocks + scope aside  
7. `#social-proof` — feature list + “What you get from a typical setup”  
8. `#how-it-works` — four numbered steps  
9. `#faq` — accordions  
10. `#contact` — self-serve CTAs + optional contact form + pricing line  
11. `#cta-close` — Start Free + Explore demo  
12. Footer  

### SEO and head (canonical only)

- `canonical`, `og:*`, `twitter:*`, `robots`
- `favicon.svg`
- `SRP_SITE_URL`, `SRP_MARKETING_API`, `SRP_APP_SIGNUP_URL`, `SRP_APP_DEMO_URL` in page script

### Terminology (canonical page)

- Customer-facing copy does **not** use “AI”.
- Product feature is referred to as **the auto scheduler** (lowercase in body copy today).
- **Preferred branding going forward:** **Auto Scheduler** (capitalized product name)—align copy when editing.
- Solution block 3 heading: “Clear summaries, not HR bloat” (not “Auto Scheduler keeps it fast and simple”).
- FAQ: “How does the auto scheduler help?” — includes honest “rule-based today, not a chatbot” line.

### Images (canonical page references)

| File | Used in |
|------|---------|
| `images/hero-weekly-schedule-attendance.png` | Hero |
| `images/pain-before-workflow.png` | Pain |
| `images/solution-schedule-builder.png` | Solution block 1 |
| `images/solution-attendance.png` | Solution block 2 |
| `images/solution-ai-assist.png` | Solution block 3 *(filename legacy; content is exception summary)* |

Image assets may live under `srp/landing-page/images/` when deployed; some were generated in the sibling `landing page/images/` folder during the June session—copy across when building/deploying from canonical.

---

## Two copies

There are **two** landing page directories in the repo. Only **`srp/landing-page/`** is canonical.

| | **`srp/landing-page/`** *(canonical)* | **`landing page/`** *(session experiment)* |
|--|--------------------------------------|---------------------------------------------|
| **Role** | Production-oriented; early-access funnel | Mockup implementation from 13 Jun 2026 chat |
| **CTA** | Start Free → `#contact` / `/sign-up` | Start Free Trial → `/login` |
| **Contact form** | Yes (`#contact`) | No |
| **Demo CTA** | Yes | No |
| **Pricing** | Line in contact + FAQ | Full `#pricing` grid (Free / Plus / Pro) |
| **Audience section** | `#trust` (chips only) | `#audience` (two manager cards + chips) |
| **Social proof** | `#social-proof` + setup includes | Removed |
| **In action** | — | `#in-action` carousel (1 slide per view) |
| **Hero image** | `hero-weekly-schedule-attendance.png` | `solution-attendance.png` + `@2x` srcset |
| **Hero layout** | Standard 50/50 grid | Larger visual, right bleed, retina |
| **Auto Scheduler** | lowercase “auto scheduler” | **Auto Scheduler** branded |
| **SEO meta** | Yes | No |
| **Session doc** | This file | `CHANGES-2026-06-13.md` (points here) |

### What carried over between copies

Only partial overlap:

- `pain-before-workflow.png` — both use it in `#pain`
- `solution-attendance.png` — canonical solution block 2; experiment also uses it in hero + carousel

Everything else from the session experiment is **not** in the canonical page yet.

### What the session experiment added (not yet in canonical)

| Feature | Notes |
|---------|--------|
| `#audience` | Single-site vs multi-site cards + use-case chips |
| `#in-action` carousel | Four scenarios, prev/next, dots, one card per slide |
| `#pricing` grid | Three plan cards with feature lists |
| Hero attendance image | `solution-attendance.png` + `@2x`, larger hero layout |
| `solution-auto-scheduler.png` | Solution block 3 + carousel |
| `app-roster-week.png` | Real roster screenshot in solution + carousel |
| FAQ support cards | Email, ZKTeco, pricing links beside accordions |
| Single closing CTA | Merged `#get-started` into `#cta-close` |
| Section accent bars | Gradient underline under headings |
| Pain list styling | `?` circle bullets |

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
| **Auto Scheduler** (product feature name) | AI, AI assist, AI-powered |
| the auto scheduler (in running prose, if lowercase fits) | chatbot hype |
| managers, weekly schedule, attendance in minutes | enterprise HR, payroll suite |
| Honest scope (roster + attendance) | fake testimonials, fake logos |

When editing **canonical** `index.html`, prefer capitalized **Auto Scheduler** for headings, pricing bullets, and FAQ titles. Rename `solution-ai-assist.png` to `solution-auto-scheduler.png` when the asset is swapped.

---

## Follow-ups (canonical backlog)

Port from experiment or polish canonical:

| Priority | Item |
|----------|------|
| High | Port `#in-action` carousel into canonical page |
| High | Port `#audience` cards (replace or augment `#trust`) |
| High | Hero: `solution-attendance.png` + larger layout + `@2x` |
| Medium | Replace `solution-ai-assist.png` with `solution-auto-scheduler.png` |
| Medium | Use `app-roster-week.png` in solution block 1 |
| Medium | Align Auto Scheduler capitalization across canonical copy |
| Low | `#pricing` grid vs keep pricing in contact (decide at Gate 2) |
| Low | FAQ support cards |
| Low | Native 2× app screenshots (replace upscaled assets) |
| Low | Carousel swipe on mobile |

---

## File inventory (experiment `landing page/images/`)

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
solution-schedule-builder.png
```

Copy needed assets into `srp/landing-page/images/` when implementing in canonical.

---

## For agents and contributors

- **Always edit** `srp/landing-page/` for landing page work.
- Read this file + `MAPPING.md` before structural changes.
- Positioning lens: `srp/.cursor/rules/simple-roster-plus-positioning.mdc`
- Do not treat `landing page/` as deploy source unless explicitly merging an experiment.

---

*Last updated: 14 June 2026 — Gate 2 hybrid funnel (Step 11); selective CTA classes.*
