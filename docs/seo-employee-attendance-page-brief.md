# Employee Attendance Software Page — Evidence-Based Content Brief

**Prepared:** 17 July 2026  
**Target URL:** `https://www.simplerosterplus.com/employee-attendance-software`  
**Primary keyword:** `employee attendance software`  
**Scope:** Content and implementation brief only. No landing page, navigation, structured data, sitemap, or image changes are included.

---

## 1. Page objective

Create a focused commercial landing page for owners and managers comparing employee attendance software for small, shift-based teams.

The page should:

- Explain how Simple Roster Plus connects the published roster to attendance.
- Show how managers review scheduled, present, late, and absent status.
- Explain manual punch entry, device-pushed punches, corrections, notes, and weekly review.
- Present worked-time summaries as payroll preparation, not payroll automation.
- Convert qualified visitors to **Start Free** or **Explore demo**.
- Preserve the product's roster-first position rather than presenting attendance as a disconnected time clock.

### Desired reader takeaway

> Simple Roster Plus gives managers one practical view of the weekly plan and what followed: who was scheduled, who attended, who was late, and which shifts were missed.

### Content boundaries

This page must not become:

- A generic payroll or tax-processing page
- A project-time, billable-hours, or job-costing page
- A ZKTeco model-compatibility or device-setup page
- A broad scheduling page
- A mobile or GPS clock-in page
- A labor-law compliance page

---

## 2. Target audience

### Primary audience

- Owners and managers of small, shift-based businesses
- Managers who already build a weekly roster and need to review attendance against it
- Teams replacing paper attendance sheets or disconnected spreadsheets
- Businesses using manual attendance or a supported ZKTeco terminal with ADMS push
- Managers who need a clear hours summary to hand to whoever runs payroll

### Relevant operating environments

Existing marketing copy identifies:

- Retail and gas
- Restaurants
- Clinics
- Security
- Cleaning teams
- Multi-shift sites

Evidence: `landing-page/index.html`.

### Primary problems

- Knowing that someone clocked in without knowing what they were scheduled to work
- Finding late arrivals and missed shifts after the week has passed
- Correcting missed or inaccurate punches without retaining any context
- Matching device user IDs to the correct employee
- Preparing worked-time summaries from inconsistent punch records
- Keeping attendance and the weekly roster in separate systems

### Poor-fit audience

The page should not target buyers primarily seeking:

- Automated payroll, tax filing, payslips, or benefits
- Project timers, billable time, job costing, or client timesheets
- Employee mobile clock-in or GPS/geofenced punches
- Native iOS or Android attendance apps
- Enterprise workforce analytics or labor-demand forecasting
- Universal ZKTeco compatibility or bundled biometric hardware
- Compliance certification or legal-rule automation

---

## 3. Search intent

### Primary intent: commercial investigation

Searchers using `employee attendance software` are comparing products and expect to understand:

- How attendance is captured
- Which attendance statuses are available
- How lateness and absence are determined
- Whether attendance connects to a schedule
- Whether managers can correct mistakes
- Which reports and exports exist
- Whether devices, manual entry, or mobile clock-in are supported
- Pricing and team-size fit

### Secondary intent: attendance tracking evaluation

Supporting queries such as `attendance tracking software`, `staff attendance software`, and `employee attendance tracking system` indicate interest in concrete workflows, screenshots, status logic, corrections, history, and device support.

`Employee time and attendance software` can also carry payroll, mobile clock, compliance, and workforce-management expectations. The page must qualify those expectations early and honestly.

### Search-intent ownership

- Homepage `/` owns: `employee roster software`
- `/employee-scheduling-software` owns: schedule creation and publishing
- This page owns: roster-connected attendance, lateness, absence, punches, and worked-time review
- Future `/zkteco-attendance-integration` should own: device compatibility, ADMS configuration, and terminal setup

### Differentiating angle

The strongest differentiated angle is not generic time capture:

> Attendance is interpreted against the roster, so managers can see the plan and the outcome together.

---

## 4. Primary and supporting keywords

### Primary keyword

- employee attendance software

### Supporting keywords

- attendance tracking software
- staff attendance software
- attendance management software
- employee attendance tracking system
- employee time and attendance software

### Related language to use naturally

- weekly attendance
- scheduled versus actual attendance
- scheduled, present, late, and absent
- employee clock-ins and clock-outs
- attendance punch log
- attendance corrections
- grace period
- manual attendance entry
- worked-hours summary
- payroll handoff
- shift attendance
- small shift-based teams

### Keyword usage guidance

- Use the primary keyword in the title, H1, opening copy, and one later heading or FAQ answer.
- Use `attendance tracking` for the week grid and punch log.
- Use `time and attendance` sparingly because it can imply payroll, employee clocks, compliance, and enterprise workflows that are not present.
- Use `web app` or `software`, not `mobile app`.
- Keep `roster`, `scheduled shift`, and `weekly plan` prominent to preserve the product's positioning.
- Do not repeat every keyword variant mechanically.

---

## 5. Confirmed product capabilities

The strongest safe proof points are below. Detailed classifications for all 34 requested capabilities appear in the final evidence table.

### Roster-connected attendance status

The attendance policy computes:

- Scheduled
- Present
- Late
- Absent
- Manual present
- Manual absent
- Vacation
- Day off
- Closed holiday
- Exempt
- No shift

The core four states are genuinely implemented. A scheduled shift remains `scheduled` until the shift start plus the configured grace period; it becomes `absent` if no in-punch exists after that threshold. The first in-punch determines `present` or `late`.

Evidence:

- `lib/attendance-policy.ts`
- `lib/attendance-week.ts`
- `app/(authenticated)/attendance/attendance-grid.tsx`
- `app/(authenticated)/attendance/attendance-log.tsx`

### Weekly plan-versus-actual view

The attendance week view combines:

- Expected shift start and end times from the roster
- Actual in/out punches
- Computed attendance status
- Late minutes
- Daily and per-staff irregularity counts
- Worked-time and overtime summaries

This is a status-and-time comparison, not a complete scheduled-hours-versus-worked-hours variance report.

Evidence:

