# Employee Leave and Availability Page — Evidence-Based Content Brief

**Prepared:** 23 July 2026  
**Target URL:** `https://www.simplerosterplus.com/employee-leave-and-availability`  
**Primary keyword:** `employee leave management software`  
**Scope:** Content brief only. Do **not** create the landing page, navigation, schema, sitemap, or screenshots until explicitly approved.

**Source of truth for this brief:** application code, Prisma schema, request APIs, roster write paths, and current product docs. Older PRODUCT_NOTES claims that conflict with code are called out explicitly.

---

## 1. Page objective

Create a focused commercial landing page for managers searching for leave and availability tools who need **visibility before building the weekly roster**—not a full HR leave-administration suite.

The page should:

- Explain how Simple Roster Plus records vacation, days off, and sick leave and shows approved time off while scheduling
- Explain soft shift preferences as planning cues, not hard availability engines
- Connect leave to the roster-first story: plan cleanly, then track attendance against the plan
- Convert qualified visitors to **Start Free** or **Explore demo**
- Stay differentiated from scheduling, attendance, ZKTeco, and small-business fit pages

### Desired reader takeaway

> Before you assign the week, see approved vacation, days off, and sick leave on the roster—and capture staff shift preferences as soft planning cues—without turning Simple Roster Plus into an HRIS or leave-balance system.

---

## 2. Target audience

### Primary audience

- Owners and managers of small, shift-based teams
- Managers currently tracking time off in spreadsheets, paper, or chat
- Schedulers who need leave visible **while** building the weekly roster

### Secondary audience

- Buyers comparing “leave management” tools who will accept manager-entered records instead of employee self-service

### Poor-fit audience (do not target as primary)

- Buyers needing leave entitlements, accrual, carryover, or statutory engines
- Buyers needing employee mobile apps or self-service request portals
- Buyers needing payroll-integrated leave balances
- Buyers needing recurring weekly availability calendars as hard rules
- Enterprise HRIS / compliance buyers

---

## 3. Search intent

### Primary intent: commercial investigation

Queries such as `employee leave management software` and `employee time off request software` expect:

- How time off is recorded and approved
- Whether managers or employees submit requests
- How leave affects scheduling
- Whether the product replaces HR leave admin

### Secondary intent: availability + scheduling fit

Supporting queries around availability and shift preferences seek planning inputs for roster building—not necessarily a full availability marketplace.

### Content boundary

| URL | Owns |
|-----|------|
| `/employee-scheduling-software` | Building, copying, publishing the weekly schedule |
| **This page** | **Leave records + soft preferences that inform the roster** |
| `/employee-attendance-software` | Present / late / absent vs the plan |
| `/small-business-employee-scheduling` | SMB fit, plan limits, setup honesty |
| `/zkteco-attendance-integration` | Device/ADMS attendance path |

Do not retell the full scheduling tutorial on this URL.

---

## 4. Primary and supporting keywords

### Primary keyword

- employee leave management software

### Supporting keywords

- staff leave management software
- employee time off request software
- employee availability software
- staff availability software
- leave and availability software
- employee leave tracking software
- shift availability software

### Related language to use carefully

- approved vacation and days off
- manager-managed leave
- leave visibility on the roster
- soft shift preferences
- avoid scheduling over approved time off

### Keyword usage guidance

- Use the primary keyword in title, H1 (or close paraphrase), opening copy, and one FAQ.
- Prefer “leave” / “time off” / “vacation” / “days off” for hard records.
- Prefer “preferences” or “shift requests” for soft cues—not “availability rules” unless qualified.
- Do not imply an employee mobile leave app.

---

## 5. Confirmed leave capabilities

### Manager-managed vacation (date ranges)

- Model `StaffVacation` with `startDate`, `endDate`, `status` (`requested` \| `approved` \| `denied`), optional `reason`, `decidedByUserId`, `decidedAt`
- Create / approve / deny / delete via `/api/requests/vacation`
- Default status on create: `requested`

Evidence: `prisma/schema.prisma` (`StaffVacation`, `LeaveRequestStatus`); `app/api/requests/vacation/route.ts`; `app/api/requests/vacation/[id]/route.ts`

