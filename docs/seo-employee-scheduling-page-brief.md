# Employee Scheduling Software Page — Evidence-Based Content Brief

**Prepared:** 16 July 2026  
**Target URL:** `https://www.simplerosterplus.com/employee-scheduling-software`  
**Primary keyword:** `employee scheduling software`  
**Scope:** Content and implementation brief only. No landing page, navigation, schema, sitemap, or image changes are included.

---

## 1. Page objective

Create a focused commercial landing page for people searching for employee scheduling software, especially managers moving away from spreadsheets, paper, and group chats.

The page should:

- Explain how Simple Roster Plus helps a manager build and manage a weekly employee schedule.
- Lead with roster planning, shift assignment, leave visibility, and publishing.
- Use attendance only as a supporting differentiator: the published roster becomes the expected schedule against which clock-ins are reviewed.
- Convert qualified visitors to **Start Free** or **Explore demo**.
- Avoid competing with the homepage's broader `employee roster software` focus.
- Avoid absorbing the future attendance and ZKTeco pages' search intent.

### Desired reader takeaway

> Simple Roster Plus gives a small or shift-based team a practical weekly roster: create reusable shifts, assign staff, account for approved time off, copy last week, publish, and share.

---

## 2. Target audience

### Primary audience

- Owners and managers of small, shift-based businesses
- Managers responsible for building the weekly roster
- Teams currently scheduling in spreadsheets, paper rosters, or group chats
- Businesses that need a simple schedule rather than an enterprise HR suite

### Relevant operating environments

Existing marketing copy identifies:

- Retail and gas
- Restaurants
- Clinics
- Security
- Cleaning teams
- Multi-shift sites

Evidence: `landing-page/index.html` (homepage audience strip).

### Primary problems

- Rebuilding similar schedules every week
- Re-entering the same shift times
- Assigning staff without clear leave visibility
- Sharing screenshots or files that quickly become outdated
- Keeping the roster separate from attendance records

### Poor-fit audience

The page should not target buyers primarily seeking:

- Payroll processing or tax filing
- Enterprise workforce optimization
- Demand forecasting
- Shift bidding or an open-shift marketplace
- Employee shift swapping
- Native iOS/Android scheduling apps
- Complex role-based workforce permissions

---

## 3. Search intent

### Primary intent: commercial investigation

Searchers using `employee scheduling software` are comparing products and expect to see:

- How schedules are created
- How shifts and employees are managed
- How the schedule is shared
- Whether time off and scheduling conflicts are handled
- Whether the product works for a small team
- Pricing or a clear path to try the product

### Secondary intent: product evaluation

Supporting queries such as `staff scheduling app`, `shift planner software`, and `work schedule software` indicate a reader who wants screenshots, concrete workflows, and answers about mobile access.

### Content boundary

This URL should own the **schedule creation and management** intent.

- Homepage owns: `employee roster software`
- This page owns: `employee scheduling software`
- Future attendance page owns: attendance tracking, lateness, absence, worked time
- Future ZKTeco page owns: device support, ADMS setup, compatibility limitations

---

## 4. Primary and supporting keywords

### Primary keyword

- employee scheduling software

### Supporting keywords

- staff scheduling software
- shift scheduling software
- employee scheduling app
- staff scheduling app
- shift planner software
- work schedule software

### Related language to use naturally

- weekly employee schedule
- weekly staff roster
- create and publish a roster
- assign employees to shifts
- reusable shift presets
- copy last week's schedule
- approved leave and days off
- scheduled versus actual attendance
- small shift-based teams

### Keyword usage guidance

- Use the primary keyword in the title, H1, opening copy, and one section heading or FAQ answer.
- Use `software`, `platform`, and `web app` accurately. Do not imply a native mobile app.
- Use `roster` throughout to preserve product positioning.
- Avoid repeating all keyword variants mechanically.

---

## 5. Confirmed product capabilities

The strongest safe proof points are below. Detailed classification for all 25 requested capabilities is in the final evidence table.

### Build a weekly roster

- A roster week is created per location and week, defaulting to draft.
- The UI displays seven days and staff rows.
- Managers can move between previous, current, and next weeks.

Evidence:

- `app/(authenticated)/roster/page.tsx`
- `prisma/schema.prisma` — `RosterWeek`, `RosterEntry`
- `lib/roster-week.ts`

