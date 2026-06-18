# Simple Roster Plus — Landing page map

**Canonical directory:** `srp/landing-page/` — this file and `index.html` are the main marketing site.  
**Master doc:** [`LANDING-PAGE.md`](./LANDING-PAGE.md) — structure, session changelog, experiment comparison, image inventory.  
**Guide:** Craig Morrison *Step by Step Landing Page* (LP template = structure only)  
**Build:** Modern HTML5 + existing `index.html` design tokens (no Bootstrap 3)  
**Positioning:** See `srp/.cursor/rules/simple-roster-plus-positioning.mdc` — **managers**, weekly schedules + attendance **in minutes**, **Auto Scheduler** (not “AI”).  
**Mission (canonical):** *Simple Roster Plus helps managers create weekly schedules and track attendance in minutes, with Auto Scheduler keeping the process fast and simple.*  
**Legacy experiment:** `landing page/` (repo sibling) — not canonical; see `LANDING-PAGE.md` § Two copies.  
**Out of scope for now:** Analytics / conversion tracking (Step 10)

---

## Locked decisions

| Item | Choice |
|------|--------|
| **Persona** | **Manager** at a shift-based small business—builds the weekly schedule, tracks attendance, wants speed not HR bloat. |
| **App origin** | `https://simplerosterplus.vercel.app` (custom marketing domain later) |
| **Primary CTA label** | **Start Free** (same label everywhere) |
| **Self-serve path** | `.cta-signup` → `SRP_APP_SIGNUP_URL` (`/sign-up`) — hero, `#contact` panel, `#cta-close` |
| **Nurture path** | `.cta-contact` → `#contact` — header, how-it-works, footer |
| **Demo path** | `.demo-cta` → `SRP_APP_DEMO_URL` (`/sign-up?intent=demo`) — hero, how-it-works, `#contact`, `#cta-close` |
| **Log in** | `SRP_APP_LOGIN_URL` → app `/login` |
| **Contact section** | `#contact` — self-serve row + form POSTs to `SRP_MARKETING_API` |
| **Closing headline** | Alternate benefit line (see §11), not a second H1 |

---

## Page architecture (target)

```text
header
  logo → #hero
  Log in → `SRP_APP_LOGIN_URL`
  Start Free → `#contact` (`.cta-contact`)

main
  #hero           — Start Free (signup) + Explore demo
  #trust          — workplace chips
  #pain           — problem
  #dream          — outcomes
  #solution       — feature blocks
  #social-proof   — setup includes
  #how-it-works   — four steps; Start Free (contact) + Explore demo
  #faq            — objections
  #contact        — signup + demo row, then optional form
  #cta-close      — Start Free (signup) + Explore demo

footer
  logo, mission, FAQ · Start Free (`#contact`) · legal · Log in
```

**Rule:** No other in-page nav targets for v1 (remove Features / Workflow / Industries / Setup from header).

---

## Section-by-section map

### 0. Document head

| Field | Value |
|-------|--------|
| `<title>` | `Simple Roster Plus \| Weekly Schedules & Attendance for Managers` |
| `meta description` | Use canonical mission sentence (≤ ~155 chars) |
| `lang` | `en` |
| Font | Keep Plus Jakarta Sans |
| CSS | Single stylesheet approach: keep embedded in `index.html` until split file is worth it |

---

### 1. `#hero` — Main headline, support, one CTA, visual

**Book steps:** 3, 4, 5, 6  

**HTML:** `<section id="hero" aria-labelledby="hero-heading">`  
- One `<h1 id="hero-heading">`  
- One `<p class="lead">` (supporting headline)  
- One `<a class="btn btn-primary cta-signup">` + `<a class="btn btn-secondary demo-cta">`  
- One visual column (mock → real screenshots later)  
- Optional: 3 short badges under CTA (ZKTeco-ready, roster + punches, small teams) — not a second button  

