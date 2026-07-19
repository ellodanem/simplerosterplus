# Small Business Employee Scheduling Page — Evidence-Based Content Brief

**Prepared:** 18 July 2026  
**Target URL:** `https://www.simplerosterplus.com/small-business-employee-scheduling`  
**Primary keyword:** `employee scheduling software for small business`  
**Scope:** Content brief only. Do **not** create the landing page, navigation links, structured data, sitemap entries, or screenshots until explicitly approved.

**Differentiation rule:** This page owns **small-business fit** (who it is for, plan limits, setup reality, pricing honesty). It must **not** duplicate `/employee-scheduling-software`, which owns schedule-creation workflow depth.

---

## 1. Page objective

Create a commercial landing page for buyers searching for employee scheduling software **specifically for small business**.

The page should:

- Answer whether Simple Roster Plus is a practical fit for a small team leaving spreadsheets, paper, or group chats.
- Lead with clear Free / Plus / Pro limits, self-serve signup, and weekly roster + attendance without enterprise HR complexity.
- Convert qualified visitors to **Start Free** or **Explore demo**.
- Explicitly filter out poor-fit buyers (payroll-only, enterprise WFM, teams over 100, non-shift use cases).
- Avoid competing with:
  - Homepage (`employee roster software`)
  - `/employee-scheduling-software` (how scheduling works)
  - `/employee-attendance-software` (attendance depth)
  - `/zkteco-attendance-integration` (device/ADMS depth)

### Desired reader takeaway

> For a shift-based small business, Simple Roster Plus is a practical weekly roster system: clear staff and location limits, a permanent Free plan for up to 10 staff, and schedule-plus-attendance without enterprise HR complexity.

---

## 2. Target audience

### Primary audience

- Owners and managers of **shift-based** small businesses
- Teams of roughly **under 10 to about 50** staff (Free → Plus sweet spot)
- People currently scheduling in **spreadsheets, paper, or WhatsApp/group chats**
- Buyers who want **one clear weekly schedule** and optional attendance review—not a full HR suite

### Secondary audience

- Teams growing toward **50–100** staff evaluating Pro
- Multi-site small operators who need **more than one location** (Free: 2; paid: unlimited locations with staff caps still applying)

### Relevant operating environments (from existing marketing)

Retail and gas, restaurants, clinics, security, cleaning, multi-shift sites — cite as examples of shift work, not as exclusive verticals.

Evidence: `landing-page/index.html` audience strip.

### Primary problems this page should address

- “Is this priced and sized for a small business?”
- “Can we start without a credit card / enterprise sales process?”
- “How long until we can publish a real week?”
- “What happens when we outgrow Free?”
- “What do we *not* get?”

---

## 3. Search intent

### Primary intent: commercial investigation + fit check

Queries like `employee scheduling software for small business` and `small business scheduling software` imply:

- Product comparison for SMB buyers
- Pricing and plan clarity
- Ease of setup vs enterprise tools
- Whether the product is “too much” or “too little”

### Secondary intent: affordability and simplicity

Supporting queries (`affordable`, `simple`, `easy`, `rostering software for small business`) seek low complexity and honest limits—not feature laundry lists.

### Content boundary


| URL                              | Owns                                       |
| -------------------------------- | ------------------------------------------ |
| `/`                              | Brand + roster-first overview              |
| `/employee-scheduling-software`  | How to build/publish a weekly schedule     |
| **This page**                    | **Why / whether it fits a small business** |
| `/employee-attendance-software`  | Plan vs actual attendance                  |
| `/zkteco-attendance-integration` | Device/ADMS path                           |


Do not turn this page into a generic “best of” list or a deep feature tutorial.

---

## 4. Primary and supporting keywords

### Primary keyword

- employee scheduling software for small business

### Supporting keywords

- small business scheduling software
- staff scheduling software for small business
- rostering software for small business
- simple employee scheduling software
- easy staff scheduling software
- affordable employee scheduling software

### Related language (use naturally)

- weekly staff roster for small teams
- Free plan up to 10 staff
- Plus up to 50 staff
- publish and share a schedule
- replace spreadsheet scheduling
- no enterprise HR suite

### Keyword usage guidance

- Put the primary keyword in SEO title, H1 (or close paraphrase), opening paragraph, and one FAQ.
- Prefer **small business** / **small teams** / **shift-based** over “any size.”
- Do not invent “unlimited” language that contradicts plan caps.
- Use **Auto Scheduler** only if describing status accurately (feature-flagged off in app; landing often says Coming soon).

---

## 5. Confirmed small-business strengths

These are the strongest evidence-backed reasons a small business might choose SRP:

1. **Permanent Free plan sized for tiny teams** — up to **10** active staff, **2** locations, **1** admin; roster + manual attendance continue after any device trial ends.
  Evidence: `docs/PRICING.md`, `lib/plans.ts` (`FREE_STAFF_MAX`, `FREE_LOCATIONS_MAX`, `FREE_ADMINS_MAX`).
2. **Clear paid upgrade path** — Plus **$19.99/mo** / up to **50** staff; Pro **$49.99/mo** / up to **100** staff; monthly-first, annual optional.
  Evidence: `docs/PRICING.md`, `scripts/stripe-seed-products.ts`, Settings billing UI.
3. **Self-serve signup → setup wizard → roster** — Clerk sign-up, org provision with default location and default shift presets, setup completeness gates (location, shifts, roles, staff).
  Evidence: `app/sign-up/[[...sign-up]]/page.tsx`, `lib/clerk/provision.ts`, `lib/onboarding.ts`, `app/(authenticated)/setup/setup-wizard.tsx`.
4. **Weekly roster workflow that matches SMB habits** — shift presets, assign staff, approved leave visibility, **copy previous week**, draft/publish, share link/print.
  Evidence: prior scheduling brief + `lib/shift-presets.ts`, `lib/leave-blocks.ts`, `app/api/roster/weeks/[id]/copy-previous/route.ts`, share routes under `app/share/roster/`.
5. **Attendance connected to the plan (optional depth)** — scheduled vs present/late/absent; manual punches without buying hardware.
  Evidence: `lib/attendance-week.ts`, attendance UI; `docs/PRICING.md` (manual continues after free device trial).
6. **Demo sandbox** — seeded org for exploration without building from zero.
  Evidence: `lib/demo/provision.ts`, `DEMO_SANDBOX_DAYS = 14`.
7. **Honest product scope** — roster-first; not payroll/HRIS. Aligns with small buyers who do not want enterprise configuration.
  Evidence: `.cursor/rules/simple-roster-plus-positioning.mdc`, `docs/PRODUCT_NOTES.md`, homepage FAQ.

---

## 6. Setup and onboarding reality

### What is self-service today


| Step                   | Reality                                                              | Classification                         |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| Signup (Clerk)         | `/sign-up` → redirect toward `/setup` or demo                        | Confirmed and available                |
| Org + default location | Provisioned; location named “Main”; TZ often UTC until business step | Confirmed and available                |
| Default shift presets  | Seeded (Morning / Day / Evening / Close)                             | Confirmed and available                |
| Setup wizard           | Business → shifts → roles → staff → attendance settings → go-live    | Confirmed and available                |
| Sample staff           | Optional 5 sample staff when empty                                   | Available with limitations             |
| First roster           | **Not** created inside setup; manager builds on Roster after go-live | Available with limitations             |
| Copy previous week     | Helps week 2+; cold week 1 is still assignment work                  | Confirmed and available                |
| Leave / day-off        | Manager-entered requests/approvals; not in setup                     | Confirmed and available (manager path) |
| Manual attendance      | Ready in app; setup only stores grace/OT                             | Confirmed and available                |
| Device / ZKTeco        | Post-setup; ADMS, public URL, staff mapping — often support-shaped   | Available with limitations             |
| Demo                   | `/sign-up?intent=demo` → seeded sandbox                              | Confirmed and available                |


Evidence: `docs/ONBOARDING_FUNNEL.md`, `lib/onboarding.ts`, `lib/setup-guard.ts`, device docs under `docs/device-ingest/`.

### Time to become usable (honest)

Do **not** infer “minutes” from marketing alone.


| Milestone                 | Realistic expectation from code/docs                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| Account + org             | Minutes if Clerk/env clean                                              |
| Setup wizard complete     | Often **10–30+ minutes** with real staff vs sample                      |
| First **published** week  | Longer than setup; funnel treats `first_roster_published` as activation |
| Week 2 with copy-previous | Closest to marketing “minutes”                                          |
| Live biometric device     | Hours–days (network, hostname, mapping)                                 |


Funnel abandonment windows are measured in **hours/days** (e.g. 24h no employees, 48h no roster), which contradicts a universal “set up in minutes” claim for cold starts.

Evidence: `docs/ONBOARDING_FUNNEL.md`, `landing-page/index.html` (marketing “minutes” claims — treat as **unsafe** unless qualified).

### Technical knowledge required

- **Roster-only path:** browser, email signup, basic form entry — **no** developer skills.
- **Device attendance path:** ADMS/cloud URL, firewall/network, device user ID mapping — **technical / ops** knowledge or help.
- **WhatsApp automated publish:** Twilio/org entitlement + staff opt-in — not “no technical setup” for messaging.