### Create reusable shift presets

Managers can create, edit, and delete named shift presets with:

- Start time
- End time
- Unpaid break
- Color

Common presets can be added with one action during setup.

Evidence:

- `app/(authenticated)/roster/templates-manager.tsx`
- `app/api/roster/templates/route.ts`
- `app/api/roster/templates/[id]/route.ts`
- `prisma/schema.prisma` — `ShiftTemplate`
- `lib/shift-presets.ts`

### Assign staff to shifts

- A shift preset can be assigned to a staff member on a specific day.
- A preset can be applied across the employee's editable days in one batch action.
- The same preset can be assigned to multiple employees.
- Each employee can have only one roster entry per day in a roster week.

Evidence:

- `app/(authenticated)/roster/roster-grid.tsx`
- `app/api/roster/weeks/[id]/entries/route.ts`
- `app/api/roster/weeks/[id]/entries/batch/route.ts`
- `prisma/schema.prisma` — unique key on `(rosterWeekId, staffId, date)`

### See leave while scheduling

- Approved vacation and day-off records appear as blocked roster cells.
- Write APIs reject an assignment on approved leave.
- Approving leave warns when existing roster shifts will be cleared.
- Shift requests can be shown as soft preference cues.

Evidence:

- `lib/leave-blocks.ts`
- `app/(authenticated)/roster/page.tsx`
- `app/(authenticated)/roster/requests-modal.tsx`
- `app/api/roster/weeks/[id]/entries/route.ts`
- `app/api/requests/vacation/[id]/route.ts`
- `app/api/requests/day-off/[id]/route.ts`
- `lib/requests.ts`
- `prisma/schema.prisma` — `StaffVacation`, `StaffDayOff`, `StaffShiftRequest`

### Copy the previous week

- Managers can copy the prior week's shifts into the target week.
- The operation preserves locked days, closed holidays, and approved leave.
- This standalone action remains available even though Auto Scheduler is disabled.

Evidence:

- `app/(authenticated)/roster/roster-grid.tsx`
- `app/api/roster/weeks/[id]/copy-previous/route.ts`
- `lib/auto-scheduler.ts` — `copyPreviousWeek`

### Draft, publish, and share

- Roster weeks support `draft` and `published` states.
- Publishing creates an unguessable share token.
- A published roster can be shared through a read-only link, copied, opened, printed, downloaded as PNG, or manually handed off to WhatsApp.
- Returning to draft disables the public view until republished.
- Publishing warns about calculated open slots but allows an acknowledged override.

Evidence:

- `prisma/schema.prisma` — `RosterWeekStatus`, `shareToken`
- `app/api/roster/weeks/[id]/status/route.ts`
- `app/(authenticated)/roster/roster-share-controls.tsx`
- `app/share/roster/[token]/page.tsx`
- `app/share/roster/[token]/share-roster-client.tsx`
- `lib/roster-share-data.ts`

### Connect the roster to attendance

- Attendance data loads expected start/end times from roster entries.
- Each scheduled day can resolve to scheduled, present, late, or absent based on clock-ins and a grace setting.
- This supports the product message “compare what was scheduled with what actually happened.”

Evidence:

- `lib/attendance-week.ts`
- `lib/attendance-policy.ts`
- `app/(authenticated)/attendance/attendance-grid.tsx`

This is a supporting benefit on this page, not the main content theme.

---

## 6. Product limitations

### Shift model

- A roster cell references one reusable `ShiftTemplate`; it does not store arbitrary per-cell start/end times.
- One employee can have only one roster entry per day.
- There is no implemented split-shift or multiple-shifts-per-day workflow.
- There is no bulk action that assigns one shift to multiple selected employees at once.

### Availability and employee self-service

- Approved vacation and day off are supported.
- Shift requests are soft preferences only.
- Recurring availability windows were not found.
- Employees do not currently have a `/me` portal to submit availability or see a personalized authenticated schedule.
- Requests are currently entered and managed through the manager-facing workflow.

### Conflict handling

- Leave conflicts and closed holidays are handled.
- Duplicate same-day entries are prevented by the database model.
- General overlapping-shift detection is not needed under the one-entry-per-day model and was not found.
- Scheduling rules code exists, but `SCHEDULING_RULES_ENABLED = false`.