- `app/(authenticated)/attendance/page.tsx`
- `app/(authenticated)/attendance/attendance-grid.tsx`
- `app/api/attendance/week/route.ts`
- `lib/attendance-week.ts`
- `lib/attendance-policy.ts`

### Manual clock-in and clock-out records

Authenticated managers can create manual `in` or `out` punches with an optional note. The app suggests the next punch direction from the employee's latest punch.

Evidence:

- `app/(authenticated)/attendance/add-punch-modal.tsx`
- `app/api/attendance/punches/route.ts`
- `lib/attendance-manual-punch-default.ts`
- `prisma/schema.prisma` — `AttendanceLog`, `PunchType`, and `PunchSource`

### Supported device-pushed punches

The repository contains an implemented ZKTeco iClock/ADMS push path:

- Public `/iclock/cdata` and `/iclock/getrequest` routes
- ATTLOG parsing
- Serial-number device resolution
- Location-scoped staff matching
- Device punch insertion with `device_adms` source
- Unmapped-punch storage
- Duplicate suppression within a one-second window

This supports selected ADMS-capable terminals that send compatible ATTLOG payloads. It does not prove support for every ZKTeco model or production configuration.

Evidence:

- `app/iclock/cdata/route.ts`
- `app/iclock/getrequest/route.ts`
- `lib/zk-iclock-push.ts`
- `lib/adms-device.ts`
- `lib/attendance-punch-ingest.ts`
- `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`

### Configurable grace period and lateness

Managers can set an organization-level grace period:

- Default: 10 minutes
- Maximum accepted setting: 240 minutes
- Used for both late classification and the scheduled-to-absent threshold

Evidence:

- `lib/attendance-week.ts`
- `lib/attendance-policy.ts`
- `app/api/attendance/settings/route.ts`
- `app/(authenticated)/attendance/grace-settings-modal.tsx`

### Attendance corrections and manual day overrides

Managers can:

- Edit a punch's time, type, or note
- Delete an unfiled punch
- Preserve the first original punch time when the time is corrected
- See a `CORRECTED` indicator in the UI
- Mark a day manually present or absent
- Add a free-text reason or note

Punches inside a filed pay period are locked from these edits.

Evidence:

- `app/api/attendance/punches/[id]/route.ts`
- `app/api/attendance/overrides/route.ts`
- `app/(authenticated)/attendance/log-row-editor.tsx`
- `prisma/schema.prisma` — `AttendanceLog` and `AttendanceDayOverride`
- `lib/pay-period-filed-lock.ts`

### Worked-time calculations

Worked time is calculated by pairing `in` and `out` punches and summing completed intervals. It is used in:

- Per-staff attendance reports
- Weekly worked-time and overtime summaries
- Extract Pay Period totals

Open or irregular punch sequences can produce incomplete totals, and the staff report surfaces quality hints rather than automatically repairing the records.

Evidence:

- `lib/staff-attendance-report.ts`
- `lib/overtime.ts`
- `lib/pay-period-generate.ts`

### Attendance log, staff report, and pay-period views

Implemented manager surfaces include:

- Attendance punch log with source/status filters
- Weekly attendance grid
- Individual staff attendance report
- Extract Pay Period workspace
- Saved pay-period summaries
- Print output
- CSV download

Evidence:

- `app/(authenticated)/attendance/attendance-log.tsx`
- `app/(authenticated)/attendance/attendance-grid.tsx`
- `app/(authenticated)/attendance/report/page.tsx`
- `app/(authenticated)/attendance/pay-period/`
- `lib/pay-period-export.ts`
- `docs/PAY_PERIOD.md`

### Device-to-staff matching and unmapped punches

Device user IDs are unique per location. Device punches that cannot be matched are retained with a null staff ID, shown to managers, and can later be mapped to a staff member. Mapping backfills prior unmatched punches at that location.

Evidence:

- `prisma/schema.prisma` — `Staff.deviceUserId` and `@@unique([locationId, deviceUserId])`
- `lib/attendance-staff-device-map.ts`
- `lib/unmapped-device-punches.ts`
- `app/api/attendance/device/unmapped/route.ts`
- `app/api/attendance/device/map-users/route.ts`

---

## 6. Product limitations

### The comparison is status-first, not full hours reconciliation

The week view places scheduled times, actual punches, and attendance status together. The repository does not contain one report that reconciles scheduled minutes against worked minutes with daily or weekly variance.

Safe:

> Compare the weekly roster with actual clock-ins and attendance status.

Unsafe:

> Automatically reconcile every scheduled hour with payroll-ready actual hours.

### Early departure is not classified

The attendance policy records the latest out-punch but does not compare it with the expected shift end. There is no `left early` status or minutes-early calculation.

Evidence: `lib/attendance-policy.ts`.

### Missing clock-outs are not automatically corrected

An unmatched in-punch contributes no worked time. The staff report can label a punch sequence `possible_missed` or `irregular`, but the software does not create a missing out-punch, infer the correct time, or provide a dedicated missing-clock-out status.

Evidence: `lib/staff-attendance-report.ts`.

### Overnight attendance is calendar-day based

Roster duration math supports a shift whose end is earlier than its start, but attendance punches are grouped by the local calendar day of the punch. An out-punch after midnight can land on the following day rather than being attributed to the previous evening's shift.

Evidence:

- `lib/shift-duration.ts`
- `lib/attendance-week.ts`
- `lib/zk-iclock-push.ts`

### Duplicate handling is narrow

Device ingest skips punches within ±1 second for matching device-user identifiers. There is no database uniqueness constraint for a punch identity, manual punch creation does not use the same dedupe helper, and consecutive logical duplicates such as two in-punches are not automatically repaired.

Evidence:

- `lib/attendance-punch-ingest.ts`
- `app/api/attendance/punches/route.ts`
- `prisma/schema.prisma`

### Corrections are immediate, not an approval queue

Managers edit or delete punches directly and can apply day-level present/absent overrides. There is no submit-review-approve workflow, second-manager sign-off, or employee correction request queue.

Evidence:

- `app/api/attendance/punches/[id]/route.ts`
- `app/api/attendance/overrides/route.ts`

### Audit history is limited

The system retains useful audit fields:

- Original punch time on first correction
- Correcting user and correction timestamp
- Manual punch creator
- Override decision user and timestamp
- Device raw timestamp and ingest receipt time
- Pay-period filing fields

It does not retain an append-only history of every edit or provide a complete attendance audit timeline.

Evidence: `prisma/schema.prisma`.

### Exports are payroll preparation only

Extract Pay Period provides a CSV and print view. It does not:

- Process payroll
- Calculate taxes or pay
- Create payslips
- Export vendor-specific payroll formats
- Create a true Excel `.xlsx` file
- Automatically calculate all shortage fields
- Email an attachment

`docs/PAY_PERIOD.md` explicitly describes Excel and email attachment support as deferred. The current UI's `Excel` label downloads CSV through `lib/pay-period-export.ts`.

### Multi-location attendance is location-specific

Attendance data, devices, staff matching, reports, and pay periods are associated with locations. There is no combined organization-wide attendance view.

There is also a code limitation: manual punch and override mutation routes resolve the organization's default location rather than the selected location, while attendance reading/reporting paths can resolve a requested location. Do not market a seamless unified multi-location attendance workflow until this is reconciled.

Evidence:

- `prisma/schema.prisma`
- `app/api/attendance/punches/route.ts`
- `app/api/attendance/punches/[id]/route.ts`
- `app/api/attendance/overrides/route.ts`
- `lib/attendance-week.ts`
- `app/(authenticated)/attendance/pay-period/pay-period-workspace.tsx`

### Device support is protocol-scoped

The implemented cloud path is ADMS push with compatible ATTLOG payloads. Pull TCP is represented in schema/UI but explicitly deferred. The repository does not provide a certified all-model compatibility matrix or proof of a physical terminal production deployment.

Evidence:

- `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`
- `docs/DEVICE_INGEST_FIELD_TEST.md`
- `docs/mvp-launch/field-test-log.md`
- `lib/zk-iclock-push.ts`

### No employee mobile clock-in or self-service attendance

There is no employee attendance portal, phone clock-in, native app, GPS capture, or geofence. `docs/MOBILE_STRATEGY.md` explicitly places phone clock-in out of scope and describes a future `/me` experience as planning only.

### No automated attendance notifications

Late and absent status is visible in the app, but no implemented attendance-specific SMS, email, WhatsApp, or push-notification pipeline was found. Roster-publish messaging is a separate feature and must not be described as an attendance alert.

### No product retention policy found

The attendance log uses bounded display/query windows:

- Default log window: 7 days
- Expanded log window: 120 days
- Staff report maximum: 93 days
- Unmapped-device review lookback: 90 days with a 2,000-row fetch cap

These are query and UI limits, not data-retention guarantees. No plan-specific attendance deletion or history policy was found.

Evidence:

- `lib/attendance-log-window.ts`
- `lib/staff-attendance-report.ts`
- `lib/unmapped-device-punches.ts`
- `docs/PRICING.md`

---

## 7. Unsafe or unsupported claims

### High-risk claim table


| Risky claim                                | Repository finding                                                                                                                                    | Safe alternative                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Real-time attendance**                   | ADMS can push promptly when configured; handshake requests realtime upload, but the manager UI reloads/refetches and has no WebSocket/SSE live stream | “Receive device-pushed attendance from supported ADMS terminals” or “See recent clock-ins in the attendance log” |
| **Payroll-ready hours**                    | Pair-based worked time and pay-period CSV exist, but irregular punches, manual shortage, no vendor formats, and no scheduled-hours variance remain    | “Prepare a worked-hours summary for payroll handoff”                                                             |
| **Automated payroll**                      | No payroll processing, pay calculations, taxes, payslips, or filing exists                                                                            | “Export hours for whoever runs payroll”                                                                          |
| **All ZKTeco devices supported**           | ADMS ATTLOG subset only; pull TCP deferred; no certified model matrix                                                                                 | “Connect supported ZKTeco terminals using ADMS push”                                                             |
| **GPS clock-in**                           | No geolocation fields, browser geolocation usage, or geofence workflow found                                                                          | Do not mention                                                                                                   |
| **Mobile employee clock-in**               | Explicitly out of scope in `docs/MOBILE_STRATEGY.md`                                                                                                  | “Managers review attendance in the web app”; do not imply phone punching                                         |
| **Complete audit trail**                   | First original time and correction metadata exist; no append-only edit history                                                                        | “Keep the original time when a punch is corrected”                                                               |
| **Automatic correction of missed punches** | Quality hints exist; no inferred punch creation or automated repair                                                                                   | “Flag punch sequences that may be incomplete”                                                                    |
| **Universal overnight-shift handling**     | Schedule duration handles overnight; attendance punches are calendar-day bucketed                                                                     | Do not claim overnight-aware attendance reconciliation                                                           |
| **Labor-law compliance**                   | No compliance rules engine or certification found; product positioning avoids compliance software                                                     | Do not claim legal or regulatory compliance                                                                      |
| **Biometric hardware included**            | Pricing covers software device slots/sync; no hardware sale or bundled terminal is defined                                                            | “Connect a supported terminal you already use”                                                                   |


### Additional claims to avoid

- “Track every employee in real time”
- “Eliminate every attendance error”
- “Automatically detect early departures”
- “Automatically fix missed clock-outs”
- “Instant late-arrival alerts by SMS or WhatsApp”
- “Employees clock in from anywhere”
- “Native attendance app”
- “Offline attendance app”
- “Unified multi-location attendance dashboard”
- “One-click Excel payroll export”
- “ADP-ready” or any named payroll-vendor integration
- “Immutable compliance audit log”
- “Face, fingerprint, card, and palm verification captured for every punch”
- “Project time tracking” or “billable hours”
- “Unlimited attendance history”

### Existing marketing wording that needs care

`landing-page/index.html` uses:

- `live attendance`
- `late and no-show alerts`
- `scheduled hours with actual attendance`
- `export hours for payroll`

For the dedicated page:

- Qualify `live attendance` as device-pushed attendance where applicable.
- Use `in-app status` or `exceptions`, not `alerts`, unless explicitly referring to the visible week/Home summary.
- Describe scheduled-versus-actual as roster times/status beside punches, not full hours reconciliation.
- Describe exports as a CSV/print summary for payroll handoff, not payroll-ready automation.