### Onboarding support / installation / hardware


| Offer                          | Status                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Productized onboarding package | **Not found** as a SKU                                                                |
| Installation included          | **Not found**                                                                         |
| Hardware included              | **Not found** (device slots ≠ free terminals)                                         |
| Contact / ops help             | Marketing invites contact for multi-site/device help; **Cannot verify** delivery SLAs |
| Automated onboarding email     | Off by default (`ONBOARDING_AUTOMATION_ENABLED=false`)                                |


---

## 7. Plan and pricing limits

Canonical sources: `docs/PRICING.md`, `lib/plans.ts`, `lib/plan-limits.ts`, `lib/device-trial.ts`.


| Dimension                   | Free                            | Plus                                        | Pro                                         |
| --------------------------- | ------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Price                       | $0                              | **$19.99/mo** (annual **$199/yr** optional) | **$49.99/mo** (annual **$499/yr** optional) |
| Staff (hard)                | **10**                          | **50**                                      | **100**                                     |
| Locations                   | **2** (soft block at 3)         | Unlimited                                   | Unlimited                                   |
| Admins                      | **1**                           | **2** included (+$2/mo extras)              | **5** included (+$2/mo extras)              |
| Device slots                | **1** + **30-day** sync trial   | **1** included (+$5/mo extras)              | **3** included (+$5/mo extras)              |
| WhatsApp automated          | Not included                    | **+$5/mo** add-on, **200**/mo               | **500**/mo included                         |
| SMS automated               | Docs: not on Free; caps on paid | Docs: **50**/mo                             | Docs: **200**/mo                            |
| Auto Scheduler quota (code) | **5**/mo when enabled           | Unlimited (no fair-use in code)             | Unlimited                                   |


**Critical marketing vs code notes:**

- Homepage/pricing still labels **Auto Scheduler** and **SMS/WhatsApp** as **Coming soon** in places — **stale vs code** for WhatsApp metering and Auto Scheduler implementation; Auto Scheduler is **feature-flagged off** (`AUTO_SCHEDULER_ENABLED = false` in `lib/auto-scheduler-feature.ts`).
- SMS caps are **docs-oriented**; no SMS metering constants found under `lib/` comparable to WhatsApp.
- Device trial **+30-day extension** is implemented in `lib/device-trial.ts` but **call sites not found** — do not promise the extension on the page.
- Free plan is a **permanent** roster path; only **device sync** is time-limited.
- “No credit card” is **marketing/docs** for Free signup (no Stripe checkout on free); not a separate app-enforced legal guarantee beyond free path not requiring payment method.

Add-ons (code + docs): extra device **+$5/mo**, extra admin **+$2/mo**, WhatsApp on Plus **+$5/mo**.

---

## 8. Product limitations

Summarized for page writers (detail in final evidence table):

- **No CSV/bulk staff import** — deferred (`docs/AGENT_CONTEXT_GTM_AUTH_PRICING.md`).
- **One roster entry per staff per day** — no split-shift / multi-shift-per-day product story.
- **No drag-and-drop** verified as a marketed interaction model.
- **Auto Scheduler** code exists but `**AUTO_SCHEDULER_ENABLED = false`**; copy-previous remains available.
- **Shift swaps** deferred (`docs/PRODUCT_NOTES.md`).
- **No employee self-service portal** (`/me` future); leave is manager-entered; staff view via **public share link**.
- **No employee phone clock-in** — ADMS device or manager manual punches (`docs/MOBILE_STRATEGY.md`).
- **Permissions** — Clerk roles exist; fine-grained API RBAC / per-location admin scoping **not wired** as enterprise ACL.
- **Roster editing** is **desktop/tablet preferred**; manager grid is wide (`min-width` / scroll). Mobile share is stronger than mobile edit.
- **Not payroll, not HRIS, not union/compliance engine.**
- **Staff cap hard-stops at 100** on Pro — not “any size.”
- **Messaging:** automated WhatsApp is entitlement/opt-in based; manual link paste into WhatsApp is unlimited and distinct.

---

## 9. Poor-fit customer profiles

Do **not** claim these buyers are a fit:

1. **Payroll-only buyers** — need tax, remittance, pay runs (SRP exports hours for handoff at most).
2. **Non-shift / fixed 9–5 office-only** seeking calendar or project time tracking — product is weekly roster/shift-template oriented.
3. **Project-based time tracking / billable hours** — not the product model.
4. **Teams over 100 active staff** — hard Pro cap; contact/support path, not self-serve “unlimited.”
5. **Enterprise WFM** — demand forecasting, open-shift marketplaces, complex bidding, deep audit/RBAC.
6. **Union / complex compliance rule engines** — not in product scope (`docs/PRODUCT_NOTES.md` positioning).
7. **Buyers needing employee apps** for clock-in, availability, and shift swaps on day one.
8. **Buyers expecting hardware or installation included** with software price.
9. **Buyers needing “unlimited staff on Free” or “all features free forever.”**
10. **Multi-manager Free orgs** needing more than **1** admin without upgrading.

Suitability by size (evidence-based):


| Size     | Fit                                                    |
| -------- | ------------------------------------------------------ |
| Under 10 | **Strong** on Free (staff/location/admin caps)         |
| 10–50    | **Strong** on Plus                                     |
| 50–100   | **Possible** on Pro; evaluate multi-admin/device needs |
| Over 100 | **Poor fit** without a future enterprise path          |


---

## 10. Unsafe or unsupported claims

Avoid or heavily qualify:


| Risky claim                                    | Why unsafe                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Set up in minutes                              | True-ish for demo/copy-week; **misleading** for cold first publish + real staff       |
| No training required                           | Setup is guided but activation still requires learning roster + publish               |
| Unlimited staff                                | False on every plan                                                                   |
| Unlimited locations on every plan              | False on Free (2)                                                                     |
| Unlimited managers                             | False (1 / 2 / 5 + paid extras)                                                       |
| Works for every small business                 | False — shift/roster fit only                                                         |
| Built for teams of any size                    | False — caps at 100                                                                   |
| Mobile-first scheduling                        | Manager edit is **not** mobile-first                                                  |
| Employee self-service                          | Not shipped                                                                           |
| Shift swaps                                    | Deferred                                                                              |
| Automatic scheduling / Auto Scheduler as live  | Flag **off**; landing often “Coming soon”                                             |
| Payroll included                               | Not included                                                                          |
| Hardware included                              | Not included                                                                          |
| SMS included (as live on all paid)             | Docs vs code gap; landing still “Coming soon”                                         |
| WhatsApp included for every plan               | Free: no; Plus: add-on; Pro: included with caps                                       |
| No technical setup required                    | False if claiming devices/messaging                                                   |
| Free forever with all features                 | Free is limited; device sync trial ends                                               |
| Full multi-location control from one dashboard | Multi-location exists; roster UX is default-location oriented; do not oversell        |
| Complete availability management               | Leave + soft preferences only                                                         |
| Complete permissions and audit controls        | RBAC not fine-grained                                                                 |
| No credit card required                        | OK **only** for Free path; do not imply paid plans never need payment                 |
| Cancel anytime / no hidden fees                | Marketing/docs positioning; **no** customer-facing fee/refund policy verified in repo |
| Onboarding included                            | Not a productized included service                                                    |


---

## 11. Recommended page positioning

**Draft (not approved copy):**

> Create weekly staff rosters, account for approved time off, publish one clear schedule, and track attendance without the complexity of enterprise workforce software.

**Page angle:**

The buyer is a small-business owner or manager using spreadsheets, paper, or group chats who wants a **practical weekly scheduling system with clear pricing**—not enterprise workforce management.

**Contrast explicitly:**

- vs spreadsheets: reusable shifts, copy week, publish one link  
- vs enterprise suites: fewer settings, Free tier, monthly Plus  
- vs attendance-only tools: roster-first, attendance optional

**Keep Auto Scheduler / SMS out of hero promises** until product marketing and flags align.

---

## 12. Recommended page outline

1. **Hero** — H1 + one supporting sentence + Start Free / Explore demo + Free up to 10 staff (no card for Free)
2. **Who this is for** — shift-based small teams; spreadsheet replacement
3. **What you get on day one** — setup path honesty (wizard → first published week)
4. **How the weekly workflow works** — short; link deeper to scheduling page
5. **Clear plan limits** — Free / Plus / Pro table (staff, locations, admins, devices)
6. **What staff can access** — share link; no employee app / no phone clock-in
7. **What is not included yet / not in scope** — swaps, self-service, payroll, hardware
8. **When to choose something else** — poor-fit section
9. **Pricing CTA band** — Start Free / demo
10. **FAQ** — grounded in limits and setup
11. **Footer** — internal links only as approved later

---

## 13. Suggested H1

**Draft:**

> Simple Employee Scheduling Software for Small Businesses

Alternate (more keyword-literal):

> Employee Scheduling Software for Small Business

Prefer the first if brand tone should stay “simple”; ensure primary keyword appears in title + first paragraph if H1 is paraphrased.

---

## 14. Suggested SEO title

**Draft:**