**Remove from current hero:**
- Second primary button (“Device & ZKTeco compatibility”)
- “See sample workflow” as competing CTA (OK as text link inside `#solution` only)
- “Next steps” box label (feels internal)

**Headline options (pick one for H1, another for `#cta-close`):**

| Role | Draft |
|------|--------|
| **H1 (recommended)** | `Know who was supposed to be on shift—and who actually clocked in.` |
| Alt A | `Stop reconciling your roster with your ZKTeco punches.` |
| Alt B (closing) | `One place for shifts, clock-ins, and reports your admin can use.` |

**Supporting lead (draft):**  
`Simple Roster Plus sets up practical roster and attendance for shift teams with ZKTeco devices—without selling you a full HR or payroll platform. We configure your terminal, connect schedules to punches, and hand over reports you will actually open each week.`

**Visual:**
- **Now:** Keep CSS `product-showcase` mock; note in `aria-label` that it’s illustrative  
- **Later:** `<picture>` — roster week view + attendance summary (replace mock)  

**Source content:** Current hero sub + `#solution` first paragraph (trimmed).

---

### 2. `#trust` — Early credibility

**Book step:** 8 (light version before pain)

**HTML:** `<section id="trust" aria-labelledby="trust-heading">`  
- `<h2 class="visually-hidden">` or short `<p class="eyebrow">` — do **not** claim “companies trust us” without logos  
- Row of chips OR 4–6 client logos when available  

**Copy (interim — honest):**  
`Built for shift-based teams in retail, food service, clinics, security, and multi-shift sites.`  

**Source:** Current `.hero-trust` industry chips — move here, reword (not fake social proof).  

**Later:** Replace chips with `img` logos + optional “12+ sites set up” only if true.

---

### 3. `#pain` — Reader’s problems

**Book step:** 7 (pain)

**HTML:** `<section id="pain">` — centered column, max-width ~40rem  
- `<h2>` — problem headline  
- 2 short `<p>`  
- `<ul>` of 5–6 second-person questions  

**H2 (draft):** `When the roster lives in one place and attendance lives somewhere else`

**Body (draft):**  
Use current `#problem` lead + cards, tightened for Alex:

- WhatsApp, paper, or spreadsheets for the week  
- ZKTeco (or another terminal) for punches—but no easy “planned vs actual”  
- “Who was meant to be here Tuesday night?” still means digging through chats  
- Payroll or admin waits on someone to piece hours together  

**Question list (draft):**
- Do you rebuild the roster every week in a tool that isn’t connected to clock-ins?  
- When someone is late or missing, do you find out on the floor—or days later?  
- Can you pull one clean attendance window for payroll without retyping punches?  
- If a staff member disputes hours, do you have one record both of you trust?  
- Are managers spending time fixing schedules instead of running the shift?  

**Bridge line (into dream):**  
`What if planned shifts and terminal punches lived in one practical flow?`

**Source:** `#problem` section; delete duplicate “What you actually need” card (that’s solution).

---

### 4. `#dream` — After state

**Book step:** 7 (dream)

**HTML:** `<section id="dream">`  
- `<h2>`  
- 3 short paragraphs OR 3 outcome cards (reuse `.outcome` styling)  

**H2 (draft):** `Run the week with clarity—not chase-down`

**Dream beats (from `#outcomes`):**
1. Open one view: who was scheduled, who punched, who’s late or absent  
2. Close the period with reports/exports that match how you already run payroll handoff  
3. Hand a manager a short routine: update roster, check device, pull report—no thick manual  

**Tone:** “You” and outcomes, not feature names.

**Source:** `#outcomes` (move up); do not repeat full pillars here.

---

### 5. `#solution` — Product as bridge

**Book step:** 7 (solution)

**HTML:** `<section id="solution">`  
- `<h2>` pitch headline  
- Intro `<p>`  
- **3 subsections** (each: `<h3>` + `<p>` + optional visual) — not a 4-card grid + tabs + integrations  