### Manager-managed days off (single date)

- Model `StaffDayOff` with one `date`, same status/reason/decision audit pattern
- Upsert create path; approve/deny with conflict handling

Evidence: `prisma/schema.prisma` (`StaffDayOff`); `app/api/requests/day-off/route.ts`; `app/api/requests/day-off/[id]/route.ts`

### Sick leave (implemented; docs partly stale)

- Model `StaffSickLeave` with date range, `SickLeaveStatus`, reason, decision audit
- Requests inbox UI includes sick leave; optional “approve immediately” create path
- Appears as blocked cells on the roster grid and in attendance excuse logic
- **Limitation:** roster entry PUT/batch APIs reject vacation and day off explicitly but do **not** currently reject `sickLeave` the same way (UI still blocks; Auto Scheduler / block map include sick leave)

Evidence: `prisma/schema.prisma` (`StaffSickLeave`); `app/api/requests/sick-leave/**`; `app/(authenticated)/roster/requests-modal.tsx`; `lib/leave-blocks.ts`; `app/api/roster/weeks/[id]/entries/route.ts` (vacation/dayOff branches only).  
Note: `docs/PRODUCT_NOTES.md` still describes sick leave as deferred—**code supersedes that doc claim**.

### Approval and rejection

- PATCH approve / deny for vacation, day off, and sick leave
- Approve path can return **409** with conflict summary when overlapping roster shifts exist; confirmed approve with `force` clears those entries then marks approved

Evidence: `lib/requests.ts` (`approveLeaveTx` and conflict helpers); vacation/day-off/sick-leave `[id]` routes; `requests-modal.tsx` conflict confirm UI

### Reasons and approval metadata

- Optional `reason` on request rows
- `decidedByUserId` / `decidedAt` set on decision
- No separate denial-reason field

Evidence: schema models; `lib/requests.ts` serialization

### Roster visibility and blocking

- Approved leave builds a block map: vacation > sickLeave > dayOff precedence
- Roster grid labels blocked cells (Vacation / Sick leave / Day off)
- Closed public holidays block separately

Evidence: `lib/leave-blocks.ts` (`getApprovedBlockMap`, `isApprovedBlocked`); `app/(authenticated)/roster/page.tsx`; `app/(authenticated)/roster/roster-grid.tsx`

### Attendance connection (supporting, not this page’s main theme)

- Approved leave can excuse attendance statuses (vacation / sick / day off)
- Pay-period export includes vacation and sick markers (day-off coverage more limited)

Evidence: `lib/staff-attendance-report.ts`; `lib/pay-period-generate.ts` / `lib/pay-period-export.ts`

---

## 6. Confirmed availability capabilities

### Soft shift preferences / shift requests

- Model `StaffShiftRequest`: staff + date + shift template + status
- Schema and API comments state approve is a **soft preference only**—does not assign or clear roster cells
- Grid shows preference chips (Ask / Wants / Pref) when the cell is not leave/holiday blocked

Evidence: `prisma/schema.prisma` (`StaffShiftRequest`); `app/api/requests/shift/route.ts`; `app/api/requests/shift/[id]/route.ts`; `lib/leave-blocks.ts` (`getShiftPreferenceMap`); `roster-grid.tsx`

### What is **not** availability (important)

| Capability | Status |
|------------|--------|
| Recurring weekly availability windows | **Not found** |
| Hard “unavailable for this shift type” preferences | **Not found** |
| Employee-managed availability calendar | **Not found** |
| Auto Scheduler honoring `StaffShiftRequest` | **Planned or documented only** (`docs/PRODUCT_NOTES.md`); Auto Scheduler flag currently off |

Hard unavailability today = **approved leave** + **station-closed holidays**, not a recurring availability engine.

---

## 7. Setup and workflow reality

| Step | Reality |
|------|---------|
| Setup wizard | Leave is **not** a setup step (`business → shifts → roles → staff → attendance → go-live`) |
| Who enters leave | Authenticated organization users via Requests modal on Roster—**manager-managed** |
| Employee portal | **Not found** (`/me` documented as future in `docs/PRODUCT_NOTES.md` / `docs/MOBILE_STRATEGY.md`) |
| Scope | Requests APIs use **default location** staff; multi-location leave UX is limited |
| Notifications | **No** leave approve/deny email/SMS/WhatsApp found |
| Plan limits | **No** leave-specific quotas in `lib/plans.ts` |
| Permissions | Leave APIs require org session; fine-grained RBAC **not** wired |