### Open shifts and coverage

The app's “open slot” calculation counts active, available staff-days without an assignment. It is not a demand model and does not express:

- Required headcount per shift
- Open jobs that employees can claim
- Labor-demand forecasting
- Department-specific coverage targets

Evidence: `lib/roster-coverage.ts`.

### Multi-location and departments

- Organizations can have multiple locations.
- Each staff member has one primary location.
- Each roster week belongs to one location.
- The current roster page loads the organization's default location; a direct roster location switcher was not found.
- Departments exist as staff metadata, but the roster is not built or filtered by department in the inspected page.

### Mobile

- The public share page and surrounding controls use responsive layouts.
- The manager roster grid has a minimum width of `58rem` and uses horizontal scrolling.
- Repository documentation explicitly says manager-on-phone use has not received a full audit.
- There is no native app.

Evidence:

- `app/(authenticated)/roster/roster-grid.tsx`
- `app/share/roster/[token]/share-roster-client.tsx`
- `docs/MOBILE_STRATEGY.md`

### Permissions and audit

- App users have owner/admin/member roles in the database.
- Scheduling APIs scope data by authenticated organization.
- Role-specific scheduling permissions are not enforced in the inspected roster APIs; the session payload does not carry a tenant role.
- No roster revision history or per-change audit log was found.
- Leave approvals do record decision metadata, and notification sends have logs, but these are not roster change history.

### Automation and notifications

- Auto Scheduler has substantial implementation code but is disabled and its APIs return “not available yet.”
- Scheduling rules are also disabled.
- Automated SMS is not implemented.
- Automated WhatsApp code exists but requires a paid entitlement, org toggle, per-staff opt-in, Twilio configuration, approved template, public HTTPS URL, and remaining monthly quota. Production provider configuration cannot be verified from the repository.

---

## 7. Unsafe or unsupported claims

Do not put the following claims on the scheduling page.


| Unsafe claim                                     | Why it is unsafe                                                                                                | Evidence                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| “Automatically creates your schedule”            | Auto Scheduler is disabled                                                                                      | `lib/auto-scheduler-feature.ts`; Auto Scheduler preview/apply routes return 403 |
| “Auto Scheduler fills every open shift”          | Disabled; suggestions depend on history and can skip cells                                                      | `lib/auto-scheduler.ts`                                                         |
| “Built-in advanced scheduling rules”             | Scheduling rules flag is false                                                                                  | `lib/auto-scheduler-feature.ts`                                                 |
| “Employees set their availability in the app”    | No employee portal or recurring availability model found                                                        | `docs/MOBILE_STRATEGY.md`; `docs/PRODUCT_NOTES.md`                              |
| “Employees swap shifts”                          | Explicitly deferred                                                                                             | `docs/PRODUCT_NOTES.md`                                                         |
| “Send schedules by SMS”                          | SMS/email channels remain unimplemented                                                                         | `docs/ROSTER_PUBLISH_SMS_NOTES.md`                                              |
| “Notify employees automatically on every change” | WhatsApp supports publish/direct sends; change-alert workflow was not verified                                  | `lib/messaging/roster-whatsapp-notify.ts`                                       |
| “Native employee scheduling app”                 | Web app only; native app is a future decision                                                                   | `docs/MOBILE_STRATEGY.md`                                                       |
| “Mobile scheduling from anywhere”                | Share flow is responsive, but roster editing is a wide scrollable grid and has not been fully audited on phones | `roster-grid.tsx`; `docs/MOBILE_STRATEGY.md`                                    |
| “Manage multiple sites from one scheduling view” | Multiple locations exist, but roster page uses the default location and no combined view was found              | `app/(authenticated)/roster/page.tsx`                                           |
| “Schedule by department”                         | Department is staff metadata; department scheduling UI not found                                                | `prisma/schema.prisma`; roster page                                             |
| “Multiple shifts per employee per day”           | Unique roster entry per employee/day                                                                            | `prisma/schema.prisma`                                                          |
| “Drag-and-drop scheduling”                       | No drag-and-drop implementation verified                                                                        | roster UI code                                                                  |
| “Prevent every scheduling conflict”              | Leave/holiday conflicts are covered; broad overlap/availability rules are not                                   | roster write APIs; request APIs                                                 |
| “Forecast labor demand”                          | No demand forecasting found                                                                                     | repository search                                                               |
| “Employees claim open shifts”                    | Open slots are manager-facing unassigned staff-days, not a marketplace                                          | `lib/roster-coverage.ts`                                                        |
| “Complete audit history”                         | No roster revision/change log found                                                                             | `prisma/schema.prisma`                                                          |
| “Payroll automation”                             | Product intentionally exports/prepares data but does not run payroll                                            | `landing-page/index.html`; `docs/PRICING.md`                                    |
| “Unlimited staff on paid plans”                  | Plus is capped at 50; Pro at 100                                                                                | `lib/plans.ts`; `lib/plan-limits.ts`                                            |
| “Unlimited locations on every plan”              | Free is limited to two locations                                                                                | `lib/plans.ts`; `lib/plan-limits.ts`                                            |
| “Automated WhatsApp is available to everyone”    | Entitlement, opt-in, configuration, and caps apply; production setup cannot be verified                         | `lib/messaging/roster-whatsapp-notify.ts`                                       |


