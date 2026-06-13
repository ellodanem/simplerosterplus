# Home dashboard — recommendations

**Status:** Reference doc (May 2026). **Home dashboard shipped** at `/` (`app/(authenticated)/page.tsx`, `lib/home-week-summary.ts`).  
**Source mock:** `../landing page/images/solution-ai-assist.png` (landing `#solution`, “AI keeps it fast and simple”)  
**Product lens:** [PRODUCT_NOTES.md](./PRODUCT_NOTES.md), [.cursor/rules/simple-roster-plus-positioning.mdc](../.cursor/rules/simple-roster-plus-positioning.mdc)

---

## Executive summary

The **dashboard concept** in `solution-ai-assist.png` fits Simple Roster Plus: a manager opens the app and sees **this week at a glance**—late arrivals, open shifts, coverage—without payroll or HR bloat.

**Do not ship the mock’s chrome as-is.** It uses placeholder branding (“Team Manager”), sidebar nav, blue SaaS tokens, and routes that don’t match the app (Reports, separate Requests nav, no Devices).

**Recommended path:**

1. Build a real **Home** screen with the mock’s **information design** (exception summary + deep links).
2. Align **marketing assets** and **app UI** on SR+ tokens (emerald primary, zinc surfaces, top nav, real labels).
3. Implement **rule-based week summaries first**; treat generative AI as a later polish layer.

---

## Product alignment

### What fits the positioning statement

> Simple Roster Plus helps managers create weekly schedules and track attendance in minutes, with AI keeping the process fast and simple.


| Principle                                 | How the mock supports it                   |
| ----------------------------------------- | ------------------------------------------ |
| Schedule / review / fix faster            | Surfaces exceptions before opening grids   |
| Summaries and alerts over heavy workflows | Three scannable cards, not a config wizard |
| Scannable in under a minute               | Single “This week at a glance” band        |
| Not payroll / compliance / enterprise HR  | No policy engine, tax, or benefits UI      |
| Lightweight setup                         | No new settings on the dashboard itself    |


### What the app already has (dashboard should link into)


| Area            | Today                                       | Dashboard tie-in                  |
| --------------- | ------------------------------------------- | --------------------------------- |
| Roster          | Weekly grid, templates, week lock           | Open shifts, coverage             |
| Attendance      | Week view + log, grace settings             | Late / missing vs planned         |
| Requests        | Roster page modal + badge (`PRODUCT_NOTES`) | Pending count on Home             |
| Staff / Devices | Top nav                                     | Quick links, not duplicated lists |
| Timezone        | Per-org IANA + week start weekday           | Show active week range on Home    |


### Out of scope for v1 dashboard (defer)

- Sick leave inbox (separate workflow later per `PRODUCT_NOTES`)
- Shift swap
- Reports hub (exports/handoff are direction, not a nav destination yet)
- Sidebar navigation (unless nav grows materially)
- Full multi-user profile chrome (Clerk / RBAC planned in GTM docs)

---

## Mock review (`solution-ai-assist.png`)

### Strengths (keep)

- **“This week at a glance”** as the hero band—matches weekly manager mental model.
- **Three exception cards** with semantic color (late / open / OK)—easy to parse.
- **AI framing** as exception summary, not “run my business” chatbot.
- **Secondary widgets** (upcoming shifts, availability) are optional; only valuable with deep links.

### Gaps vs shipped product