| # | H3 | Story | Visual | Source |
|---|-----|--------|--------|--------|
| 1 | `ZKTeco configured for your site` | Biometric setup, staff on device, rules match shifts | Device photo or icon block | Pillar “ZKTeco device setup” |
| 2 | `Roster and punches tell one story` | Planned vs actual; sample workflow idea | Workflow table mock OR 1 screenshot | `#workflow` tab “compare roster vs actual” |
| 3 | `Reports you will open each cycle` | Period summary, CSV/payroll-friendly export | Chart mock or report screenshot | Pillar “Attendance reports” |

**H2 (draft):** `Simple Roster Plus connects the roster to the clock`

**Intro:** Current `#solution` paragraph (one block).

**Fold in (short):**
- One line on optional WhatsApp/email alerts and exports from current pillars footer  
- Link text only: “See how setup is scoped” → `#setup-paths`  

**Cut from solution area (v1):**
- `#integrations` bubbles (one sentence in intro: “Works with ZKTeco, CSV, email/WhatsApp alerts, payroll handoff—scoped honestly.”)  
- `#operations` 3-path cards (move to `#setup-paths`)  
- `#addons` grid (one bullet list max under setup paths)  
- Full workflow tabs UI (replace with one static “sample” panel)

**Honest scope:** Move `#honest` bullets into a short `<aside>` or final `<p>` inside `#solution` (“What we don’t do: full HR, accounting, enterprise payroll, open-ended custom dev.”).

---

### 6. `#proof-1` — First testimonial / trust

**Book step:** 8

**HTML:** `<figure>` or `<blockquote>` with cite  

**If no real quote yet (interim):**  
Use **“What setup includes”** card instead of fake Don Draper quote:

- Discovery call on shifts and sites  
- Device + staff configuration  
- Roster/report views matched to your week  
- Manager handover  

Label clearly: `What you get from a typical setup` — not a testimonial.

**When available:** Replace with real quote + name, role, business type (photo optional).

---

### 7. `#setup-paths` — Offer (not SaaS pricing)

**Book step:** Supports solution + single CTA  

**HTML:** `<section id="setup-paths">`  
- `<h2>` Setup options  
- 3 cards (keep current `.setup-card` pattern)  
- One `.btn-primary` → `#contact`  
- One line: pricing depends on staff count, sites, device, reporting—quote after short call  

**Source:** `#setup-options` + copy from `#operations` titles  

**Featured card:** Keep “Roster + Attendance” as recommended.

---

### 8. `#proof-2` — Second proof block

**Book step:** 8

**Options (pick one for v1):**

| Option | Content |
|--------|---------|
| A | Second real testimonial |
| B | `#process` four steps as numbered list (“How setup works”) |
| C | Mini case: “Retail, 14 staff, 1 terminal…” (only if factual) |

**Recommended for v1:** **Option B** — process steps build trust without fake quotes.

---

### 9. `#faq` — Objections (short)

**Not in template; keep for B2B setup sales**

**HTML:** `<section id="faq">` — 4–5 `<details>` max  

**Keep:**
- Already have ZKTeco?  
- How long setup takes  
- Not monthly SaaS / project quote  
- Not full HR  
- Don’t run payroll  

**Source:** Current `#faq` — trim to 5 items.

---

### 10. `#contact` — Conversion (hybrid)

**Book step:** 2 (action destination)

**HTML:** `<section id="contact">`  
- `<h2>` Start free—or tell us about your team  
- Self-serve row: `.cta-signup` + `.demo-cta`  
- Optional form for hand-onboard / multi-site questions  
- Form fields unchanged; submit `Send my request`  
- Backend: `POST` `SRP_MARKETING_API`  

**Place:** After FAQ, before `#cta-close`.

---

### 11. `#cta-close` — Closing headline + same CTA

**Book steps:** 3 (alt headline), 9  