Honest workflow for marketing:

1. Manager records vacation, day off, or sick leave in Requests  
2. Approves (clearing conflicting shifts when confirmed)  
3. Builds roster with leave cells blocked and preferences visible as soft cues  
4. Publishes schedule; attendance later respects leave excuses where implemented  

---

## 8. Product limitations

- No leave balances, accrual, carryover, or statutory engines
- No partial-day leave (date-level only)
- No recurring leave series
- No employee self-service or mobile leave app
- No leave decision notifications
- No dedicated leave report/export (partial pay-period / attendance coverage only)
- No calendar sync (Google/Outlook)
- Soft preferences are not hard scheduling restrictions
- Sick-leave write-API enforcement gap vs vacation/day-off
- Default-location-centric requests inbox
- Pending leave cell indicators still called out as future polish in PRODUCT_NOTES
- Auto Scheduler / scheduling rules feature-flagged off; preferences not wired into Auto Scheduler

---

## 9. Unsafe or unsupported claims

Do **not** claim:

- Automated leave management / entitlement engines
- Leave balances, accrual, or carryover
- Statutory leave compliance
- Employee self-service leave requests (as available today)
- Mobile leave request apps
- Automated approval workflows (beyond manager actions / sick shortcut)
- Complete recurring availability management
- Hard enforcement of shift preferences
- Live Auto Scheduler leave optimization
- Leave SMS/WhatsApp/email alerts
- Payroll-integrated leave
- Fine-grained leave permissions / full audit product
- That every leave type is identically blocked on every write API (disclose sick-leave caveat if claiming “prevents all leave conflicts”)

---

## 10. Recommended positioning

**Strongest truthful story (validated against code):**

Manager-managed time off (vacation, days off, sick leave) with approval, conflict confirmation that can clear overlapping shifts, and clear leave visibility on the weekly roster—plus soft shift preferences as planning cues—not an HR leave suite.

**Draft positioning (not approved copy):**

> See approved vacation, days off, and sick leave before you assign the week—and capture staff shift preferences as soft planning cues—without enterprise HR leave software.

Narrower alternative if sick-leave API gap should stay quiet on the page:

> Record approved vacation and days off so they stay visible—and blocked—while you build the weekly roster.

Recommend leading with vacation + days off as the hard proof, mentioning sick leave as supported in the Requests inbox and roster display, without overselling “perfect conflict prevention for every leave type.”

Keep Auto Scheduler out of hero claims.

---

## 11. Recommended page outline

1. **Hero** — leave visibility before rostering + Start Free / Explore demo  
2. **The scheduling problem leave solves** — spreadsheets miss time off until after the roster is shared  
3. **Record vacation, days off, and sick leave** — manager Requests inbox  
4. **Approve with eyes open** — conflict preview / clear overlapping shifts  
5. **See leave on the roster while you assign**  
6. **Soft shift preferences (not hard availability rules)**  
7. **How this connects to publishing and attendance** (short; link out)  
8. **What this is not** — balances, self-service, statutory engines  
9. **Pricing / Start Free CTA**  
10. **FAQ**  
11. **Closing CTA**

---

## 12. Suggested H1

**Draft:**

> Manage Leave and Availability Before You Build the Roster

Alternate (more keyword-literal):

> Employee Leave Management Software for Shift Teams

Prefer the first if the page stays roster-first; ensure primary keyword appears in title + first paragraph.

---

## 13. Suggested SEO title

**Draft:**

> Employee Leave and Availability Software | Simple Roster Plus

---

## 14. Suggested meta description

**Draft:**

> Record approved vacation, days off, and sick leave, see them on the weekly roster, and capture soft shift preferences—without HR leave-balance software.

Avoid “employee self-service,” “accrual,” or “automated approvals” in meta.

---

## 15. Recommended section headings

Suggested H2s (draft):