> Employee Scheduling Software for Small Business | Simple Roster Plus

Keep ≤ ~60 characters where possible; the draft is acceptable for clarity over truncation games.

---

## 15. Suggested meta description

**Draft (~155–160 chars target):**

> Weekly staff scheduling for small businesses. Free for up to 10 staff. Build, publish, and share rosters—plus attendance—without enterprise HR complexity.

Do not claim “minutes,” “unlimited,” or “no credit card” in meta unless Free is explicit.

---

## 16. Recommended section headings

Suggested H2s (draft):

1. Built for small, shift-based teams—not enterprise HR
2. Replace spreadsheets with a weekly roster
3. How small teams get started
4. What’s included on Free, Plus, and Pro
5. What your staff can see
6. What Simple Roster Plus does not do
7. Is this the right fit for your business?
8. Frequently asked questions

Optional H3s under pricing: Free limits, Plus limits, Pro limits, Add-ons.

---

## 17. Suggested calls to action


| CTA                               | Target                                                      | Notes                                                                   |
| --------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Start Free**                    | `https://app.simplerosterplus.com/sign-up`                  | Primary; Gate 1 label                                                   |
| **Explore demo**                  | `https://app.simplerosterplus.com/sign-up?intent=demo`      | Secondary                                                               |
| **Log in**                        | `https://app.simplerosterplus.com/login`                    | Header ghost if shown                                                   |
| Text link to scheduling deep-dive | `/employee-scheduling-software`                             | After fit is established                                                |
| Text link to attendance           | `/employee-attendance-software`                             | Supporting                                                              |
| Text link to ZKTeco               | `/zkteco-attendance-integration`                            | Only if device interest                                                 |
| Contact / early access            | `#contact` on homepage only if Gate 1 hybrid still required | Prefer direct signup on this SEO page if other product pages already do |


Do not invent “Book onboarding” or “Buy hardware” CTAs.

---

## 18. Internal links

**When the page is implemented (not now):**


| Link to                                          | Purpose                     |
| ------------------------------------------------ | --------------------------- |
| `/`                                              | Brand home                  |
| `/employee-scheduling-software`                  | Deeper scheduling workflow  |
| `/employee-attendance-software`                  | Attendance / plan vs actual |
| `/zkteco-attendance-integration`                 | Optional device path        |
| `/#pricing` or on-page pricing                   | Plan clarity                |
| App `/sign-up`, `/sign-up?intent=demo`, `/login` | Conversion                  |


**Inbound (later):** homepage “For small businesses” or footer; scheduling page “Looking for small-business fit?” — only when approved.

Do **not** add nav/sitemap in this task.

---

## 19. Recommended screenshots or visuals

**Shipped (19 July 2026):** dedicated page assets (not the shared homepage roster crop):

1. `landing-page/images/smb-scheduling-hero.webp` (+ PNG) — hero lifestyle + weekly roster on laptop
2. `landing-page/images/smb-weekly-workflow.webp` (+ PNG) — mid-page workflow roster UI (copy previous week, presets, share, leave cells)

Original brief preference was existing product screenshots; generated SMB-specific visuals were later approved for this URL so the page does not rely solely on `app-roster-week`.

Still useful if expanding later:

- Publish/share phone mock for staff-access honesty
- Attendance week strip as secondary proof
- Pricing limits remain HTML cards (not a fake screenshot)

Avoid:

- Drag-and-drop mockups
- Employee app UI that does not exist
- “Unlimited locations” hero badges
- Hardware-included imagery
- Auto Scheduler as live product chrome while flag is off

See `docs/seo-small-business-employee-scheduling-implementation.md` §12 for live paths and OG image.

---

## 20. FAQ topics grounded in actual functionality

1. **Is there a free plan?** — Yes; up to 10 staff, 2 locations, 1 admin; device sync time-limited.
2. **Do I need a credit card to start?** — Not for Free signup path; paid plans use Stripe checkout.
3. **How many staff can I manage?** — Free 10 / Plus 50 / Pro 100.
4. **Can I run multiple locations?** — Free: 2; Plus/Pro: unlimited locations (staff caps still apply).
5. **How do I get started?** — Sign up → setup wizard → build/publish first week; demo available.
6. **Can I import staff from a spreadsheet?** — Not via CSV import today; add staff manually or use sample staff.
7. **Can employees clock in on their phones?** — No; device ADMS or manager manual entry.
8. **Can employees log in to request leave?** — No employee portal yet; managers enter/approve leave.
9. **How do staff see the schedule?** — Published share link (and manual WhatsApp/SMS of that link).
10. **Is Auto Scheduler available?** — Implementation exists but shipping flag is off; copy previous week is available.
11. **Are shift swaps included?** — Not yet (deferred).
12. **Is payroll included?** — No.
13. **Is hardware included?** — No; device slots are software sync capacity.
14. **Who is this not for?** — Payroll-only, project time tracking, teams over 100, complex union/compliance WFM.