### Claims requiring especially careful wording

#### “Open shifts”

Use:

> Spot unassigned days before publishing.

Avoid:

> Automatically identify every staffing gap.

The current calculation treats every available staff-day without a shift as an open slot; it does not compare staffing against required demand.

#### “Availability”

Use:

> See approved vacation and days off while building the roster.

Avoid:

> Manage complete employee availability.

#### “Multiple locations”

Use:

> Keep roster weeks tied to a specific location.

Avoid:

> Schedule every location from one unified view.

#### “Planned versus actual hours”

Use:

> Connect scheduled shifts to attendance status so managers can see who was scheduled, present, late, or absent.

Avoid:

> Automatically reconcile every scheduled hour with payroll-ready actual hours.

---

## 8. Recommended page positioning

### Positioning statement

> Simple employee scheduling software for small teams that need to build a weekly roster, assign clear shifts, account for approved time off, and publish one schedule everyone can access.

### Differentiation

1. **Roster-first simplicity:** weekly scheduling without a large HR suite.
2. **Reusable work:** shift presets and copy-previous-week reduce repetitive setup.
3. **Clear exceptions:** approved leave and closed holidays are visible while scheduling.
4. **Simple publishing:** draft, publish, share link, print, and image download.
5. **Schedule connected to reality:** attendance can show whether a planned shift became present, late, or absent.

### Content balance

Suggested emphasis:

- 70% schedule creation and management
- 20% publishing and staff access
- 10% attendance connection

Do not lead with attendance devices, clock-in methods, pay-period reporting, or ZKTeco.

---

## 9. Recommended page outline

### 1. Hero

- Employee scheduling focus
- Small/shift-based team qualifier
- One-sentence workflow: build, assign, publish
- Primary CTA: Start Free
- Secondary CTA: Explore demo
- Existing roster screenshot

### 2. Problem: the weekly schedule should not start from zero

Address spreadsheets, paper, and group chats without turning the section into a generic productivity essay.

### 3. Build the weekly roster in one clear view

Show:

- Week navigation
- Staff rows and daily assignments
- Reusable shift presets
- Scheduled-hour indicators

### 4. Reuse the shifts and patterns that already work

Show:

- Named shift presets
- Start/end times, breaks, and colors
- Apply a shift across one employee's week
- Copy the previous week

Do not imply templates generate full staffing plans automatically.

### 5. Schedule around approved time off

Show:

- Vacation and days-off blocks
- Closed holidays
- Leave conflict warning and controlled clearing
- Shift preference cues, described as preferences rather than hard availability

### 6. Check the week before publishing

Show:

- Daily counts
- Unassigned/open-slot warning with careful wording
- Draft state
- Publish confirmation

### 7. Publish and share one roster

Show:

- Read-only share link
- Print
- Download PNG
- Manual WhatsApp link handoff

Keep automated messaging out of the main value proposition until deployment and entitlement messaging are reconciled.

### 8. Connect the schedule to attendance

One short supporting section:

- Roster supplies expected shifts
- Attendance compares clock-ins to planned start times
- Managers can see scheduled, present, late, and absent

Link to the future attendance page when it exists.