**HTML:** `<section id="cta-close" class="cta-band">`  
- `<h2 id="cta-close-heading">` — use **Alt B** or Alt A from hero table  
- One `<p>` — one sentence dream reminder  
- `.cta-signup` + `.demo-cta` (self-serve path; not the contact form)  
- Optional: reuse small attendance mock (decorative `aria-hidden="true"`)  

**Do not:** Duplicate form here.

**Source:** Current `aside.cta-band` — change inner heading from H2 that reads like H1; ensure only one H1 on page.

---

### 12. `footer`

**HTML:** `<footer>`  
- Logo, one-line positioning  
- Links: Privacy, Terms (real URLs when ready)  
- `© year Simple Roster Plus`  
- Text link: Start Free → `#contact`  

**Remove:** Multi-column explore/company nav that competes with single CTA (or max 3 text links: FAQ, Contact, Privacy).

---

## Cut list (do not ship on public v1)

| Section / element | Reason |
|-------------------|--------|
| `#logo-lab` entire section | Internal design review, breaks conversion flow |
| Header nav: Features, Workflow, Industries, Setup | Exploration > conversion |
| Hero second button + workflow as hero CTA | Multiple actions |
| `#integrations` standalone | Fold one sentence into solution |
| `#for-you` pill list | Merged into `#trust` |
| `#addons` standalone | One line under setup paths |
| `#operations` 3 cards | Merged into setup paths |
| `#outcomes` standalone | Becomes `#dream` |
| `#process` standalone | Becomes `#proof-2` unless you add testimonial |
| Keyword-stuffed repeated H2s in body | SEO in meta + one natural mention |

---

## CTA & copy consistency

| Location | Start Free target | Explore demo |
|----------|-------------------|--------------|
| Header | `#contact` (`.cta-contact`) | — |
| Hero | `/sign-up` (`.cta-signup`) | yes |
| After how-it-works | `#contact` (`.cta-contact`) | yes |
| `#contact` panel | `/sign-up` (`.cta-signup`) | yes |
| `#cta-close` | `/sign-up` (`.cta-signup`) | yes |
| Footer | `#contact` (`.cta-contact`) | — |
| Form submit | — | Send my request |

---

## Semantic / accessibility checklist

- Exactly **one** `<h1>` on the page (hero only)  
- Section order matches scroll story; `h2` → `h3` don’t skip levels  
- All sections have `aria-labelledby` pointing to visible headings  
- Primary buttons: visible focus, sufficient contrast (existing tokens OK)  
- Form: labels associated, `autocomplete` kept  
- Decorative mocks: `aria-hidden="true"` on chrome-only visuals  

---

## Implementation order

1. **Skeleton** — Reorder DOM to sections above; stub headings; cut logo lab + nav clutter.  
2. **Copy** — Paste drafts from this doc; refine with your voice.  
3. **CSS** — Reuse existing components; add `.lead`, `.eyebrow` if needed; no Bootstrap.  
4. **Trust** — Interim chips → real logos/quotes when ready.  
5. **Assets** — Replace hero/workflow mocks with photos.  
6. **Form** — Wire backend; remove demo alert.  
7. **Analytics** — Later (Step 10).  

---

## Old ID → new ID quick reference

| Current `id` | New home |
|--------------|----------|
| `hero` | `hero` (rewritten copy) |
| `hero-trust` | `trust` |
| `problem` | `pain` |
| `outcomes` | `dream` |
| `solution` + `pillars` + `workflow` | `solution` (condensed) |
| `honest` | inside `solution` |
| `setup-options` | `setup-paths` |
| `process` | `proof-2` |
| `faq` | `faq` (trimmed) |
| `contact` | `contact` |
| `cta-band` | `cta-close` |
| `logo-lab` | **delete** |
| `integrations`, `operations`, `for-you`, `addons` | **cut or one-liner** |

---

*Persona name “Alex” is internal only—do not use on the live page unless you want a named story block.*