---

## 21. Structured-data recommendation

When implementing later:

- `SoftwareApplication` or `WebPage` + `FAQPage` for grounded FAQs only.
- Include `offers` only with **accurate** Free/Plus/Pro prices and limits.
- Do **not** mark Auto Scheduler, SMS, or employee app as `FeatureList` items unless live.
- Canonical: `https://www.simplerosterplus.com/small-business-employee-scheduling`
- Do not duplicate FAQ answers that contradict the general scheduling page.

**Out of scope for this brief task:** do not add JSON-LD yet.

---

## 22. Static-site implementation notes

When building later (not now):

- Path: `landing-page/small-business-employee-scheduling/index.html`
- Follow patterns from `landing-page/employee-scheduling-software/index.html`
- Respect `landing-page/vercel.json` (`cleanUrls`, no trailing slash)
- Reuse shared CSS tokens; keep one composition hero; no fake enterprise dashboard collage
- CTAs: Start Free → app sign-up; Explore demo → `intent=demo`
- Customer copy: **Auto Scheduler**, never “AI”
- Gate 1: **Start Free**, not “Start Free Trial,” unless Gate 2 policy changes

**This brief does not create that HTML.**

---

## 23. Pricing wording guide

**Safe:**

- Free for up to **10** staff
- Plus **$19.99/month** for up to **50** staff
- Pro **$49.99/month** for up to **100** staff
- Free includes up to **2** locations
- Paid plans: unlimited locations (staff limits still apply)
- Admins: Free **1** / Plus **2** / Pro **5** (extras +$2/mo)
- Devices: Free **1** slot with **30-day** sync trial; Plus **1**; Pro **3** (extras +$5/mo)
- Manual share of a roster link is available on all tiers

**Unsafe / qualify:**

- “Unlimited everything”
- “SMS included” without Coming soon / docs-vs-code caveat
- “WhatsApp on every plan”
- Promising the unused device-trial extension
- “No hidden fees” without a published fee policy
- Bundling hardware price into software plans

---

## 24. “Simple” wording guide

**Simple means (supported):**

- Weekly roster with presets and copy-previous
- Fewer enterprise policy branches
- Clear Free/Plus/Pro caps
- Manager-centric publish + share link
- Attendance optional beside the roster

**Simple does not mean:**

- Zero learning curve for first published week
- Zero technical work for biometric devices
- Feature-complete availability, swaps, and employee apps
- Suitable for every business that is “small”

Prefer: “practical,” “clear limits,” “without enterprise HR complexity” over absolute “effortless / no training.”

---

## 25. “Small business” fit guide

**Say yes when:**

- Shift-based weekly scheduling is the core need
- Team size maps to Free/Plus/Pro caps
- Buyer accepts manager-driven leave and sharing via link
- Buyer does not need payroll-in-app

**Say no / redirect when:**

- Need native employee self-service day one
- Need shift marketplace / swaps
- Need project time tracking or pure payroll
- Need >100 staff or heavy compliance engines
- Need “mobile-first full grid editing” as primary workflow

Frame multi-location carefully: supported with plan rules; not a promise of polished enterprise multi-site control on day one.

---

## 26. Final evidence table

Classification key:

- **Confirmed and available** — shipped and usable
- **Available with limitations** — exists with important caveats
- **Coming soon** — marketed or flagged as not fully shipped
- **Planned or documented only** — docs/plans without full product surface
- **Not found** — no implementation located
- **Cannot verify** — depends on production ops/Stripe/live env outside repo proof