### 9. Pricing / fit summary

Keep concise and use canonical pricing:

- Free: up to 10 staff, up to 2 locations
- Plus: up to 50 staff
- Pro: up to 100 staff

Do not imply all communication features are included on all tiers.

### 10. FAQ

Use only evidence-backed questions in §17.

### 11. Closing CTA

Reinforce weekly roster outcome, not attendance or automation.

---

## 10. Suggested H1

### Recommended

**Employee Scheduling Software That Keeps Every Shift Clear**

Why it works:

- Exact primary keyword appears once.
- The benefit is understandable without overstating automation.
- It leaves room for roster-first supporting copy.

### Alternative

**Build and Share Weekly Employee Schedules Without the Spreadsheet**

Use only if avoiding exact-match H1 language becomes a copy priority. The recommended H1 is stronger for the stated SEO target.

### Suggested hero supporting copy

> Create a weekly staff roster, assign reusable shifts, account for approved time off, and publish one clear schedule for your team.

This is safer than the original draft's broad “manage changes” phrase, which could imply automatic change notifications or a change-history system.

---

## 11. Suggested SEO title

**Employee Scheduling Software for Small Teams | Simple Roster Plus**

This matches the approved starting direction and differentiates the page from the homepage title:

`Employee Roster Software for Small Teams | Simple Roster Plus`

---

## 12. Suggested meta description

**Create weekly employee schedules, assign reusable shifts, manage approved time off and publish a clear staff roster with Simple Roster Plus.**

Length: 140 characters.

Alternative:

**Employee scheduling software for small teams to build weekly rosters, assign shifts, account for time off and share one clear schedule.**

Avoid mentioning Auto Scheduler, SMS, universal mobile scheduling, or shift swaps in metadata.

---

## 13. Recommended section headings

1. **Build the Weekly Schedule in One Clear View**
2. **Reuse Shift Presets Instead of Retyping Hours**
3. **Assign Staff and See the Week Take Shape**
4. **Keep Approved Time Off Visible While You Schedule**
5. **Copy Last Week and Adjust What Changed**
6. **Review Gaps Before You Publish**
7. **Publish and Share One Read-Only Roster**
8. **Connect Scheduled Shifts to Attendance**
9. **Employee Scheduling Software for Small, Shift-Based Teams**
10. **Employee Scheduling Questions**

Avoid headings such as:

- “Automate Your Entire Schedule”
- “Let Employees Manage Their Own Shifts”
- “Eliminate Every Scheduling Conflict”
- “Schedule Every Location from One Dashboard”

---

## 14. Suggested calls to action

### Primary CTA

**Start Free**

Target:

`https://app.simplerosterplus.com/sign-up`

### Secondary CTA

**Explore demo**

Target:

`https://app.simplerosterplus.com/sign-up?intent=demo`

### Optional contextual CTA labels

- **Build your first roster**
- **See the scheduling demo**

Use the existing CTA URL wiring pattern from `landing-page/index.html`, but keep absolute raw HTML URLs so links work without JavaScript.

Do not use:

- “Start Auto Scheduling”
- “Download the App”
- “Text My Team”

---

## 15. Internal links

### Links that can exist at first publication


| Destination          | Suggested anchor           | Purpose                         |
| -------------------- | -------------------------- | ------------------------------- |
| Homepage `/`         | employee roster software   | Preserve roster-first hierarchy |
| Homepage `/#pricing` | Simple Roster Plus pricing | Pricing detail                  |
| App signup           | Start Free                 | Conversion                      |
| App demo signup      | Explore demo               | Conversion                      |
| Privacy page         | Privacy policy             | Footer                          |
| Terms page           | Terms of service           | Footer                          |


### Add only when future pages exist


| Future destination               | Suggested anchor                        |
| -------------------------------- | --------------------------------------- |
| `/employee-attendance-software`  | employee attendance software            |
| `/zkteco-attendance-integration` | supported ZKTeco attendance integration |


Do not add links to unpublished URLs or include them in navigation/sitemap during this brief phase.

### Homepage link opportunity after publication

Add one contextual link from the homepage scheduling feature to this page. Keep the homepage focused on `employee roster software`; use a descriptive anchor such as **employee scheduling software** or **weekly employee scheduling**.

---

