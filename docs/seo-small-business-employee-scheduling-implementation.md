# Small Business Employee Scheduling Landing Page Implementation

**Implemented:** 19 July 2026  
**Target URL:** `https://www.simplerosterplus.com/small-business-employee-scheduling`  
**Source brief:** `docs/seo-small-business-employee-scheduling-page-brief.md`

## 1. Files changed


| File                                                            | Change                                     |
| --------------------------------------------------------------- | ------------------------------------------ |
| `landing-page/small-business-employee-scheduling/index.html`    | Commercial landing page (copy + visuals)   |
| `landing-page/images/smb-scheduling-hero.webp` (+ `.png`)       | Hero lifestyle + roster visual             |
| `landing-page/images/smb-weekly-workflow.webp` (+ `.png`)       | Mid-page workflow roster visual            |
| `landing-page/index.html`                                       | Contextual pricing-foot link + footer link |
| `landing-page/employee-scheduling-software/index.html`          | Contextual fit-note link + footer link     |
| `landing-page/sitemap.xml`                                      | Canonical URL added once                   |
| `docs/seo-small-business-employee-scheduling-implementation.md` | This implementation record                 |
| `docs/seo-small-business-employee-scheduling-page-brief.md`     | Brief; visuals note updated after ship     |


No application functionality, pricing source of truth, Auto Scheduler flags, employee self-service, staff import, or legal `noindex` pages were changed.

## 2. Final metadata, H1, and canonical

- **Title:** `Employee Scheduling Software for Small Business | Simple Roster Plus`
- **Meta description:** `Weekly staff scheduling for small businesses. Free for up to 10 staff. Build, publish, and share rosters—plus attendance—without enterprise HR complexity.`
- **Canonical:** `https://www.simplerosterplus.com/small-business-employee-scheduling`
- **Robots:** `index, follow`
- **H1:** `Simple Employee Scheduling Software for Small Businesses`
- **Open Graph / Twitter:** Aligned title, description, canonical URL, and `smb-scheduling-hero.png` image

## 3. Page structure

1. Hero (H1, CTAs, Free for up to 10 staff proof)
2. Built for Small, Shift-Based Teams
3. How Small Teams Get Started
4. Weekly Scheduling Without the Enterprise Stack (short workflow + link to scheduling page)
5. Clear Limits on Free, Plus, and Pro
6. What Your Staff Can Access
7. What Simple Roster Plus Does Not Include
8. Is This the Right Fit for Your Business? (including poor-fit list)
9. Pricing CTA (Start Free / Explore demo)
10. Employee Scheduling Questions for Small Businesses (FAQ)
11. Closing CTA

## 4. Confirmed claims used

- Permanent Free plan; Free up to 10 staff, 2 locations, 1 admin
- Free device slot with 30-day live sync trial
- Plus $19.99/month, up to 50 staff, unlimited locations, 2 admins, 1 device
- Pro $49.99/month, up to 100 staff, unlimited locations, 5 admins, 3 devices
- Extra admins +$2/month; extra devices +$5/month
- Paid unlimited locations do not remove staff caps
- Free roster path remains after device trial; manual attendance without hardware
- Self-service signup; guided setup; default location; default shift presets
- Manual staff creation; weekly roster; reusable presets; copy previous week
- Approved leave visibility; draft/published; read-only share; mobile browser viewing for published schedules
- Seeded demo sandbox
- Desktop/tablet preferred for roster editing

## 5. Plan limits shown

Exact Free / Plus / Pro staff, location, admin, device, and add-on amounts listed in section `#limits`, matching `docs/PRICING.md` and `lib/plans.ts`.

## 6. Setup wording used

- Guided setup configures business, shifts, roles, and staff before the first roster
- First published week still requires assigning real staff
- Copy previous week reduces repeat work after the first schedule
- Core roster setup is self-service; device setup called out separately
- Hardware not included

## 7. Claims excluded

The page does **not** claim:

- Unlimited staff / managers / Free locations
- Built for teams of any size / every small business
- Set up in minutes / no training / zero-effort setup
- Mobile-first manager schedule editing
- Employee self-service, phone clock-in, shift swaps
- Live Auto Scheduler or automatic schedule generation (labeled **Coming soon** only)
- Payroll, hardware, or installation included
- Full HRIS / complex compliance / complete recurring availability / fine-grained enterprise permissions
- SMS or WhatsApp on every plan
- No hidden fees / onboarding included
- Start Free Trial

## 8. Poor-fit wording

Honest qualification list for: teams over 100; payroll-only; project time tracking; fixed office-calendar-only needs; complex union/compliance; employee apps / swaps / phone or GPS clock-in; hardware or installation expectations.

## 9. Internal links added

**On the new page:**

- `/` (employee roster software)
- `/employee-scheduling-software`
- `/employee-attendance-software`
- `/zkteco-attendance-integration`
- `/#pricing`
- `/privacy`
- `/terms`
- Absolute app signup, demo (`?intent=demo`), and login

**Homepage:**

- Pricing foot contextual link to `/small-business-employee-scheduling`
- Footer: “Small business scheduling”

**Scheduling page:**

- Fit-note contextual link
- Footer: “Small business scheduling”

## 10. Sitemap update

`landing-page/sitemap.xml` includes:

`https://www.simplerosterplus.com/small-business-employee-scheduling`

once, monthly changefreq, priority 0.8.

## 11. Structured data

`WebPage` + `BreadcrumbList` in `@graph`:

- `#webpage` and `#breadcrumb` stable IDs under the canonical URL
- `about` → `https://www.simplerosterplus.com/#software`
- `isPartOf` → `#website`
- No duplicate `SoftwareApplication`
- No `FAQPage` schema
- No unsupported feature lists in schema

## 12. Images used

- Hero: `landing-page/images/smb-scheduling-hero.webp` (+ PNG fallback) — small-business manager reviewing a weekly roster on a laptop
- Workflow: `landing-page/images/smb-weekly-workflow.webp` (+ PNG fallback) — illustrative roster UI emphasizing copy previous week, presets, share, and leave cells
- Social: OG/Twitter absolute image URL points to `https://www.simplerosterplus.com/images/smb-scheduling-hero.png`
- Dimensions ~1350×900, descriptive alt, WebP `<source>`, responsive `max-width: 100%`
- Generated to match page copy; no Auto Scheduler button, employee-app, drag-and-drop, import, or hardware-included marketing imagery
- Note: workflow mock is illustrative marketing UI, not a live product screenshot claim

### Visual update (19 July 2026)

Replaced the shared `app-roster-week` asset on this page with dedicated SMB hero and workflow images so the visuals match small-business fit copy (under-10 team context, leave visibility, copy-previous / presets / share) without advertising Auto Scheduler as live.

## 13. Local validation performed

- One H1
- Correct title, meta description, canonical
- No localhost / staging / `vercel.app` URLs
- Absolute app signup/demo/login links only
- Forbidden-claim scan clean for listed risky phrases
- Auto Scheduler only as “coming soon”
- Plan limits match code/docs numbers
- `overflow-x: hidden` and fluid grids for narrow viewports (owner should still smoke-test 320–1440px in browser)

## 14. Manual production checks after deployment

Owner should verify:

- `https://www.simplerosterplus.com/small-business-employee-scheduling` returns 200
- Trailing slash redirects with 308
- `/small-business-employee-scheduling/index.html` redirects with 308
- Canonical is correct; one H1
- Homepage contextual + footer links work
- Scheduling-page contextual + footer links work
- Sitemap contains the URL once
- Signup / demo / login work without JavaScript
- WebP loads with PNG fallback
- Structured data parses (Rich Results / Schema validator)
- Layout at mobile / tablet / desktop; no horizontal overflow
- No unsupported claims in live HTML
- Search Console live URL test + request indexing

---

*End of implementation record.*