| #   | Topic                                            | Classification                                 | Evidence                                                                                                               | Page guidance                                   |
| --- | ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Free-plan staff limit                            | **Confirmed and available**                    | `FREE_STAFF_MAX = 10` in `lib/plans.ts`; `docs/PRICING.md`; `checkStaffLimit` in `lib/plan-limits.ts`                  | State “up to 10 staff”                          |
| 2   | Plus-plan staff limit                            | **Confirmed and available**                    | `PLUS_STAFF_MAX = 50`                                                                                                  | State “up to 50 staff”                          |
| 3   | Pro-plan staff limit                             | **Confirmed and available**                    | `PRO_STAFF_MAX = 100`                                                                                                  | State “up to 100 staff”; not unlimited          |
| 4   | Location limits by plan                          | **Confirmed and available**                    | Free `FREE_LOCATIONS_MAX = 2`; paid `locationMax: null` in plan-limits                                                 | Free: 2; paid: unlimited locations              |
| 5   | Admin/manager limits                             | **Confirmed and available**                    | Free 1 / Plus 2 / Pro 5; `countAdmins` / `checkAdminLimit`                                                             | Do not say unlimited managers                   |
| 6   | Device limits by plan                            | **Confirmed and available**                    | Free 1 slot; Plus 1; Pro 3 + addons; `DEVICE_TRIAL_DAYS = 30`                                                          | Slots ≠ hardware included                       |
| 7   | Free-trial behavior                              | **Available with limitations**                 | Device sync 30-day trial on Free; demo sandbox 14 days; optional Pro trial docs-only; extension helper unused          | Distinguish device trial vs free plan vs demo   |
| 8   | Credit card required for signup                  | **Available with limitations**                 | Free signup has no Stripe checkout; marketing “no credit card”; paid needs Stripe                                      | “No card for Free” only                         |
| 9   | Permanent free plan                              | **Confirmed and available**                    | Signup `plan: free`; no free-plan expiry; device ingest time-limited                                                   | Free forever for roster path within limits      |
| 10  | Signup flow                                      | **Confirmed and available**                    | `app/sign-up/[[...sign-up]]/page.tsx`; Clerk webhook provision                                                         | Self-serve exists                               |
| 11  | Organization setup                               | **Confirmed and available**                    | `lib/clerk/provision.ts`; ops provision also exists                                                                    | Self-serve + ops paths                          |
| 12  | First-location setup                             | **Confirmed and available**                    | Default “Main” location; setup business step                                                                           | Auto-created then renamed                       |
| 13  | Staff creation                                   | **Confirmed and available**                    | Setup `AddStaffForm`; Staff page                                                                                       | Manual add                                      |
| 14  | Staff import                                     | **Not found** / deferred                       | `docs/AGENT_CONTEXT_GTM_AUTH_PRICING.md` lists CSV import deferred; sample staff only                                  | Do not claim import                             |
| 15  | Shift preset setup                               | **Confirmed and available**                    | `lib/seed-default-shifts.ts`, `lib/shift-presets.ts`, setup Shifts step                                                | Strong SMB proof                                |
| 16  | First-roster creation                            | **Available with limitations**                 | Roster after setup; funnel `first_roster_`*                                                                            | Setup ≠ first published week                    |
| 17  | Copy-previous-week                               | **Confirmed and available**                    | `copy-previous` API; `copyPreviousWeek` in `lib/auto-scheduler.ts`                                                     | Safe claim; week 2+                             |
| 18  | Leave / day-off setup                            | **Available with limitations**                 | Requests APIs; manager path; sick/swap deferred                                                                        | Manager-entered                                 |
| 19  | Attendance setup                                 | **Available with limitations**                 | Setup grace/OT; full attendance in app                                                                                 | Optional for activation                         |
| 20  | Manual attendance                                | **Confirmed and available**                    | Attendance grid; manual punch source                                                                                   | Continues after device trial                    |
| 21  | Device attendance setup                          | **Available with limitations**                 | `/devices`, ADMS push; field-test docs                                                                                 | Not “minutes”; not included install             |
| 22  | Time to become usable                            | **Cannot verify** exact median                 | Funnel SLAs in hours/days; marketing says minutes                                                                      | Qualify; avoid absolute minutes                 |
| 23  | Required technical knowledge                     | **Available with limitations**                 | Roster path low; device path high                                                                                      | Split claims by path                            |
| 24  | Setup self-service                               | **Confirmed and available**                    | Setup wizard + guards                                                                                                  | Yes for core roster path                        |
| 25  | Onboarding support included                      | **Cannot verify** / **Not found** as SKU       | Contact copy only; automation email off                                                                                | Do not claim included onboarding                |
| 26  | Installation included                            | **Not found**                                  | No install SKU                                                                                                         | Avoid                                           |
| 27  | Hardware included                                | **Not found**                                  | Device slot ≠ terminal                                                                                                 | Avoid                                           |
| 28  | Payroll system included                          | **Not found**                                  | Positioning explicitly excludes                                                                                        | Avoid                                           |
| 29  | Employee mobile clock-in                         | **Not found**                                  | `docs/MOBILE_STRATEGY.md` OUT                                                                                          | Avoid                                           |
| 30  | Employee self-service                            | **Planned or documented only**                 | `/me` future in PRODUCT_NOTES / MOBILE_STRATEGY                                                                        | Avoid as available                              |
| 31  | Multiple locations manageable                    | **Available with limitations**                 | Schema + Free 2 / paid unlimited; roster default-location UX                                                           | Yes with caps; don’t oversell dashboard control |
| 32  | Multiple managers manageable                     | **Available with limitations**                 | Plan admin caps; Clerk membership; thin invite UX                                                                      | Yes on paid; Free = 1                           |
| 33  | Granular permissions                             | **Planned or documented only** / partial roles | Roles stored; API RBAC not wired                                                                                       | Do not claim complete ACL                       |
| 34  | SMS or WhatsApp included                         | **Available with limitations**                 | WhatsApp access/metering in code; SMS mostly docs; landing “Coming soon”                                               | Manual share OK; automated plan-specific        |
| 35  | Auto Scheduler available                         | **Coming soon** / flag off                     | `AUTO_SCHEDULER_ENABLED = false`; quota code exists                                                                    | Do not claim live                               |
| 36  | Shift swaps available                            | **Planned or documented only**                 | `docs/PRODUCT_NOTES.md` deferred                                                                                       | Avoid                                           |
| 37  | Employee availability complete                   | **Available with limitations**                 | Leave + soft shift preferences; no recurring windows                                                                   | Prefer “approved time off”                      |
| 38  | Suitable under 10                                | **Confirmed and available**                    | Free tier designed for this                                                                                            | Primary fit                                     |
| 39  | Suitable 10–50                                   | **Confirmed and available**                    | Plus hard cap 50                                                                                                       | Primary paid fit                                |
| 40  | Suitable 50–100                                  | **Available with limitations**                 | Pro cap 100; admin/device needs                                                                                        | Possible                                        |
| 41  | Suitable over 100                                | **Not found** as supported tier                | Hard block at 101                                                                                                      | Poor fit                                        |
| 42  | Suitable non-shift businesses                    | **Available with limitations**                 | Shift-template roster model                                                                                            | Weak / poor default fit                         |
| 43  | Project-based time tracking                      | **Not found**                                  | —                                                                                                                      | Poor fit                                        |
| 44  | Payroll-only buyers                              | **Not found**                                  | —                                                                                                                      | Poor fit                                        |
| 45  | Complex union/compliance                         | **Not found**                                  | Positioning avoids compliance software                                                                                 | Poor fit                                        |
| 46  | Desktop/tablet preferred for roster edit         | **Confirmed and available**                    | MOBILE_STRATEGY; roster grid width                                                                                     | State preference honestly                       |
| 47  | Staff view published schedules on mobile         | **Confirmed and available**                    | `/share/roster/[token]` responsive                                                                                     | Yes via share link                              |
| 48  | Managers edit schedules comfortably on mobile    | **Available with limitations**                 | Not fully audited; grid scroll                                                                                         | Do not claim mobile-first editing               |
| 49  | Pricing claims current                           | **Available with limitations**                 | Code matches $19.99/$49.99; landing omits some admin/WhatsApp detail; Coming soon tags stale                           | Align page to `PRICING.md` + `lib/plans.ts`     |
| 50  | Hidden limitations that make “simple” misleading | **Available with limitations**                 | No CSV import; first roster outside setup; Auto Scheduler off; RBAC thin; device complexity; one shift/day; staff caps | Disclose on page                                |