## 16. Recommended screenshots or product visuals

### Primary hero visual

Use the existing roster screenshot:

- `landing-page/images/app-roster-week.webp`
- PNG fallback: `landing-page/images/app-roster-week.png`

Why:

- It is already used on the homepage.
- It depicts the weekly roster, shift presets, coverage counts, and color-coded assignments.
- It matches scheduling intent better than the attendance screenshot.

### Recommended detail crops for later implementation

If crops can be created from existing product screenshots without misrepresenting the UI:

1. Shift preset manager: names, times, breaks, colors
2. Roster grid with vacation/day-off blocks
3. Draft/publish/share controls
4. Copy previous week action
5. Public read-only roster view

No new images should be created as part of this brief.

### Supporting attendance visual

If used, place `solution-attendance.webp` only in the short scheduled-versus-actual section. Do not use it as the hero.

### Avoid

- `solution-auto-scheduler.`* as primary scheduling proof because the feature is disabled
- Device imagery or ZKTeco setup visuals
- Mockups showing shift swaps, native apps, drag-and-drop, or employee self-service

---

## 17. FAQ topics grounded in actual product functionality

### What can I use Simple Roster Plus to schedule?

Answer around weekly, location-specific staff rosters using reusable shift presets.

### Can I copy last week's employee schedule?

Yes. Clarify that eligible shifts copy into editable days while approved leave, closed holidays, and locked days are respected.

### Can I create reusable shifts?

Yes. Mention name, start/end time, unpaid break, and color.

### Can I see leave while building the schedule?

Yes for approved vacation and approved days off. Do not claim complete recurring availability management.

### Can I publish and share the schedule?

Yes. Mention read-only link, print, PNG download, and manual sharing.

### Can employees see their schedules?

They can open the published read-only full-roster link. Clarify that a personalized employee portal is not currently available.

### Does it support multiple locations?

Yes, rosters and staff are tied to locations. Avoid promising a combined multi-site scheduling view. If pricing is included, state Free supports up to two locations; paid tiers allow more.

### Does it prevent scheduling conflicts?

It blocks assignments on approved leave and closed holidays and warns when leave approval overlaps existing shifts. Do not claim universal conflict prevention.

### Does Simple Roster Plus track attendance too?

Yes, as a supporting capability: roster shifts provide expected times used to classify attendance as scheduled, present, late, or absent.

### Is Auto Scheduler available?

If included at all, answer plainly: **Coming soon.** Today, managers can copy the previous week and edit it manually.

### Is there an employee scheduling mobile app?

Do not add this FAQ unless the answer is intentionally transparent: it is a web application; the share page can be opened in a mobile browser, while full manager roster editing is better suited to desktop/tablet and has not been fully audited on phones.

---

## 18. Structured-data recommendation

Do not implement schema in this brief.

When the page is built, recommend:

### WebPage

- `@type`: `WebPage`
- `name`: page title
- `url`: canonical target URL
- `description`: final meta description
- `isPartOf`: homepage `WebSite` entity
- `about`: existing `SoftwareApplication` entity

### BreadcrumbList

Suggested breadcrumb:

1. Home
2. Employee Scheduling Software

### SoftwareApplication

Prefer referencing or extending the same product entity already defined on the homepage rather than creating a contradictory second product. Use the stable ID:

`https://www.simplerosterplus.com/#software`

### FAQPage

Only add FAQPage if:

- The FAQ is visible in the rendered page.
- Answers exactly match the visible copy.
- Current search-engine eligibility and policy are rechecked at implementation time.

Do not add ratings, reviews, testimonials, or fabricated offers.

---

## 19. Implementation notes for the static HTML site

### Architecture

The marketing site is hand-authored static HTML:

- Entry page: `landing-page/index.html`
- Inline CSS and JavaScript
- No CMS, generator, shared templates, or build pipeline
- No repository `vercel.json`

Evidence:

- `docs/seo-validation-audit.md`
- `docs/seo-phase-1-implementation.md`
- `landing-page/LANDING-PAGE.md`

### Source-path decision

The target public URL is extensionless. Before implementation, verify Vercel's current clean-URL behavior. Two viable static layouts are:

1. `landing-page/employee-scheduling-software/index.html`
2. A flat HTML file plus an explicit hosting rewrite