---

## 8. Recommended page positioning

### Recommended positioning statement

> Simple Roster Plus connects employee attendance to the weekly roster, helping managers see who was scheduled, who attended, who was late, and which shifts were missed.

### Recommended supporting message

> Review manual or device-pushed clock-ins against planned shifts, correct exceptions with context, and prepare worked-time summaries for payroll handoff.

### Why this position is defensible

- It leads with the strongest implemented differentiator: the roster supplies the expected shift.
- It uses the genuinely implemented scheduled, present, late, and absent states.
- It leaves mobile clock, payroll, compliance, and ZKTeco compatibility promises out.
- It separates the page from generic project time trackers.
- It gives device ingestion a supporting role rather than taking over the page.

### Draft wording assessment

Original draft:

> Track who was scheduled, who attended, who was late and which shifts were missed—all connected to the published roster.

Assessment:

- **Supported:** scheduled, attended/present, late, missed/absent, roster connection.
- **Refinement:** avoid implying that only published rosters are evaluated unless product behavior is confirmed to require publication. Use `weekly roster` or `planned roster` instead of `published roster`.

Recommended refinement:

> See who was scheduled, who attended, who was late, and which shifts were missed—all connected to the weekly roster.

### Recommended claim hierarchy

1. Compare the roster with attendance status.
2. Review scheduled, present, late, and absent in a weekly view.
3. Capture manual or supported device-pushed in/out punches.
4. Set a grace period for late and absent thresholds.
5. Correct punches while keeping the first original time.
6. Add notes and manual present/absent overrides.
7. Review individual attendance and worked-time summaries.
8. Prepare a CSV or print summary for payroll handoff.

---

## 9. Recommended page outline

### 1. Hero: employee attendance connected to the roster

- H1
- One-sentence roster-connected value proposition
- Primary CTA: Start Free
- Secondary CTA: Explore demo
- Existing attendance-week screenshot
- Small proof row: Weekly view · Manual or device punches · Corrections with context

### 2. The attendance problem: a punch without the plan is incomplete

Address disconnected punch logs, paper attendance, and spreadsheet reconciliation. Keep this short and commercial.

### 3. See scheduled, present, late, and absent

Explain the four primary states and how the roster supplies the expected shift.

Keep vacation, day off, closed, exempt, and manual override states as supporting context rather than headline features.

### 4. Review the week against the roster

Show:

- Expected shift times
- Actual punches
- Attendance status
- Late minutes
- In-app irregularity counts

Do not imply a live-streaming dashboard or full scheduled-hours variance report.

### 5. Capture attendance manually or from supported devices

Lead with flexibility:

- Managers can add in/out punches manually.
- Supported ZKTeco terminals can push ATTLOG punches through ADMS.
- Unmatched device users can be mapped later.

Keep model compatibility and setup detail for the future ZKTeco page.

### 6. Correct exceptions with context

Show:

- Edit punch time or type
- Add notes
- Keep the first original time
- Mark a day manually present or absent
- Lock filed pay-period dates

Do not describe this as a multi-stage approval workflow or complete audit trail.

### 7. Review worked time and prepare a payroll handoff

Show:

- Paired in/out worked-time totals
- Individual staff attendance report
- Extract Pay Period
- CSV and print

Use `payroll handoff` or `payroll-prep summary`; do not use `automated payroll`.

### 8. Built for roster-first, shift-based teams

Briefly explain:

- Weekly roster and attendance in one product
- Location-specific operation
- Small-team pricing
- No project timers, payroll bundle, or enterprise HR complexity

### 9. Pricing and fit

Use canonical pricing:

- Free: $0, up to 10 staff, up to 2 locations, 1 device slot with a 30-day sync trial
- Plus: $19.99/month, up to 50 staff, 1 included device, unlimited locations
- Pro: $49.99/month, up to 100 staff, 3 included devices, unlimited locations

Clarify that a device slot is software connectivity, not included biometric hardware.

### 10. FAQ

Use evidence-backed topics from section 17.

### 11. Closing CTA

Reinforce weekly attendance clarity:

> Put the weekly plan and attendance outcome in one manager view.

---

## 10. Suggested H1

### Recommended

**Employee Attendance Software That Shows What Actually Happened**

Why it works:

- Uses the exact primary keyword.
- Connects directly to the product's plan-versus-actual positioning.
- Avoids promising payroll, automation, or hardware.
- Complements the scheduling page's `Keeps Every Shift Clear` message.

### Alternative

**Compare Employee Attendance with the Weekly Roster**

This is more literal and product-specific, but the recommended H1 is stronger for the stated SEO target.

### Suggested hero supporting copy

> See who was scheduled, who attended, who was late, and which shifts were missed—all connected to the weekly roster.

Optional second sentence:

> Review manual or supported device-pushed punches, correct exceptions, and prepare worked-time summaries for payroll handoff.

---

## 11. Suggested SEO title

**Employee Attendance Software Connected to Your Roster | Simple Roster Plus**

This follows the approved starting direction and differentiates the page from:

- Homepage: `Employee Roster Software for Small Teams | Simple Roster Plus`
- Scheduling page: `Employee Scheduling Software for Small Teams | Simple Roster Plus`

Alternative if title length needs tightening:

**Employee Attendance Software for Shift Teams | Simple Roster Plus**

---

## 12. Suggested meta description

### Recommended

**Compare scheduled shifts with employee attendance, review late and absent status, correct punches and prepare worked-time summaries for payroll handoff.**

This is accurate because it:

- Describes status/time comparison rather than full hours reconciliation.
- Includes corrections and worked-time summaries.
- Says payroll handoff, not payroll-ready automation.

### Alternative

**Employee attendance software for small teams to review scheduled, present, late and absent status against the weekly staff roster.**

Avoid mentioning:

- Real-time attendance
- GPS or mobile clock-in
- Automated payroll
- Complete audit trails
- Universal ZKTeco support

---

## 13. Recommended section headings