---

## Appendix A — Separation checklist for writers

### Confirmed small-business strengths

- Free ≤10 / Plus ≤50 / Pro ≤100 with clear monthly pricing  
- Self-serve signup and setup wizard  
- Weekly roster + leave visibility + copy week + publish/share  
- Manual attendance without hardware  
- Demo sandbox

### Setup friction

- First published week after setup  
- Manual staff entry (no CSV)  
- Device ADMS path  
- Default UTC until business settings  
- Activation lag reflected in funnel hours/days

### Product limitations

- No employee portal, phone clock-in, shift swaps  
- Auto Scheduler flagged off  
- One shift per day per person  
- Thin permissions

### Plan limitations

- Free location/admin/device caps  
- Hard staff ceilings  
- WhatsApp/SMS not universal

### Poor-fit types

- > 100 staff, payroll-only, project tracking, enterprise compliance, employee-app-first buyers

### Production behavior not fully verifiable from repo alone

- Live Stripe portal cancel/proration experience  
- Median time-to-first-publish  
- Whether contact “we help with devices” is consistently delivered  
- Physical terminal success rates in the field  
- Whether homepage “Coming soon” tags have been updated in production deploy

---

## Appendix B — Draft vs approved copy

Treat all suggested H1, title, meta, positioning sentence, and section headings as **drafts**. Do not treat them as owner-approved final marketing until reviewed.

---

*End of brief. Only this file was created for the small-business scheduling SEO page task.*