Because redirects/rewrites are not currently stored in the repository, do not assume a flat `.html` file will automatically produce the target URL.

### Required head elements

- Title from §11
- Meta description from §12
- Absolute canonical:
`https://www.simplerosterplus.com/employee-scheduling-software`
- `index, follow`
- OG/Twitter fields aligned with the page
- Absolute `www` URLs for marketing assets and structured data
- Existing favicons and brand assets

### Page construction

- Reuse the homepage's design tokens and responsive patterns.
- Keep semantic H1/H2/H3 order.
- Use one H1.
- Keep core copy directly in HTML.
- Use `<picture>` with existing WebP and PNG fallback.
- Preserve image dimensions and descriptive alt text.
- Use absolute app CTA URLs in raw HTML.
- Do not copy the entire homepage into the child page.

### Navigation

- Do not add links to future attendance or ZKTeco pages until they exist.
- Once this page is live, add it to homepage/footer navigation through a controlled follow-up.
- Add the URL to `landing-page/sitemap.xml` only when the file is deployed and returns 200.

### Canonical host

Use `https://www.simplerosterplus.com` consistently. Apex-to-www redirect remains an external deployment check.

### Content QA before publication

- Recheck `AUTO_SCHEDULER_ENABLED`.
- Recheck SMS and WhatsApp ship status.
- Confirm current pricing limits.
- Verify the target URL returns 200 and no duplicate `.html` URL is indexable.
- Verify no staging/app URLs are used as canonical URLs.

---

## 20. Final evidence table

Status definitions:

- **Confirmed and available**
- **Available with limitations**
- **Coming soon**
- **Planned or documented only**
- **Not found**
- **Cannot verify**