1. **See Employee Attendance Against the Weekly Roster**
2. **Know Who Is Scheduled, Present, Late, or Absent**
3. **Review the Week in One Clear Attendance View**
4. **Add Punches Manually or Connect a Supported Device**
5. **Match Unassigned Device Punches to the Right Employee**
6. **Correct Attendance Records with Context**
7. **Turn In-and-Out Punches into Worked-Time Summaries**
8. **Prepare Attendance for Payroll Handoff**
9. **Attendance Tracking for Small, Shift-Based Teams**
10. **Employee Attendance Software Questions**

Avoid headings such as:

- “Track Every Employee in Real Time”
- “Automate Payroll from Clock-In to Payday”
- “Let Employees Clock In from Anywhere”
- “Works with Every ZKTeco Device”
- “Never Miss Another Punch”
- “Stay Compliant Automatically”

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

- **See attendance against the roster**
- **Review the attendance demo**
- **Build your first weekly roster**

Use absolute raw HTML URLs so the links work without JavaScript.

Do not use:

- “Start Tracking Employees Live”
- “Download the Attendance App”
- “Clock In Now”
- “Automate Payroll”
- “Connect Any ZKTeco Clock”

---

## 15. Internal links

### Links available at first publication


| Destination                     | Suggested anchor             | Purpose                                         |
| ------------------------------- | ---------------------------- | ----------------------------------------------- |
| Homepage `/`                    | employee roster software     | Preserve roster-first hierarchy                 |
| `/employee-scheduling-software` | employee scheduling software | Explain how the expected weekly plan is created |
| Homepage `/#pricing`            | Simple Roster Plus pricing   | Plan and device-limit detail                    |
| App signup                      | Start Free                   | Conversion                                      |
| App demo signup                 | Explore demo                 | Conversion                                      |
| App login                       | Log in                       | Existing customer access                        |
| `/privacy.html`                 | Privacy policy               | Footer                                          |
| `/terms.html`                   | Terms of service             | Footer                                          |


### Add only when the future page exists


| Future destination               | Suggested anchor                        |
| -------------------------------- | --------------------------------------- |
| `/zkteco-attendance-integration` | supported ZKTeco attendance integration |


Do not add a dead ZKTeco link when this page is first implemented.

### Homepage link opportunity after publication

Add one contextual link from the homepage attendance feature to this page using an anchor such as:

- `employee attendance software`
- `attendance tracking software`

Keep the homepage focused on employee roster software.

### Scheduling-page link opportunity

The scheduling page's supporting attendance section can link here after publication using:

- `compare the roster with attendance`
- `employee attendance software`

---

## 16. Recommended screenshots or product visuals

### Primary hero visual

Use the existing attendance-week screenshot:

- `landing-page/images/solution-attendance.webp`
- `landing-page/images/solution-attendance@2x.webp`
- PNG fallbacks:
  - `landing-page/images/solution-attendance.png`
  - `landing-page/images/solution-attendance@2x.png`

Why:

- It is already used by the canonical homepage.
- It depicts planned shifts beside on-time, late, and absent status.
- It directly supports the page's plan-versus-actual message.

Implementation caution:

- The screenshot uses `on-time` wording while the current attendance policy/UI label is `Present` in some views. Confirm that the visible screenshot still reflects the production UI closely enough before publishing.
- Preserve width, height, descriptive alt text, WebP delivery, and PNG fallback.

### Supporting existing visual

Use the roster screenshot only to explain where expected shifts originate:

- `landing-page/images/app-roster-week.webp`
- PNG fallback: `landing-page/images/app-roster-week.png`

Do not let the roster visual turn the page into another scheduling page.

### Recommended future product captures

If screenshots are captured later from the current product:

1. Attendance week grid with scheduled/present/late/absent cells
2. Punch log showing manual/device source and a corrected row
3. Grace-period settings modal
4. Unmapped device-punch mapping panel
5. Individual staff attendance report
6. Extract Pay Period workspace and CSV action

These should be real product captures, not invented mockups.

### Avoid

- `solution-auto-scheduler.`* as attendance proof
- Device configuration as the hero
- Legacy generated mockups that no longer match the app
- Visuals showing GPS, mobile employee punching, geofences, payroll processing, or push alerts
- Operator-console screenshots

---

## 17. FAQ topics grounded in actual product functionality

### How does Simple Roster Plus connect attendance to the roster?

Answer around expected shift start/end times from the weekly roster, actual punches, and scheduled/present/late/absent status.

Do not claim a full scheduled-hours-versus-worked-hours variance report.

### What do scheduled, present, late, and absent mean?

Explain:

- Scheduled: a planned shift has not reached the absent threshold.
- Present: the first in-punch is within the configured grace period.
- Late: the first in-punch is after the shift start plus grace.
- Absent: no in-punch exists after the threshold.

### Can I enter attendance without a biometric device?

Yes. Managers can add manual in/out punches and notes.

Do not imply employees can clock in through a self-service web or mobile screen.

### Can managers correct missed or inaccurate punches?

Managers can edit punch time/type/note, delete unfiled punches, and set manual present/absent overrides. The first original punch time is retained after a time correction.

Clarify that the product does not automatically repair missing punches.

### Is there a configurable grace period?

Yes. One organization-level grace window determines the late threshold and when a no-punch scheduled shift becomes absent.

### Does it show missing clock-outs?

The staff report can flag an incomplete or irregular punch sequence, and unmatched pairs do not add worked time. There is no automatic missing-clock-out correction.

### Does it work with ZKTeco devices?

Supported ZKTeco terminals can send compatible ATTLOG punches using ADMS push. Compatibility depends on model, firmware, and configuration. Pull TCP is not available in the cloud product.

Do not list unverified models or say all ZKTeco devices are supported.

### Is attendance updated in real time?

Use a qualified answer:

> Supported ADMS terminals can push punches to Simple Roster Plus when their real-time ATTLOG upload is configured. The manager view is not a guaranteed live-streaming dashboard and may require a refresh.

### Can I export attendance for payroll?

Managers can prepare an Extract Pay Period summary and download CSV or print it for payroll handoff. Simple Roster Plus does not process payroll, calculate tax, or create vendor-specific payroll files.

### Does it support multiple locations?

Attendance data and devices are location-specific. Free supports up to two locations; paid tiers allow more. There is no combined all-location attendance dashboard, and selected-location write behavior should be retested before strong multi-location marketing.