| Mock element                                                                       | Issue                             | Recommendation                                                    |
| ---------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| **Team Manager** branding                                                          | Wrong product name                | **Simple Roster Plus** + logo when available                      |
| Sidebar: Dashboard, Schedule, Team, Time & Attendance, Requests, Reports, Settings | IA and labels differ from app     | **Top nav:** Home, Roster, Attendance, Staff, Devices             |
| **Requests** as top-level nav                                                      | Requests live on **Roster** today | Home shows **Requests (N)** CTA → roster + modal                  |
| **Reports**                                                                        | Not a module                      | Omit until reports exist; use “exports” in copy only if true      |
| **+ Create shift**                                                                 | Ambiguous global action           | **Open roster** (scheduling is grid-native)                       |
| Blue primary + sidebar                                                             | Landing/marketing style, not app  | See [Visual system](#visual-system)                               |
| **Good morning, Emma**                                                             | Needs real user display name      | Use session email/name when auth matures                          |
| AI summary                                                                         | Not implemented                   | Rule-based summary first; label “summary” honestly until AI ships |


### Data each card implies (backend)


| Card                    | Derived from                                          |
| ----------------------- | ----------------------------------------------------- |
| Late arrivals (> N min) | Roster shifts vs punches, grace rules, org `timeZone` |
| Open shift (day)        | Unfilled roster cells for that date                   |
| Coverage OK (range)     | Templates + assignments for those days                |


Prefer **one bootstrap endpoint** for Home (see `PROJECT_OPTIMIZATION_GUIDE.md` dashboard pattern), not parallel micro-fetches on mount.

---

## Target Home experience

### Purpose

Default landing after sign-in: **what needs attention this week**, with one-click paths to fix it.

### Layout (top nav — matches current app)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Simple Roster Plus          Home  Roster  Attendance  Staff  Devices        │
│                                              you@org.com    Sign out        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Good morning, {name}                              [ Requests ({n}) ]       │
│  Week of {Mon date} – {Sun date} · {org timeZone}     [ Open roster ]       │
│  Here’s what needs attention before the week runs.                          │
│                                                                             │
│  ┌─ This week at a glance ───────────────────────────────────────────────┐  │
│  │  Summary · exceptions from roster + attendance                        │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │  │
│  │  │ Late · {n}      │ │ Open · {n}      │ │ Coverage · OK   │        │  │
│  │  │ >{grace} min    │ │ {day} unfilled  │ │ {range}         │        │  │
│  │  │ → Attendance    │ │ → Roster (day)  │ │ (no action)     │        │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Quick links ─────────────────────┐  ┌─ Pending requests ─────────────┐  │
│  │ Continue weekly roster            │  │ {n} requested                  │  │
│  │ Review attendance (this week)     │  │ Review on Roster →             │  │
│  │ Staff · Devices                   │  └──────────────────────────────────┘  │
│  └───────────────────────────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Interaction rules

- Every exception card **must deep-link** with context (week, day, filter)—no dead chevrons.
- **Requests** opens roster with requests modal or highlights inbox; badge count matches `/api/requests` pending count.
- Empty states: “No exceptions this week” with links to roster/attendance anyway.
- Past weeks: summary defaults to **current week**; optional week picker is v2.

### Copy guidelines

- Use **manager** language: roster, attendance, requests—not HR jargon.
- Subtitle under glance band: clarify scope, e.g. *“Exceptions from roster and attendance—not payroll or policy.”*
- Avoid over-promising **AI** until a real model or rules engine backs the text; “weekly summary” is fine for v1.

---

## Visual system

### Current split (documented so we don’t drift)


| Surface                                         | Font              | Primary accent            | Chrome                             |
| ----------------------------------------------- | ----------------- | ------------------------- | ---------------------------------- |
| Landing (`landing page/index.html`)             | Plus Jakarta Sans | Blue `#2563eb`            | Polished cards, some sidebar mocks |
| App (`app/(authenticated)/layout.tsx`)          | Geist             | Emerald `emerald-700/800` | Top nav, zinc, utilitarian         |
| Solution PNGs (schedule, attendance, AI assist) | Jakarta-like      | Blue, sidebar             | Marketing set                      |


### Decision (recommended)


| Option                            | Use when                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| **A — Evolve mocks toward app** ✅ | Default: one product feel; regen landing PNGs with emerald + top nav + SR+ name    |
| **B — Evolve app toward mocks**   | Willing to refactor all authenticated pages to sidebar + blue                      |
| **C — Hybrid**                    | Acceptable only if density differs, **not** if brand color and nav pattern diverge |


**Recommendation:** **A** for now. Keep landing slightly richer (shadows) but same **emerald + zinc + route names**.

### Tokens for app Home and revised marketing asset


| Token                     | Tailwind / hex                                                           |
| ------------------------- | ------------------------------------------------------------------------ |
| Page background           | `bg-zinc-50`                                                             |
| Cards                     | `bg-white` `border-zinc-200` `rounded-lg`                                |
| Primary CTA               | `bg-emerald-700` hover `emerald-800`                                     |
| Work-area nav links       | `text-emerald-800`                                                       |
| Late / warning / OK cards | `rose` / `amber` / `emerald` soft backgrounds (semantic, not brand blue) |
| Requests emphasis         | Rose (consistent with roster Requests control)                           |


---

## Landing page asset checklist

When refreshing `solution-ai-assist.png` (and ideally the full solution set):

- Product name: **Simple Roster Plus** (not Team Manager)
- Nav: **Home · Roster · Attendance · Staff · Devices** (top bar)
- Primary button: **Open roster** (not generic “Create shift”)
- Show **Requests (n)** if illustrating pending workflow
- Emerald + zinc palette (match app)
- Keep `alt` on `index.html` accurate; optional one-line “preview” in section copy if AI not live yet
- Regenerate **schedule-builder** and **attendance** PNGs in the same pass for a consistent set

---

## Implementation sequencing

Suggested order when building in the app repo (no commitment on dates):


| Phase | Deliverable                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------- |
| **1** | Replace placeholder `app/page.tsx` Home with layout above (static or seeded data)                 |
| **2** | `GET /api/home/week-summary` (or server component loader): late, open, coverage, pending requests |
| **3** | Deep links + empty states + org week/timezone in header                                           |
| **4** | Optional: “upcoming shifts” / availability strips **only** with links                             |
| **5** | AI-generated copy layer on top of deterministic summary (optional polish)                         |


### Performance

- One bootstrap per Home load.
- Cache week summary for short TTL or invalidate on roster/punch/requests mutations.

### Accessibility

- Cards as links or buttons with clear labels.
- Status not conveyed by color alone (icon + text).
- Keyboard order: greeting → primary CTAs → cards → quick links.

---

## Related documents


| Doc                                                                                                     | Relevance                                       |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [PRODUCT_NOTES.md](./PRODUCT_NOTES.md)                                                                  | Requests workflow, timezone, multi-user roadmap |
| [PRICING.md](./PRICING.md)                                                                              | Canonical tiers, limits, Stripe SKUs            |
| [AGENT_CONTEXT_GTM_AUTH_PRICING.md](./AGENT_CONTEXT_GTM_AUTH_PRICING.md)                                | Clerk, onboarding, demo → trial                 |
| [../landing page/MAPPING.md](../landing%20page/MAPPING.md)                                              | Landing structure; illustrative visuals         |
| [PROJECT_OPTIMIZATION_GUIDE.md](../PROJECT_OPTIMIZATION_GUIDE.md)                                       | Dashboard bootstrap pattern                     |
| [.cursor/rules/simple-roster-plus-positioning.mdc](../.cursor/rules/simple-roster-plus-positioning.mdc) | Feature filter                                  |


---

## Open questions (resolve before build)

1. **Week picker on Home** — current week only v1, or jump to past/future?
2. **Grace minutes** — surface org default on late card or keep generic “late”?
3. **Coverage definition** — all templates filled vs minimum headcount per shift type?
4. **AI label** — “Summary” vs “AI summary” on marketing before backend exists?
5. **Sidebar** — revisit only if nav exceeds ~5 items (Reports, Setup, Insights, etc.)?

---

*Last updated: May 2026. Revise when Home ships or landing assets are regenerated.*