| #   | Capability                          | Classification                            | Repository evidence                                                                                                          | Safe marketing interpretation                                                                                                  |
| --- | ----------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Weekly roster creation              | **Confirmed and available**               | `app/(authenticated)/roster/page.tsx` upserts a location/week roster in draft; `RosterWeek` in `prisma/schema.prisma`        | Build a weekly staff roster in a seven-day view                                                                                |
| 2   | Shift creation and editing          | **Available with limitations**            | `templates-manager.tsx`; template POST/PATCH APIs; roster entry PUT                                                          | Create/edit reusable shift definitions, then assign them; no arbitrary per-cell time editing or split shifts                   |
| 3   | Reusable shift presets/templates    | **Confirmed and available**               | `ShiftTemplate`; `templates-manager.tsx`; `lib/shift-presets.ts`                                                             | Save named shifts with times, breaks, and colors                                                                               |
| 4   | Employee assignment to shifts       | **Confirmed and available**               | entries PUT and roster grid `setCell`                                                                                        | Assign a shift preset to an employee on a day                                                                                  |
| 5   | Multiple employees per shift        | **Available with limitations**            | Many `RosterEntry` rows may reference one template; day counts in `roster-grid.tsx`                                          | Assign the same shift preset to multiple employees; no multi-select group assignment found                                     |
| 6   | Multiple locations or departments   | **Available with limitations**            | `Location`, `Department`, staff `locationId`; roster page uses `getDefaultLocation`; location API                            | Location-specific rosters are supported; no combined multi-site or department scheduling view verified                         |
| 7   | Availability handling               | **Available with limitations**            | `StaffShiftRequest` soft preferences; `getShiftPreferenceMap`; leave blocks                                                  | Show shift preferences and approved time off; do not claim recurring/full availability management                              |
| 8   | Leave/time-off visibility           | **Confirmed and available**               | `lib/leave-blocks.ts`; roster page block map; entry APIs reject approved leave                                               | See and respect approved vacation/days off while scheduling                                                                    |
| 9   | Scheduling conflicts                | **Available with limitations**            | leave conflict preview/force flow; holiday/leave rejection; rules disabled                                                   | Prevent assignments on approved leave/closed holidays and warn on leave overlap—not universal conflict prevention              |
| 10  | Duplicate assignments               | **Confirmed and available** as prevention | Unique `(rosterWeekId, staffId, date)`; upsert writes                                                                        | An employee cannot have duplicate roster entries for the same day; this also means only one shift/day                          |
| 11  | Unfilled or open shifts             | **Available with limitations**            | `lib/roster-coverage.ts`; publish warning in status route                                                                    | Flag unassigned staff-days before publish; not staffing-demand forecasting or claimable open shifts                            |
| 12  | Shift swaps                         | **Planned or documented only**            | `docs/PRODUCT_NOTES.md`: deferred                                                                                            | Do not market                                                                                                                  |
| 13  | Draft versus published rosters      | **Confirmed and available**               | `RosterWeekStatus`; status API; share controls                                                                               | Keep a roster in draft, publish it, or return it to draft                                                                      |
| 14  | Publishing and sharing schedules    | **Confirmed and available**               | share token, public page, copy/open/print/PNG/manual WhatsApp                                                                | Publish a read-only roster link and share or print it                                                                          |
| 15  | Employee notifications              | **Available with limitations**            | WhatsApp notification sender/logs; entitlement and opt-in checks                                                             | Automated WhatsApp roster links exist for eligible/configured accounts; operational production setup cannot be verified        |
| 16  | SMS roster publishing               | **Coming soon**                           | no SMS sender; `ROSTER_PUBLISH_SMS_NOTES.md` says SMS/email still out; homepage marks coming soon                            | Do not claim available                                                                                                         |
| 17  | Auto Scheduler                      | **Coming soon**                           | implementation in `lib/auto-scheduler.ts`, but `AUTO_SCHEDULER_ENABLED = false`; APIs return 403                             | Label coming soon only; do not describe as available scheduling automation                                                     |
| 18  | Copying a previous week             | **Confirmed and available**               | standalone copy route and `copyPreviousWeek`; roster UI button                                                               | Copy last week's eligible shifts, then adjust                                                                                  |
| 19  | Planned versus actual hours         | **Available with limitations**            | attendance loads expected roster times and resolves statuses; scheduled totals in roster; pay-period worked time is separate | Compare scheduled shifts with attendance status; do not claim a complete scheduled-hours-vs-worked-hours reconciliation report |
| 20  | Mobile usability                    | **Available with limitations**            | responsive share page; roster grid `min-w-[58rem]`/horizontal scroll; `MOBILE_STRATEGY.md` says not fully audited            | Published roster works in a browser; avoid “mobile-first scheduling” or native-app claims                                      |
| 21  | Staff-facing schedule access        | **Available with limitations**            | `/share/roster/[token]` read-only full roster; no `/me` portal                                                               | Staff can open a read-only published roster link; no personalized authenticated employee schedule                              |
| 22  | Multi-site or multi-team management | **Available with limitations**            | multiple locations per org; one primary staff location; roster tied to one location/default location page                    | Support location-specific data; no unified multi-site scheduler or team model verified                                         |
| 23  | Permissions and manager roles       | **Available with limitations**            | `AppUserRole`; Clerk provisioning; roster APIs use authenticated org but no role check; session omits role                   | Authenticated organization access exists; do not claim granular scheduling permissions                                         |
| 24  | Audit history/change tracking       | **Not found** for roster changes          | no roster audit/revision model; `updatedAt` only; leave decision and notification logs are separate                          | Do not claim schedule version history or complete audit trail                                                                  |
| 25  | Pricing-tier limits                 | **Confirmed and available**               | `lib/plans.ts`, `lib/plan-limits.ts`, `docs/PRICING.md`                                                                      | Free 10 staff/2 locations/1 admin; Plus 50 staff; Pro 100 staff; messaging/device/admin limits vary                            |


---

## Recommended content claim set

These are the strongest claims available for page drafting:

1. Build a weekly employee roster.
2. Create reusable shift presets with times, breaks, and colors.
3. Assign shifts to employees day by day or across one employee's week.
4. Copy the previous week and adjust what changed.
5. See approved vacation and days off while scheduling.
6. Keep closed holidays off the roster.
7. Review unassigned days before publishing.
8. Publish a read-only roster link.
9. Print or download the roster as an image.
10. Use scheduled shifts as the expected plan for attendance review.

## Final recommendation

Position the page as a **simple weekly scheduling workflow**, not an automation platform:

> Build the roster, reuse familiar shifts, account for approved time off, publish one clear schedule, and connect the plan to attendance.

That message is differentiated, supported by the repository, and leaves the attendance and ZKTeco intents for their dedicated future pages.