### Can employees clock in from their phones?

No. Employee mobile clock-in, GPS, and geofencing are not current product capabilities.

### Does Simple Roster Plus send late or absent notifications?

No automated attendance-specific SMS, email, WhatsApp, or push-alert workflow was found. Managers review late and absent exceptions in the app.

### How long is attendance history kept?

Do not promise a duration. The repository defines bounded view/query windows but no customer-facing retention policy.

---

## 18. Structured-data recommendation

Do not implement structured data as part of this brief.

When the page is built, recommend:

### WebPage

- `@type`: `WebPage`
- `@id`: `https://www.simplerosterplus.com/employee-attendance-software#webpage`
- `name`: final page title
- `url`: canonical target URL
- `description`: final meta description
- `isPartOf`: `https://www.simplerosterplus.com/#website`
- `about`: `https://www.simplerosterplus.com/#software`
- `breadcrumb`: page BreadcrumbList ID

### BreadcrumbList

Suggested breadcrumb:

1. Home
2. Employee Attendance Software

### SoftwareApplication

Reference the existing product entity:

`https://www.simplerosterplus.com/#software`

Do not create a contradictory duplicate `SoftwareApplication`.

### FAQPage

Only add `FAQPage` if:

- The FAQ is visible in rendered HTML.
- Schema answers exactly match visible answers.
- Current search-engine eligibility and structured-data policy are rechecked at implementation time.

Do not add:

- Reviews or ratings
- Compliance certifications
- Hardware offers
- Unsupported features
- Fabricated pricing

---

## 19. Implementation notes for the static HTML site

### Architecture

The canonical marketing site is static HTML:

- Homepage: `landing-page/index.html`
- Scheduling page: `landing-page/employee-scheduling-software/index.html`
- Inline CSS and small inline JavaScript
- No CMS, static-site generator, or shared template layer

Evidence:

- `landing-page/LANDING-PAGE.md`
- `docs/seo-validation-audit.md`
- `docs/seo-phase-1-implementation.md`
- `docs/seo-employee-scheduling-implementation.md`

### Recommended source path

Use:

`landing-page/employee-attendance-software/index.html`

This mirrors the existing scheduling-page directory pattern and targets the extensionless public URL without requiring a new flat `.html` file.

Before publication, verify:

- `/employee-attendance-software` returns 200 or one intentional canonical redirect
- No redirect loop
- `/employee-attendance-software.html` is not a duplicate indexable URL
- `/employee-attendance-software/index.html` does not remain a separate indexable duplicate

### Required head elements

- Final title from section 11
- Final meta description from section 12
- Canonical:
`https://www.simplerosterplus.com/employee-attendance-software`
- `index, follow`
- Aligned Open Graph and Twitter metadata
- Existing attendance screenshot as social image if it remains accurate
- Existing favicon and brand assets

### Page construction

- Reuse homepage and scheduling-page design tokens, header/footer patterns, typography, buttons, and responsive conventions.
- Do not copy either page in full.
- Keep one H1 and a logical H2/H3 hierarchy.
- Keep primary content directly in HTML.
- Use `<picture>` with WebP and PNG fallbacks.
- Preserve screenshot dimensions and descriptive alt text.
- Use absolute app CTA URLs in raw HTML.
- Use semantic `<details>` FAQ markup if it matches the existing design.
- Keep touch targets at least 44 × 44 pixels and maintain WCAG AA contrast.

### Claim QA before implementation

- Recheck attendance policy status behavior.
- Recheck device-ingest production status and supported-device wording.
- Recheck pricing and device-trial limits.
- Recheck whether pay-period export is still CSV despite an `Excel` UI label.
- Recheck mobile clock-in, geolocation, employee self-service, and notification status.
- Recheck selected-location behavior for manual punch and override routes.
- Recheck whether a public data-retention policy has been approved.

### Internal linking after publication

Only after the page exists:

- Add a homepage contextual attendance link.
- Add the page to the homepage footer.
- Add a scheduling-page contextual link.
- Add the canonical URL to `landing-page/sitemap.xml`.
- Do not add the ZKTeco page link until that page exists.

### Manual production checks

- Page and assets return 200.
- Canonical uses `www` and the extensionless path.
- H1 appears once.
- Title and description match final approved copy.
- Structured data parses and references existing entity IDs.
- Signup, demo, and login links work without JavaScript.
- Homepage, scheduling, pricing, Privacy, and Terms links work.
- WebP loads and PNG fallback remains available.
- No localhost, staging, or `vercel.app` URLs appear.
- No unsupported real-time, payroll, mobile clock, GPS, compliance, or device claims appear.
- Attendance screenshot matches current visible product behavior.
- Mobile, tablet, and desktop layouts are checked.

---

## 20. Final evidence table

Status definitions:

- **Confirmed and available** — implemented in active schema/API/UI or exercised application code
- **Available with limitations** — implemented, but materially narrower than the broad market term
- **Coming soon** — explicitly presented as coming soon in current product/marketing status
- **Planned or documented only** — described in plans/docs or represented by inactive scaffolding without a shipped workflow
- **Not found** — no implemented or planned capability found after repository review
- **Cannot verify** — depends on production, external hardware, or provider behavior not provable from the repository