1. See Time Off Before You Assign the Week  
2. Record Vacation, Days Off, and Sick Leave  
3. Approve Leave Without Surprises  
4. Keep Approved Leave Visible on the Roster  
5. Capture Soft Shift Preferences  
6. What Simple Roster Plus Does Not Replace  
7. Leave and Availability Questions  

---

## 16. Calls to action

| CTA | Target |
|-----|--------|
| **Start Free** | `https://app.simplerosterplus.com/sign-up` |
| **Explore demo** | `https://app.simplerosterplus.com/sign-up?intent=demo` |
| **Log in** | `https://app.simplerosterplus.com/login` |

Do not use **Start Free Trial** unless Gate 2 policy changes.

Secondary text links to scheduling and attendance pages after fit is established.

---

## 17. Internal links

**When implementing later:**

| Link | Purpose |
|------|---------|
| `/` | Brand / employee roster software |
| `/employee-scheduling-software` | Build and publish the weekly schedule |
| `/employee-attendance-software` | Plan vs actual after leave is accounted for |
| `/small-business-employee-scheduling` | SMB fit and plan limits |
| `/zkteco-attendance-integration` | Only if discussing attendance devices—not primary |
| `/#pricing` | Plan overview |
| App signup / demo / login | Conversion |

Inbound later (not this task): one contextual link from the scheduling page (“account for leave before you assign”).

---

## 18. Recommended screenshots

Only recommend screens that exist in product:

| Shot | Supports claim | Limitation to keep honest | Prep notes |
|------|----------------|---------------------------|------------|
| Requests inbox with vacation / day off / sick leave rows | Manager-managed leave types | Manager UI, not employee portal | Demo org with pending + approved rows |
| Approve confirm when shifts would be cleared | Conflict awareness | Manager confirmation required | Staff with overlapping roster entries |
| Roster grid cell labeled Vacation / Day off / Sick leave | Leave visibility while scheduling | Desktop grid; not mobile-first editing | Approved leave on current week |
| Soft preference chip on an open cell | Shift preferences | Soft cue only—not hard rule | Approved or requested `StaffShiftRequest` |

Do **not** recommend: employee app screens, accrual dashboards, recurring availability calendars, Auto Scheduler leave engines, notification screens for leave decisions.

---

## 19. FAQ topics

1. Can managers record vacation and days off?  
2. Is sick leave supported?  
3. Can employees submit their own leave in the app?  
4. Does approved leave show on the roster?  
5. What happens to existing shifts if leave is approved?  
6. Are shift preferences the same as availability rules?  
7. Does Simple Roster Plus track leave balances or accruals?  
8. Are there statutory leave calculations?  
9. Will leave approvals send SMS or WhatsApp?  
10. How does leave relate to attendance review?  
11. Is this a full HR leave management system?  

Answers must stay evidence-based (employee submit = no; balances = no; preferences = soft; etc.).

---

## 20. Structured-data recommendation

When implementing later:

- Prefer **WebPage** + **BreadcrumbList**, referencing existing `#software` product entity (same pattern as other commercial pages)
- Add **FAQPage** only if visible FAQ answers are published and accurate
- Do **not** invent a separate SoftwareApplication with leave-balance features
- Do **not** mark Auto Scheduler or employee self-service as current features

Out of scope for this brief: no schema implementation.

---

## 21. Static-site implementation notes

Later (not now):

- Path: `landing-page/employee-leave-and-availability/index.html`
- Canonical: `https://www.simplerosterplus.com/employee-leave-and-availability`
- Match styling/CTA/breadcrumb patterns from `employee-scheduling-software`
- Absolute app links; Gate 1 **Start Free**
- WebP + PNG screenshots with descriptive alt; no fake self-service UI
- Add sitemap entry and contextual internal links only when the page ships
- Production checks: 200, 308 trailing slash/`index.html`, one H1, no unsupported claims, Search Console submit

Do **not** create the HTML in this task.

---

## 22. Leave wording guide

### Safe (with evidence)

- approved leave / approved vacation / days off / sick leave (with caveats)
- manager-managed leave / leave records
- leave visibility during roster planning
- approve or deny leave requests
- clear overlapping shifts when leave is approved (with confirmation)
- time off that blocks roster cells (especially vacation and days off)

### Unsafe unless heavily qualified or avoided

- automated leave management
- leave entitlement / balances / accrual / carryover
- statutory leave compliance
- employee self-service requests (as available)
- mobile leave requests
- automated approval workflows
- “prevents every scheduling conflict” (sick-leave API gap; preferences are soft)

### Sick leave note for writers

Sick leave is **implemented** in schema, APIs, Requests UI, roster display, and attendance excuses. Do not call it “coming soon.” Do not claim identical hard API blocking to vacation/day-off without qualification.

---

## 23. Availability wording guide

| Term | Use when | Do not use as |
|------|----------|----------------|
| **Preferences / shift requests** | Soft `StaffShiftRequest` cues | Hard scheduling law |
| **Availability** | Only loosely, as “planning context,” or avoid | Recurring availability product |
| **Unavailability** | Prefer “approved leave” or “closed holiday” | Employee availability calendar |
| **Hard restrictions** | Approved leave + closed holidays | Shift preference chips |
| **Soft planning information** | Preference chips | Conflict-prevention marketing |

Recommended phrase:

> Soft shift preferences help managers remember what staff asked for—they do not automatically assign or block shifts.

---

## 24. Final evidence table

| # | Capability | Classification | Repository evidence | Marketing implication |
|---|------------|----------------|---------------------|------------------------|
| 1 | Vacation requests | **Confirmed and available** | `StaffVacation` in `prisma/schema.prisma`; `app/api/requests/vacation/route.ts` and `[id]/route.ts`; Requests modal | May claim manager-recorded vacation ranges |
| 2 | Days off | **Confirmed and available** | `StaffDayOff` in schema; `app/api/requests/day-off/**`; Requests modal | May claim single-day days off |
| 3 | Sick leave | **Available with limitations** | `StaffSickLeave` + migration `20260723120000_sick_leave_workflow`; sick-leave APIs; modal; `leave-blocks.ts`; PRODUCT_NOTES still says deferred (stale) | May claim sick leave in Requests/roster; do not claim identical write-API blocking to vacation |
| 4 | Other leave types | **Not found** | Only vacation, day off, sick leave, soft shift request | Do not invent bereavement/parental/etc. types |
| 5 | Leave approval | **Confirmed and available** | PATCH approve in vacation/day-off/sick-leave `[id]` routes; `approveLeaveTx` in `lib/requests.ts` | May claim manager approve |
| 6 | Leave rejection | **Confirmed and available** | PATCH deny on same routes | May claim deny; no separate denial-reason field |
| 7 | Leave notes or reasons | **Confirmed and available** | Optional `reason` on leave models; modal form | May claim optional reason |
| 8 | Start and end dates | **Confirmed and available** | Vacation/sick: `startDate`/`endDate`; day off: single `date` | Qualify day off as single-day |
| 9 | Partial-day leave | **Not found** | Date-only `@db.Date` fields; no leave start/end times | Must not claim half-day leave engine |
| 10 | Recurring leave | **Not found** | No recurrence fields/APIs | Must not claim |
| 11 | Leave balances | **Not found** | No balance models | Must not claim |
| 12 | Leave accrual | **Not found** | No accrual logic | Must not claim |
| 13 | Carryover | **Not found** | — | Must not claim |
| 14 | Statutory leave rules | **Not found** | Positioning avoids compliance engines | Must not claim |
| 15 | Manager-entered leave | **Confirmed and available** | `requests-modal.tsx` CreateRequestForm selects staff | Core claim |
| 16 | Employee-submitted leave | **Planned or documented only** | `/me` future in `docs/PRODUCT_NOTES.md`; no staff portal routes | Must not claim available |
| 17 | Employee self-service | **Planned or documented only** | `docs/MOBILE_STRATEGY.md`; no `Staff.appUserId` | Must not claim |
| 18 | Mobile leave requests | **Not found** | No employee mobile leave flow; manager grid not mobile-first | Must not claim |
| 19 | Availability windows | **Not found** | No availability window model | Avoid or redefine as leave/preferences |
| 20 | Recurring weekly availability | **Not found** | Confirmed absent in schema/SEO prior audits | Must not claim |
| 21 | Preferred shifts | **Confirmed and available** | `StaffShiftRequest`; `getShiftPreferenceMap`; grid chips | Claim as soft preferences only |
| 22 | Unavailable shifts | **Not found** | No anti-preference type | Must not claim |
| 23 | Shift requests | **Confirmed and available** | `app/api/requests/shift/**`; soft approve | Same as preferences |
| 24 | Hard vs soft rules | **Available with limitations** | Hard: approved leave + closed holidays; soft: shift requests; schema comments | Explain distinction clearly |
| 25 | Visibility inside the roster | **Confirmed and available** | `roster-grid.tsx` blocked labels; preference chips | Core claim |
| 26 | Conflict warnings | **Confirmed and available** | 409 + `conflictCount`/`conflictDates`; modal confirm | May claim approve-time warnings |
| 27 | Preventing assignments during approved leave | **Available with limitations** | UI blocks all leave types; PUT/batch reject vacation & dayOff (`entries/route.ts`, `entries/batch/route.ts`); sickLeave check missing on those routes | Claim vacation/day-off blocking confidently; qualify sick leave |
| 28 | Clearing assignments when leave approved | **Confirmed and available** | `approveLeaveTx` deletes overlapping `RosterEntry` rows | May claim with manager confirmation |
| 29 | Holidays and closed dates | **Confirmed and available** | `PublicHoliday.stationClosed`; separate from leave; blocks UI/API | Supporting claim; not leave balances |
| 30 | Multi-location behavior | **Available with limitations** | Leave on Staff; requests scoped via default location (`lib/location.ts`, requests routes) | Do not claim polished multi-site leave inbox |
| 31 | Notifications | **Not found** | No leave decision notify hooks in `app/api/requests/**` | Must not claim leave alerts |
| 32 | Email, SMS, or WhatsApp updates | **Not found** (for leave) | Messaging exists for roster publish, not leave decisions | Must not claim leave messaging |
| 33 | Audit history | **Available with limitations** | `decidedBy`/`decidedAt`; hard delete removes row; no full audit product | Soft claim only |
| 34 | Approval metadata | **Confirmed and available** | Decision fields on models; email in list serialization | May claim who approved/when |
| 35 | Reporting and export | **Available with limitations** | Pay-period vacation/sick; attendance excused statuses; no dedicated leave export; day-off weaker in pay-period | Qualify; link attendance/scheduling where needed |
| 36 | Calendar integration | **Not found** | No Google/Outlook sync | Must not claim |
| 37 | Plan limits | **Not found** (leave-specific) | `lib/plans.ts` has no leave quotas | Do not invent leave plan tiers |
| 38 | Manager permissions | **Available with limitations** | Any authenticated org session can use requests APIs; roles exist but not leave-ACL | Do not claim fine-grained leave RBAC |
| 39 | Staff permissions | **Not found** | No staff login surface for leave | Must not claim staff permissions |
| 40 | Setup requirements | **Not found** in setup | `setup-wizard.tsx` steps exclude leave | Leave is post-setup / roster workflow |
| 41 | Known edge cases and limitations | **Available with limitations** | Sick leave API gap; soft prefs; default-location scope; no notifications; stale PRODUCT_NOTES; Auto Scheduler off / prefs not wired | Disclose in FAQ / “what this is not” |

---

## Appendix — Differentiation checklist

| Do | Don't |
|----|-------|
| Leave visibility before rostering | Full scheduling tutorial |
| Manager-managed vacation / days off / sick leave | Employee app / self-service |
| Soft preferences | Hard availability engine |
| Conflict clear-on-approve | Accrual / statutory compliance |
| Link to scheduling & attendance pages | Duplicate those pages |

---

## Quality controls (this deliverable)

1. All **41** capabilities appear in the evidence table.  
2. Material claims cite schema/API/UI paths; sick-leave doc conflict noted.  
3. Planned `/me`, balances, accrual, notifications not presented as available.  
4. Page differentiated from scheduling/attendance/ZKTeco/SMB pages.  
5. No HRIS/payroll/compliance/mobile-app claims in recommended positioning.  
6. **Only file created for this task:** `docs/seo-employee-leave-and-availability-page-brief.md`

*End of brief.*