| #   | Capability                              | Classification                  | Repository evidence                                                                                                                                                                                                                                       | Safe marketing interpretation                                                                                                                 |
| --- | --------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Attendance status tracking              | **Confirmed and available**     | `lib/attendance-policy.ts` defines and computes presence states; `lib/attendance-week.ts` assembles cells; `app/(authenticated)/attendance/attendance-grid.tsx` renders them                                                                              | Track roster-connected attendance status in a weekly manager view                                                                             |
| 2   | Scheduled, present, late, absent states | **Confirmed and available**     | `computePresence` in `lib/attendance-policy.ts` computes all four using expected shift, first in-punch, grace, and current time; `app/(authenticated)/attendance/attendance-log.tsx` and `app/(authenticated)/attendance/attendance-grid.tsx` expose them | See who is scheduled, present, late, or absent                                                                                                |
| 3   | Clock-in and clock-out capture          | **Confirmed and available**     | `PunchType` in `prisma/schema.prisma`; manual POST in `app/api/attendance/punches/route.ts`; ADMS ATTLOG mapping in `lib/zk-iclock-push.ts`                                                                                                               | Record in/out punches manually or receive them from a supported ADMS device; no employee self-clock screen                                    |
| 4   | Manual attendance entry                 | **Confirmed and available**     | `app/(authenticated)/attendance/add-punch-modal.tsx`; `app/api/attendance/punches/route.ts`; `app/api/attendance/punches/[id]/route.ts`; `app/api/attendance/overrides/route.ts`                                                                          | Managers can add and correct manual attendance records                                                                                        |
| 5   | Biometric/device attendance             | **Available with limitations**  | `Device`, `AttendanceLog.deviceId`, and `PunchSource.device_adms` in `prisma/schema.prisma`; `app/(authenticated)/devices/`; `lib/zk-iclock-push.ts`                                                                                                      | Receive attendance punches from supported terminals; do not claim SR+ captures/stores biometric templates or includes hardware                |
| 6   | ZKTeco ADMS ingestion                   | **Available with limitations**  | `app/iclock/cdata/route.ts`; `app/iclock/getrequest/route.ts`; `lib/zk-iclock-push.ts`; `lib/attendance-punch-ingest.ts`; `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` says ADMS is implemented                                                              | Connect selected compatible ZKTeco terminals using ADMS ATTLOG push; production hardware/model compatibility must be confirmed                |
| 7   | Real-time or near-real-time updates     | **Available with limitations**  | `lib/zk-iclock-push.ts` handshake requests `Realtime=1`, `Delay=30`, `TransInterval=1` and stores ATTLOG posts; `app/(authenticated)/attendance/attendance-grid.tsx` refetches without WebSocket/SSE                                                      | Device-pushed attendance can arrive promptly when configured; do not promise a guaranteed live-streaming dashboard                            |
| 8   | Grace periods                           | **Confirmed and available**     | `GRACE_DEFAULT = 10`, `GRACE_MAX = 240` in `lib/attendance-week.ts`; `app/api/attendance/settings/route.ts`; `app/(authenticated)/attendance/grace-settings-modal.tsx`                                                                                    | Set one organization-level attendance grace window                                                                                            |
| 9   | Late-arrival rules                      | **Confirmed and available**     | `lib/attendance-policy.ts`: first in-punch after shift start plus grace becomes `late` with `minutesLate`                                                                                                                                                 | Identify late arrivals against planned start times and the configured grace period                                                            |
| 10  | Early-departure handling                | **Not found**                   | `lastOutAt` is collected, but expected `endHHmm` is not used for an early-leaving status in `lib/attendance-policy.ts`                                                                                                                                    | Do not claim early-departure detection                                                                                                        |
| 11  | Missing clock-outs                      | **Available with limitations**  | `lib/staff-attendance-report.ts` marks odd/irregular sequences `possible_missed` or `irregular`; its pair calculation gives unmatched in-punches no worked time                                                                                           | Flag punch sequences that may be incomplete; no automatic repair or dedicated missing-out status                                              |
| 12  | Duplicate punches                       | **Available with limitations**  | `lib/attendance-punch-ingest.ts` skips device-user/timestamp matches within ±1 second; `app/api/attendance/punches/route.ts` does not use it; `AttendanceLog` in `prisma/schema.prisma` has no punch-identity unique key                                  | Device ingestion suppresses near-identical duplicates; do not promise universal duplicate correction                                          |
| 13  | Overnight shifts                        | **Available with limitations**  | `lib/shift-duration.ts` handles overnight roster duration; `lib/attendance-week.ts` and `lib/zk-iclock-push.ts` group punches by local calendar day                                                                                                       | Overnight schedule duration exists, but do not claim complete overnight attendance reconciliation                                             |
| 14  | Worked-hours calculation                | **Confirmed and available**     | `minutesFromInOutPairs` in `lib/staff-attendance-report.ts`; `lib/overtime.ts`; `lib/pay-period-generate.ts`                                                                                                                                              | Calculate worked time from completed in/out pairs; incomplete sequences can undercount                                                        |
| 15  | Scheduled-versus-actual comparison      | **Available with limitations**  | `lib/attendance-week.ts` combines roster expected times, punches, and status; `app/(authenticated)/attendance/attendance-grid.tsx` renders them; no scheduled-minutes-versus-worked-minutes variance report found                                         | Compare expected shifts with actual punches and attendance status, not every planned hour with worked-hour variance                           |
| 16  | Attendance correction workflow          | **Confirmed and available**     | `app/api/attendance/punches/[id]/route.ts` PATCH/DELETE; `AttendanceLog` correction fields in `prisma/schema.prisma`; `app/(authenticated)/attendance/log-row-editor.tsx`; `lib/pay-period-filed-lock.ts`                                                 | Managers can correct unfiled punches and retain the first original time; no request/approval queue                                            |
| 17  | Manager approval workflow               | **Not found**                   | overrides are immediate writes in `app/api/attendance/overrides/route.ts`; no punch/correction submit-approve states or queue                                                                                                                             | Do not claim attendance approvals; manager overrides are direct decisions                                                                     |
| 18  | Attendance notes                        | **Confirmed and available**     | `AttendanceLog.note`, `AttendanceDayOverride.note`/`lateReason`, and `PayPeriod.notes` in `prisma/schema.prisma`; punch and override APIs expose them                                                                                                     | Add context to punches, day overrides, and pay-period summaries                                                                               |
| 19  | Audit trail                             | **Available with limitations**  | `AttendanceLog` and `AttendanceDayOverride` in `prisma/schema.prisma` store creator, first original time, corrector/time, override decider/time, raw device/ingest fields, and filing fields; no append-only edit history                                 | Preserve useful correction and source context; not a complete or compliance-grade audit trail                                                 |
| 20  | Exporting attendance                    | **Available with limitations**  | `lib/pay-period-export.ts` builds/downloads CSV; `app/(authenticated)/attendance/pay-period/pay-period-workspace.tsx` and `app/(authenticated)/attendance/staff-report-form.tsx` provide print flows; no general log CSV                                  | Download a pay-period CSV or print attendance summaries; do not claim full Excel/log export coverage                                          |
| 21  | Payroll-ready exports                   | **Available with limitations**  | `docs/PAY_PERIOD.md` calls it payroll prep; `lib/pay-period-export.ts` creates a CSV with worked total, vacation, sick days/leave, and manual shortage; Excel/email/vendor formats are deferred                                                           | Prepare an hours summary for payroll handoff; not automated or vendor-ready payroll                                                           |
| 22  | Weekly attendance views                 | **Confirmed and available**     | `app/(authenticated)/attendance/page.tsx`; `app/api/attendance/week/route.ts`; `app/(authenticated)/attendance/attendance-grid.tsx`; `lib/attendance-week.ts`                                                                                             | Review a location's attendance week against its roster                                                                                        |
| 23  | Pay-period views                        | **Confirmed and available**     | `app/(authenticated)/attendance/pay-period/page.tsx`; `app/(authenticated)/attendance/pay-period/pay-period-workspace.tsx`; `app/api/attendance/pay-period/`; `lib/pay-period-generate.ts`; `prisma/schema.prisma`                                        | Prepare and save a location-specific pay-period summary                                                                                       |
| 24  | Multi-location attendance               | **Available with limitations**  | `Location`, `Device.locationId`, and `AttendanceLog.locationId` in `prisma/schema.prisma`; read/report paths resolve locations, while `app/api/attendance/punches/route.ts`, `punches/[id]/route.ts`, and `overrides/route.ts` use the default location   | Support separate location attendance records; no unified cross-location dashboard, and selected-location writes need verification             |
| 25  | Device-to-staff matching                | **Confirmed and available**     | `Staff.deviceUserId` and `@@unique([locationId, deviceUserId])` in `prisma/schema.prisma`; `lib/attendance-staff-device-map.ts`; `lib/zk-iclock-push.ts` scopes lookup to device location                                                                 | Match terminal user IDs to employees at the device's location                                                                                 |
| 26  | Unknown or unmatched punches            | **Confirmed and available**     | `lib/zk-iclock-push.ts` stores `staffId: null`; `lib/unmapped-device-punches.ts`; `app/api/attendance/device/unmapped/route.ts`; `app/api/attendance/device/map-users/route.ts` backfills rows                                                            | Retain and map unmatched device punches instead of silently dropping them                                                                     |
| 27  | Employee self-service attendance        | **Planned or documented only**  | `docs/PRODUCT_NOTES.md` describes a future `/me` area and absent `Staff.appUserId`; no current staff attendance portal                                                                                                                                    | Do not market; current attendance is manager-facing                                                                                           |
| 28  | Mobile clock-in                         | **Not found**                   | `docs/MOBILE_STRATEGY.md` explicitly places `clock-in from phone` out of scope; no employee punch UI found                                                                                                                                                | Do not claim phone clock-in or a native attendance app                                                                                        |
| 29  | Geolocation                             | **Not found**                   | no geolocation/GPS/geofence fields exist in `prisma/schema.prisma`, no browser geolocation workflow was found under `app/`, and `docs/MOBILE_STRATEGY.md` excludes phone clock-in                                                                         | Do not claim GPS or geofenced attendance                                                                                                      |
| 30  | Offline device syncing                  | **Cannot verify**               | `lib/zk-iclock-push.ts` handshake contains retention/transfer settings and handles bulk ATTLOG posts; `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` says there is no SR+ offline agent; terminal buffering/replay is external behavior                        | Do not promise offline sync; confirm per supported device/firmware                                                                            |
| 31  | Attendance notifications                | **Planned or documented only**  | `docs/MVP_LAUNCH_READINESS.md` and `SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md` reference optional late-notify parity; no implemented attendance notification sender found; `lib/messaging/roster-whatsapp-notify.ts` is roster-specific                        | Managers review in-app exceptions today; do not claim automated late/absence alerts                                                           |
| 32  | Reports and dashboards                  | **Available with limitations**  | `app/(authenticated)/attendance/attendance-grid.tsx`; `app/(authenticated)/attendance/report/page.tsx`; `app/(authenticated)/attendance/pay-period/`; `lib/home-week-summary.ts`; `docs/DASHBOARD_RECOMMENDATIONS.md`; no dedicated analytics/Reports hub | Use practical weekly, staff, and pay-period views; not an analytics suite                                                                     |
| 33  | Pricing-tier limits                     | **Confirmed and available**     | `docs/PRICING.md`, `lib/plans.ts`, `lib/plan-limits.ts`, `lib/device-trial.ts`                                                                                                                                                                            | Free: 10 staff/2 locations/1 device trial slot; Plus: 50 staff/1 included device; Pro: 100 staff/3 included devices; paid locations unlimited |
| 34  | Data retention or history limits        | **Not found** as product policy | `lib/attendance-log-window.ts` has 7/120-day windows; `lib/staff-attendance-report.ts` caps reports at 93 days; `lib/unmapped-device-punches.ts` uses a 90-day review; no purge/tier retention rule found                                                 | Do not promise a retention duration or confuse UI windows with data deletion                                                                  |


---

## Recommended content claim set

These are the strongest claims available for page drafting:

1. Compare employee attendance with the weekly roster.
2. See scheduled, present, late, and absent status.
3. Review expected shift times beside actual in/out punches.
4. Set one grace period for late and absent thresholds.
5. Add manual in/out punches and notes.
6. Receive attendance punches from supported ZKTeco terminals using ADMS push.
7. Keep unmatched device punches and map them to staff.
8. Correct punch records while retaining the first original time.
9. Mark a day manually present or absent with context.
10. Review weekly attendance and individual staff reports.
11. Calculate worked time from completed in/out pairs.
12. Prepare CSV and print summaries for payroll handoff.

## Final recommendation

Position the page as **roster-connected attendance clarity**, not an automated time-and-payroll platform:

> Plan the roster, review who attended, correct exceptions with context, and prepare worked-time summaries for payroll handoff.

That message is differentiated, supported by the repository, and leaves device compatibility, scheduling depth, payroll, mobile clock-in, and compliance to their appropriate product or future-page boundaries.