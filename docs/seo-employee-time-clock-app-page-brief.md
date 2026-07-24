# SEO page brief: `/employee-time-clock-app`

**Status:** Brief only — do not implement the marketing page from this document alone.  
**Target URL:** `https://www.simplerosterplus.com/employee-time-clock-app`  
**Primary keyword under evaluation:** `employee time clock app`  
**Investigation date:** 24 July 2026  
**Method:** Repository inspection of schema, APIs, UI routes, device ingest, tests/docs, and prior SEO briefs. Marketing HTML claims are treated as non-authoritative unless backed by product code.

---

## 1. Page objective

Create a Phase 2 commercial SEO page that answers:

> How do clock events enter Simple Roster Plus, and how are those punches reviewed against the weekly roster?

The page must:

- Explain **manager manual attendance entry** and **supported ZKTeco ADMS device punches** as the two live capture paths.
- Show how punches are matched to staff, recovered when unmatched, corrected, and classified against scheduled shifts.
- Qualify the “time clock app” search phrase so buyers do **not** expect employee phone clock-in, GPS, kiosk mode, or payroll sync.
- Stay clearly narrower than `/employee-attendance-software` (plan-versus-actual ownership) and `/zkteco-attendance-integration` (device/protocol ownership).

### Desired reader takeaway

> Capture attendance as clock events — entered by managers or pushed from supported ZKTeco terminals — then match punches to staff and compare them with scheduled shifts.

### Content boundaries

This page must not become:

- A duplicate of `/employee-attendance-software`
- A duplicate of `/zkteco-attendance-integration`
- A mobile employee clock-in / GPS / geofence / kiosk product page
- A payroll, timesheet, break, or overtime-compliance product page
- A biometric-template management or BioTime/ZKBio page

---

## 2. Target audience

### Primary audience

Managers and owners of small, shift-based teams who search for a time clock / punch clock / clock-in system and need:

- A way to record when people arrive and leave
- A way to connect those records to a weekly schedule
- Either manual entry, a supported wall/biometric terminal, or both

### Relevant operating environments

- Cafés, restaurants, retail, clinics, and similar sites with published weekly rosters
- Sites that already own or will buy ADMS-capable ZKTeco terminals
- Teams where a manager reviews attendance on desktop (product attendance UX is desktop-first)

### Poor-fit audience

- Buyers needing employees to clock in from phones with GPS/geofencing
- Buyers needing a shared tablet kiosk or QR/PIN employee self-service punch station in the SR+ app
- Buyers needing BioTime/ZKBio, LAN pull SDK, or universal ZKTeco certification
- Buyers needing automated overtime compliance, break enforcement, or payroll vendor sync

---

## 3. Search intent

### Primary intent: commercial investigation

People searching `employee time clock app` typically want software that lets **employees punch in**, often on a phone. That intent is **only partially aligned** with Simple Roster Plus.

What SR+ can honestly satisfy:

- Digital clock-event / punch records
- Manager-entered clock-in and clock-out
- Device-originated punches from supported ZKTeco ADMS terminals
- Roster comparison (present / late / absent and leave-backed states)
- Correction and payroll-prep export

What many “time clock app” searchers also expect (and SR+ does not provide as product features):

- Employee mobile or browser self-service punching
- GPS / geofencing
- App-store native time clock
- In-app kiosk / QR / PIN station
- Break tracking and overtime automation as compliance features

### Secondary intent: small-business digital punch clock

Supporting phrases such as `employee punch clock software`, `staff clock in system`, and `shift time clock software` are closer to the real product: punches tied to shifts, reviewed by managers.

### Search-intent ownership

| Intent | Owner page |
|--------|------------|
| How punches enter + punch matching/recovery | **This page** (`/employee-time-clock-app`) |
| Weekly plan-versus-actual attendance review | `/employee-attendance-software` |
| ZKTeco ADMS protocol, pairing, device limits | `/zkteco-attendance-integration` |
| Building / publishing the weekly roster | `/employee-scheduling-software` |
| Leave that excuses scheduled days | `/employee-leave-and-availability` |

---

## 4. Primary and supporting keywords

### Primary keyword (candidate)

`employee time clock app`

### Supporting keywords

- `employee clock in app`
- `staff time clock app`
- `employee attendance clock app`
- `time clock software for small business`
- `employee clock in software`
- `digital time clock for employees`
- `shift time clock software`
- `employee punch clock software`
- `staff clock in system`
- `employee attendance app`

### Related natural language (prefer in body copy)

- clock events, clock-in / clock-out records, attendance punches
- manual attendance entry
- supported ZKTeco attendance devices / ADMS push
- unmatched punches, staff-device matching
- grace period, late, present, absent
- roster-connected attendance

---

## 5. Keyword-fit assessment

### Does Simple Roster Plus genuinely qualify as an `employee time clock app`?

**Not without strong qualification.**

Repository evidence shows:

- Manager-authenticated manual `in` / `out` punches (`app/api/attendance/punches/route.ts`, `PunchSource.manual` in `prisma/schema.prisma`).
- Device punches via ZKTeco **ADMS push** (`app/iclock/cdata/route.ts`, `app/iclock/getrequest/route.ts`, `lib/zk-iclock-push.ts`, `PunchSource.device_adms`).
- No employee-facing punch UI, no native mobile app, no PWA clock-in, no GPS/geofence, no in-app kiosk (`docs/MOBILE_STRATEGY.md` lines 101–105 explicitly mark phone clock-in as **OUT**; no `navigator.geolocation`, kiosk, or `/me` attendance routes found under `app/`).

In common search language, “time clock **app**” implies **employees clock in from an app**. SR+ is a **manager web application** plus optional **hardware terminal punches**, not an employee mobile time clock.

### Is it more accurately an attendance system with manual entry and supported device-based clock events?

**Yes.** That is the accurate product description and matches prior attendance/ZKTeco SEO briefs.

### Can “time clock app” be used safely as the primary keyword if the page immediately qualifies the workflow?

**Conditionally yes**, if:

1. The hero and meta description immediately state capture is **manager manual entry** and/or **supported ZKTeco devices**.
2. The page never uses “app” as shorthand for employee phone clock-in.
3. FAQs explicitly answer “Can employees clock in from their phones?” with **No**.

Without that qualification, the keyword is misleading and will attract the wrong buyers.

### Would a different primary keyword be more accurate?

Yes. More accurate primary phrases:

- `employee punch clock software`
- `shift time clock software`
- `employee clock in software`
- `time clock software for small business`

These still map to punch/clock intent without forcing a mobile-app reading.

### What user expectations are likely to be unmet?

| Expectation | Reality in repo |
|-------------|-----------------|
| Employees punch from phones | Not found; phone clock-in out of scope |
| GPS / geofence validation | Not found |
| Browser / tablet kiosk in SR+ | Not found |
| QR / PIN employee self-service in SR+ | Not found as product punch UX (PIN may exist **on a physical ZKTeco terminal**, not in SR+) |
| Break / meal tracking product | Not found |
| Overtime compliance engine | Weekly worked-time threshold summary only (`lib/overtime.ts`) |
| Payroll sync / timesheets | CSV / print payroll **prep** only (`lib/pay-period-export.ts`, `docs/PAY_PERIOD.md`) |
| Offline SR+ clocking app | Not found; terminal buffering is device-side and unverified as an SR+ promise |

### Recommendation

**Keep `employee time clock app` with strong qualification** as the SEO primary for this URL slug, **and** prefer “software / punch clock / roster-connected” wording in the H1 and opening sentence.

Rationale:

- The Phase 2 URL is already `/employee-time-clock-app`.
- Search demand for the phrase is real, but intent is mixed.
- Strong early qualification + honest FAQs can convert the subset who want roster-connected punches without mobile employee apps.
- If Search Console later shows high bounce from mobile-clock seekers, demote the phrase to supporting-only and promote `employee punch clock software` or `shift time clock software` as the visible primary.

**Do not** keep the keyword as-is without qualification.  
**Do not** claim SR+ is an employee mobile time clock app.

---

## 6. Confirmed clock-event capture capabilities

### Confirmed and available

| Capability | Evidence |
|------------|----------|
| Manager manual clock-in / clock-out | `POST /api/attendance/punches` in `app/api/attendance/punches/route.ts` (lines 54–63 comment: v1 manual-only API; `source` forced to `manual`); UI `app/(authenticated)/attendance/add-punch-modal.tsx`; `PunchType` `in`/`out` in `prisma/schema.prisma` ~523–526 |
| Suggested next punch direction | `lib/attendance-manual-punch-default.ts`; GET handler in `app/api/attendance/punches/route.ts` ~16–51 |
| Optional punch notes | `AttendanceLog.note` in `prisma/schema.prisma` ~578; punch POST accepts `note` |
| ZKTeco ADMS clock-event ingest | `app/iclock/cdata/route.ts`, `app/iclock/getrequest/route.ts`, `lib/zk-iclock-push.ts` writing `source: "device_adms"` (~368) |
| Staff-device user matching | `Staff.deviceUserId` + `@@unique([locationId, deviceUserId])` in `prisma/schema.prisma` ~293, ~321; matching in ADMS ingest path |
| Unmatched punch retention | `AttendanceLog.staffId` nullable (~567); unmapped storage via `lib/zk-iclock-push.ts` (~356); `lib/unmapped-device-punches.ts`; `app/api/attendance/device/unmapped/route.ts` |
| Unmatched recovery / map users | `app/api/attendance/device/map-users/route.ts`; UI `app/components/unmapped-device-punches-panel.tsx` |
| Near-duplicate suppression (device ingest) | `lib/attendance-punch-ingest.ts` `DEDUPE_WINDOW_MS = 1000` (~5, ~31–33, ~54–59) |
| Multiple punches per day / shift | Multiple `AttendanceLog` rows per staff; pair logic in `lib/staff-attendance-report.ts`; log UI treats non-arrival `in` as possible return-from-break context (`lib/attendance-log-data.ts` ~35) — **not** a break-tracking product |

### Available with limitations

| Capability | Limitation | Evidence |
|------------|------------|----------|
| Device “biometric” punches | Physical ZKTeco terminals may use fingerprint/face/card/password; SR+ schema has `PunchVerifyMethod`, but live ADMS path does **not** populate `verifyMethod` | Enum `prisma/schema.prisma` ~541–548; ZKTeco brief + no `verifyMethod` writes in `lib/zk-iclock-push.ts` |
| Clock event sync | ADMS push sync when terminal can reach cloud HTTPS; not a general offline sync product | `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`; ingest libs above |
| Offline clock capture | Terminal may buffer ATTLOG; SR+ has no offline agent; buffering behavior is external | `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`; attendance brief item 30 |

### Not found / not product features

Employee-entered attendance, browser employee clock-in, mobile clock-in, native app, PWA clock-in, GPS, geofencing, shared kiosk mode, tablet clock station in SR+, QR-code clock-in in SR+, PIN clock-in in SR+, BioTime/ZKBio, direct LAN/TCP pull in the cloud product (`pull_tcp` deferred — enum exists, decision doc says ADMS-only for v1).

---

## 7. Confirmed attendance review capabilities

### Confirmed and available

| Capability | Evidence |
|------------|----------|
| Scheduled-versus-actual status cells | `lib/attendance-policy.ts` `computePresence`; `lib/attendance-week.ts`; `app/(authenticated)/attendance/attendance-grid.tsx`; `app/api/attendance/week/route.ts` |
| Present / late / absent | `PresenceStatus` in `lib/attendance-policy.ts` ~18–30, ~170–180 |
| Leave-backed “excused” style states | `on_vacation`, `on_sick_leave`, `day_off`, `station_closed` precedence in `lib/attendance-policy.ts` ~9–10, ~134–140 — **not** a generic `excused` punch status |
| Grace periods | `getGraceMinutes` in `lib/attendance-week.ts` ~119–128; setup wizard attendance step `app/(authenticated)/setup/setup-wizard.tsx` ~448–472 |
| Manual day overrides (present/absent) | `AttendanceDayOverride` + enum `present`/`absent` only in `prisma/schema.prisma` ~637–661; `app/api/attendance/overrides/route.ts` |
| Manual punch correction | PATCH/DELETE `app/api/attendance/punches/[id]/route.ts`; `originalPunchAt`, `correctedByUserId`, `correctedAt` on `AttendanceLog` ~579–586 |
| Weekly worked-time / overtime **summary** | `lib/overtime.ts` weekly threshold; setup wizard overtime flag ~491 |
| Pay-period generation + CSV download | `lib/pay-period-generate.ts`, `lib/pay-period-export.ts` (`buildPayPeriodCsv`, `downloadPayPeriodCsv`); UI under `app/(authenticated)/attendance/pay-period/` |
| Printable attendance views | Print flows referenced from staff report / pay-period workspace (see attendance brief); browser print of report pages |

### Available with limitations

| Capability | Limitation |
|------------|------------|
| “Excused” language | Prefer naming vacation / sick / day off / station closed; do not invent an `excused` attendance enum |
| Early departure | `lastOutAt` collected; no early-leave status using `endHHmm` (`lib/attendance-policy.ts`) |
| Overnight shifts | Roster overnight duration exists; attendance bucketing is local calendar-day based |
| Multi-location | Devices/logs are location-scoped; no combined multi-location attendance dashboard |
| Audit history | Creator/corrector/original time retained; not append-only full history |
| Correction approval workflow | Immediate manager writes; no submit/approve queue |
| Timesheet generation | **Not found** as a timesheet product; pay-period summary ≠ timesheet |
| Payroll integration | CSV/print handoff only — not vendor sync |

---

## 8. Device and integration reality

### What is live

- Cloud product connection mode in use: **ADMS push** over HTTPS to public `/iclock/*` routes.
- Device registration under Devices with serial number routing (`Device.serialNumber`, `connectionMode` default `adms_push` in `prisma/schema.prisma` ~166–176).
- Location-scoped matching of terminal user IDs to `Staff.deviceUserId`.
- Unmapped punches retained and recoverable in-product.

### What is not live / must not be sold here

| Topic | Status | Evidence |
|-------|--------|----------|
| Direct LAN / TCP pull (`pull_tcp`) | Deferred; enum reserved | `DeviceConnectionMode` in `prisma/schema.prisma` ~146–149; `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` |
| BioTime / ZKBio | Not found | Prior ZKTeco brief; no integration code found |
| Universal ZKTeco compatibility | Not proven | Field-test docs; ADMS ATTLOG subset only |
| SR+ biometric template management | Not found | Device does biometrics locally; SR+ stores punch rows |
| Comm-key enforced ADMS auth | Not required in v1 | Pull/ADMS decision + ZKTeco brief |

### Hardware requirement (honest)

Supported **ZKTeco-style terminals that can push compatible ATTLOG via ADMS** are optional. Manual attendance works without devices. Required hardware is **not** an SR+ phone or tablet kiosk — it is either nothing (manual) or a supported terminal.

Deep protocol/setup content belongs on `/zkteco-attendance-integration`, not this page.

---

## 9. Setup and workflow reality

### Typical manager workflow (product-backed)

1. Build and publish a weekly roster (scheduling product).
2. Optionally register a device and map terminal user IDs to staff.
3. Capture punches:
   - Manager adds manual in/out, or
   - Terminal pushes ADMS ATTLOG events.
4. Review the attendance week grid (present / late / absent / leave states).
5. Correct punches or set day overrides; map unmatched device users.
6. Generate pay-period summary; download CSV or print for payroll handoff.

### Setup surfaces

- Setup wizard includes an **attendance** step for grace minutes and overtime threshold flags (`app/(authenticated)/setup/setup-wizard.tsx` ~19, ~448–491).
- Device pairing checklist and limits live primarily in Devices + plan-limit code (`lib/plan-limits.ts` `checkDeviceSlotLimit`, `lib/plans.ts` `FREE_DEVICE_SLOTS`).

### Permissions reality

- Attendance APIs use authenticated app sessions (`getSession()`), not employee self-service accounts.
- Roles are `owner` / `admin` / `member` (`AppUserRole` in `prisma/schema.prisma` ~152–156). There is no separate “staff punch role.”
- Employee self-service attendance portal: **planned/documented only** (`docs/MOBILE_STRATEGY.md`, `docs/PRODUCT_NOTES.md`).

---

## 10. Product limitations

1. **Not an employee mobile time clock.** Phone clock-in is explicitly out of scope for staff `/me` planning (`docs/MOBILE_STRATEGY.md` ~101–105).
2. **Not a kiosk / QR / GPS product** inside Simple Roster Plus.
3. **ADMS-only** cloud device path; LAN pull not available from Vercel cloud (`docs/DEVICE_INGEST_PULL_TCP_DECISION.md`).
4. **Verify method not ingested** from live ATTLOG into `verifyMethod`.
5. **No early-departure status.**
6. **No break or meal-break enforcement product.**
7. **Overtime is a weekly worked-minutes threshold summary**, not labor-law automation.
8. **No attendance notification/alerts** (late, missed punch, device offline) as implemented product features; messaging code found is roster/WhatsApp oriented, not attendance alerts.
9. **Corrections are immediate**, not approval-queued.
10. **Exports are payroll preparation**, not payroll integration.
11. **Multi-location attendance is per location**, not a combined org punch dashboard.
12. **Overnight attendance reconciliation is limited** to calendar-day punch bucketing.
13. **Duplicate suppression is narrow** (±1s on device ingest; manual API does not use the same helper).

---

## 11. Unsafe or unsupported claims

Do **not** claim or imply:

| Claim | Why unsafe |
|-------|------------|
| Employees clock in from their phones / “mobile time clock app” | No employee punch UI; phone clock-in out of scope |
| GPS time clock / geofenced clock-in | No geolocation implementation found |
| Browser employee clock-in / self-service punching | Manual punches require manager session |
| Kiosk mode / tablet clock station (in SR+) | Explicit non-goal in `docs/MOBILE_STRATEGY.md` ~126 |
| QR-code or PIN clock-in **in the SR+ app** | Not found as SR+ workflows |
| Facial recognition / fingerprint **app** | Device-side only; `verifyMethod` not populated from ADMS |
| Works with all ZKTeco devices / BioTime / ZKBio / LAN SDK | Contradicted by ADMS-only scope and prior ZKTeco brief |
| Offline clocking app / guaranteed offline sync | Cannot verify as SR+ product promise |
| Automatic timesheets | Pay-period prep ≠ timesheet product |
| Payroll sync / payroll integration | CSV/print handoff only |
| Break tracking / meal-break enforcement | Not found |
| Automated overtime calculations (compliance) | Weekly threshold summary only |
| Real-time late / missed-punch / device-offline alerts | Not implemented as attendance alerts |
| Approval workflow for corrections | Immediate manager edits only |

---

## 12. Recommended positioning

### Recommended positioning statement

> Simple Roster Plus records employee clock events — entered by managers or received from supported ZKTeco attendance devices — and compares them with the weekly roster.

### Supporting message

> Build the schedule first. Capture punches manually or from ADMS-capable terminals. Match unmatched device users, apply grace periods, review present/late/absent outcomes, correct exceptions, and export a payroll-prep summary.

### Differentiation

| Page | Owns |
|------|------|
| **This page** | How punches/clock events enter; manual vs device capture; matching; unmatched recovery; “time clock app” qualification |
| `/employee-attendance-software` | Broader attendance management and plan-versus-actual review story |
| `/zkteco-attendance-integration` | ADMS protocol, pairing, compatibility boundaries, device limits |

### Draft prompt wording assessment

| Draft | Verdict |
|-------|---------|
| Title: `Employee Time Clock App for Scheduled Teams \| Simple Roster Plus` | Usable **only with** meta/hero qualification; prefer “Software” in title if CTR quality matters more than exact-match |
| H1: `Connect Clock Events to the Weekly Roster` | **Recommended** — accurate, differentiated, does not overclaim “app” |
| Positioning: manual or ZKTeco + compare with scheduled shifts | **Approved direction** — matches repo |

---

## 13. Recommended page outline

1. **Hero** — Roster-connected clock events (qualify: not a phone punch app)
2. **How clock events enter** — Manual manager entry + supported ZKTeco ADMS devices
3. **Match punches to people** — Device user IDs, unmatched recovery
4. **Review against the roster** — Present, late, absent, leave-backed states, grace
5. **Correct and annotate** — Punch edits, day overrides, notes
6. **Payroll handoff** — Pay-period CSV / print (not payroll sync)
7. **What this is not** — Mobile app clock-in, GPS, kiosk, BioTime, breaks, OT compliance
8. **Fit for small / shift-based teams** + pricing anchor
9. **FAQ**
10. **Closing CTA**

---

## 14. Suggested H1

### Recommended

`Connect Clock Events to the Weekly Roster`

### Alternative (if exact-match keyword must appear in H1)

`Employee Time Clock Software Connected to Your Roster`

Avoid H1s like “Employee Time Clock App” alone — they invite mobile-clock expectations.

### Suggested hero supporting sentence

> Capture attendance manually or from supported ZKTeco devices, match clock events to staff, and review present, late, and absent outcomes against scheduled shifts.

---

## 15. Suggested SEO title

### Recommended

`Employee Time Clock Software for Scheduled Teams | Simple Roster Plus`

### Alternative (stronger exact-match, higher mis-click risk)

`Employee Time Clock App for Scheduled Teams | Simple Roster Plus`

Prefer the **Software** title unless search tests prove the App variant converts qualified leads after qualification copy is live.

---

## 16. Suggested meta description

### Recommended

> Record employee clock-in and clock-out events manually or from supported ZKTeco devices, match punches to staff, and compare attendance with your weekly roster. Not a phone GPS time clock.

### Alternative

> Manager-entered punches and supported ZKTeco ADMS clock events, tied to scheduled shifts—with unmatched punch recovery, grace periods, and payroll-prep export.

Avoid promising mobile clock-in, kiosk, breaks, overtime automation, or payroll sync in the meta.

---

## 17. Recommended section headings

| Section | Heading |
|---------|---------|
| Hero | Connect Clock Events to the Weekly Roster |
| Capture | Two Ways Clock Events Enter Simple Roster Plus |
| Matching | Match Device Punches to the Right Staff Member |
| Review | See Present, Late, and Absent Against the Schedule |
| Correct | Correct Punches and Add Context |
| Export | Prepare Attendance Hours for Payroll Handoff |
| Limits | What This Time Clock Page Is Not |
| Fit | Built for Small, Shift-Based Teams |
| FAQ | Employee Time Clock Questions |

---

## 18. Calls to action

Align with Gate 1 marketing conventions:

| CTA | Destination |
|-----|-------------|
| Primary: **Start Free** | `https://app.simplerosterplus.com/sign-up` |
| Secondary: **Explore demo** | `https://app.simplerosterplus.com/sign-up?intent=demo` |
| Header: **Log in** | `https://app.simplerosterplus.com/login` |

Optional contextual labels: “Review attendance”, “Connect a supported device” (link to ZKTeco page or Devices docs carefully — prefer in-product after signup).

Do not deep-link into authenticated attendance routes from the marketing site as if they were public.

---

## 19. Internal links

### Outbound from this page

| Target | Why |
|--------|-----|
| `/employee-attendance-software` | Broader plan-versus-actual attendance story |
| `/zkteco-attendance-integration` | Device/ADMS technical depth |
| `/employee-scheduling-software` | Roster is the plan side of punch comparison |
| `/small-business-employee-scheduling` | SMB fit |
| `/employee-leave-and-availability` | Leave-backed absence / exception context |
| `/#pricing` | Plan and device-slot expectations |

Use natural anchors (“employee attendance software”, “ZKTeco attendance integration”), not forced exact-match spam.

### Inbound recommendations

| From | Why |
|------|-----|
| `/employee-attendance-software` | Capture subsection should point here for punch-entry depth |
| `/zkteco-attendance-integration` | After protocol story, point here for roster/punch review framing |
| `/employee-scheduling-software` | After publish story, “compare clock events with the roster” |
| Homepage solutions / footer commercial set | When the page is live |

---

## 20. Recommended screenshots

Recommend **only real product screens**. Do not invent mobile punch UIs.

| # | Screen / workflow | Claim supported | Keep visible / explain | Demo data | Device data? | Hide |
|---|-------------------|-----------------|------------------------|-----------|--------------|------|
| 1 | Attendance week grid with present/late/absent glyphs | Roster-connected review | Grace / leave states if shown | Fictional café staff + shifts | Optional | Real names/phones |
| 2 | Add manual punch modal | Manager clock-in/out entry | Manager context (not employee self-serve) | One staff, in/out | No | — |
| 3 | Attendance log with CORRECTED pill | Punch correction | Original vs corrected time tooltip if shown | One corrected punch | No | — |
| 4 | Unmapped device punches panel + map users | Unmatched retention/recovery | Unmatched rows exist until mapped | Device user IDs | Yes (sanitized SN) | Serials if sensitive |
| 5 | Devices list / ADMS status (optional, light) | Device-based capture exists | Point to ZKTeco page for setup depth | One enabled device | Yes | Comm secrets |
| 6 | Pay-period workspace CSV/download or print | Payroll handoff | Label as prep, not payroll sync | Small date range | No | Wage rates if any |

**Do not** screenshot fictional phone GPS clock-in, kiosk mode, or BioTime.

---

## 21. FAQ topics

Evidence-based answers (for eventual page FAQ):

1. **Can employees clock in from their phones?**  
   No. Simple Roster Plus does not provide employee mobile clock-in. Attendance is manager-entered and/or received from supported devices.

2. **Does Simple Roster Plus support ZKTeco devices?**  
   Selected ADMS-capable terminals that send compatible ATTLOG over HTTPS. See `/zkteco-attendance-integration`. Not universal ZKTeco / BioTime / LAN pull.

3. **Can managers enter attendance manually?**  
   Yes. Managers can add clock-in and clock-out records with optional notes.

4. **What happens to unmatched clock events?**  
   Device punches without a matching staff `deviceUserId` are retained for review and can be mapped later.

5. **Can attendance records be corrected?**  
   Yes. Managers can edit or remove unfiled punches; the first original time is retained for context. No approval queue.

6. **Does it show late and absent staff?**  
   Yes, relative to scheduled shifts and an organization grace period. Leave and station-closed states also appear.

7. **Does it track breaks?**  
   No dedicated break-tracking or meal-break enforcement product. Multiple punches may exist; that is not break management.

8. **Does it calculate overtime?**  
   It can summarize weekly worked time against a configurable threshold. It is not a labor-law overtime engine.

9. **Does it create timesheets?**  
   No timesheet product. Managers can prepare pay-period summaries for handoff.

10. **Does it integrate with payroll?**  
    No automated payroll integration. CSV download and printable summaries support manual handoff.

11. **Does it support GPS or geofencing?**  
    No.

12. **Does it work across multiple locations?**  
    Locations and devices are supported, but attendance review is location-scoped—not one combined multi-site punch dashboard.

13. **Can it handle overnight shifts?**  
    Overnight shift templates exist on the roster side; attendance classification is calendar-day based. Do not overclaim full overnight punch reconciliation.

14. **Is it a kiosk time clock?**  
    No in-app kiosk mode. Physical ZKTeco terminals are separate hardware.

15. **What hardware is required?**  
    None for manual entry. Optional supported ZKTeco ADMS terminals for device punches. No SR+ phone/tablet kiosk requirement.

---

## 22. Structured-data recommendation

For the eventual static page (do not implement in this task):

| Type | Recommendation |
|------|----------------|
| `WebPage` | Yes — name, url, description, `isPartOf` site |
| `BreadcrumbList` | Yes — Home → Employee Time Clock (or final nav label) |
| Software entity reference | Optional `about` / `isPartOf` link to existing site `#software` pattern used on other commercial pages |
| `FAQPage` | Only if visible FAQ markup is implemented on the page |

**Do not** emit:

- `MobileApplication`
- PayrollSoftware / timesheet product types
- GPS / kiosk / biometric software types
- Unsupported OS or device lists

---

## 23. Static-site implementation notes

Later implementation only:

| Item | Guidance |
|------|----------|
| File | `landing-page/employee-time-clock-app/index.html` |
| Canonical | `https://www.simplerosterplus.com/employee-time-clock-app` (HTTPS, www, no trailing slash, no `index.html`) |
| Metadata | Title, description, robots `index,follow`, OG/Twitter mirroring canonical |
| Template | Match existing commercial pages (scheduling, attendance, leave) |
| CTAs | Absolute `https://app.simplerosterplus.com/sign-up` (+ demo intent) and `/login` |
| Images | Real screenshots; WebP where practical; descriptive alt; width/height |
| Mobile | Responsive; no horizontal overflow; CTA accessible |
| Sitemap | Add URL once to `landing-page/sitemap.xml` |
| Robots | Ensure not blocked (current `Allow: /`) |
| Internal links | Wire from attendance + ZKTeco pages when shipping |
| Production validation | Confirm apex/www, trailing-slash, `/index.html` redirects |
| Search Console | Live URL inspection + request indexing (manual) |
| SEO runner | After page + config exist: `npm run seo:check -- employee-time-clock-app` and `npm run seo:verify -- employee-time-clock-app` (see `docs/seo-verification-runner.md`). Add a page config entry in `scripts/seo/page-configs.mjs` when implementing. |

---

## 24. Time-clock wording guide

### Prefer (when accurate)

- clock events, clock-in records, clock-out records, attendance punches
- manual attendance entry / manager-entered punches
- device-based attendance / supported ZKTeco attendance devices
- digital attendance records
- roster-connected time clock / employee punch clock software
- ADMS push / compatible ATTLOG punches

### Avoid unless explicitly true (they are not, today)

- mobile time clock app / employees clock in from their phones
- GPS time clock / geofenced clock-in
- kiosk mode / tablet clock station (as an SR+ feature)
- offline clocking (as an SR+ app promise)
- biometric app / facial-recognition time clock (as SR+ software)
- automatic timesheets / break tracking / overtime automation
- payroll sync / real-time attendance alerts
- employee self-service clocking

### “App” usage rule

Use **app** only for the Simple Roster Plus **manager web application**, never as shorthand for employee-facing mobile punching.

---

## 25. Attendance wording guide

| Term | Meaning in SR+ |
|------|----------------|
| Clock event / punch | One `AttendanceLog` row (`in` or `out`) |
| Attendance record | Punch row and/or derived day status in the week grid |
| Roster assignment | Scheduled shift / expected start-end for that calendar day |
| Present | In-punch on or before start + grace (or manual present override) |
| Late | First in-punch after start + grace |
| Absent | Expected shift with no qualifying in-punch after absent window (or manual absent) |
| Excused (marketing) | Prefer **vacation / sick leave / day off / station closed** — not a separate punch enum |
| Unmatched event | Device punch with `staffId` null |
| Corrected attendance | Punch with `originalPunchAt` set after edit |
| Manual override | `AttendanceDayOverride` present/absent for a calendar day |
| Payroll export | Pay-period CSV / print handoff |
| Timesheet | **Do not use** unless a true timesheet workflow is built |

Do not call a pay-period CSV “payroll integration.”  
Do not call leave-backed states “excused punches.”

---

## 26. Final evidence table

| # | Capability | Classification | Repository evidence | Marketing implication |
|---|------------|----------------|---------------------|------------------------|
| 1 | Manual clock-in | **Confirmed and available** | `PunchType.in`; `POST` in `app/api/attendance/punches/route.ts` (~54–63); `add-punch-modal.tsx` | May claim manager manual clock-in |
| 2 | Manual clock-out | **Confirmed and available** | `PunchType.out`; same punch API/UI | May claim manager manual clock-out |
| 3 | Manager-entered attendance | **Confirmed and available** | Authenticated `getSession()` punch APIs; `createdByUserId` on `AttendanceLog` | Primary capture story |
| 4 | Employee-entered attendance | **Not found** | No employee punch route; `/me` attendance not implemented | Must not claim |
| 5 | Browser clock-in (employee) | **Not found** | No public/employee browser punch UI. Manager-authenticated web punch entry exists separately (rows 1–3) and must not be marketed as employee browser clock-in. | Must not claim employee browser clock-in |
| 6 | Mobile clock-in | **Not found** | `docs/MOBILE_STRATEGY.md` ~101–105 OUT; no employee punch UI | Must not claim |
| 7 | Native mobile app | **Planned or documented only** | `docs/MOBILE_STRATEGY.md` Option B / M5 evaluation | Must not claim as available |
| 8 | Progressive web app clock-in | **Planned or documented only** | PWA discussed as future option in `docs/MOBILE_STRATEGY.md` ~30–34; no clock-in PWA | Must not claim |
| 9 | GPS clock-in | **Not found** | No geolocation usage under `app/`; no GPS fields in schema | Must not mention |
| 10 | Geofencing | **Not found** | Same as GPS | Must not mention |
| 11 | Shared kiosk mode | **Not found** | Non-goal in `docs/MOBILE_STRATEGY.md` ~126 | Must not claim |
| 12 | Tablet clock station (SR+) | **Not found** | No kiosk/tablet station product surface | Must not claim |
| 13 | PIN clock-in (in SR+) | **Not found** | No SR+ PIN punch UX; terminal PIN may exist on hardware only | Do not claim SR+ PIN clock-in; hardware PIN belongs to device story with care |
| 14 | QR-code clock-in | **Not found** | No QR punch workflow found | Must not mention |
| 15 | Biometric clock-in | **Available with limitations** | Physical ZKTeco may biometrically verify; SR+ receives ATTLOG; `PunchVerifyMethod` exists (~541–548) but ADMS path does not set `verifyMethod` | May say supported terminals can capture attendance after on-device verification; do not sell SR+ biometric software |
| 16 | Facial recognition | **Available with limitations** | Enum includes `face`; not populated from live ADMS ingest | Do not market facial-recognition time clock app |
| 17 | Fingerprint recognition | **Available with limitations** | Enum includes `fingerprint`; same ingest gap | Do not market fingerprint app |
| 18 | ZKTeco ADMS clock events | **Confirmed and available** | `app/iclock/cdata/route.ts`, `getrequest/route.ts`, `lib/zk-iclock-push.ts`, `PunchSource.device_adms` | Claim with “supported / compatible ADMS” qualification; deep detail on ZKTeco page |
| 19 | Direct LAN or TCP device integration | **Planned or documented only** | `pull_tcp` in `DeviceConnectionMode` (~146–149); deferred in `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` | Must not claim as available |
| 20 | BioTime or ZKBio integration | **Not found** | No integration code; prior ZKTeco brief | Must not claim |
| 21 | Offline clock capture | **Cannot verify** | Terminal buffering may exist externally; no SR+ offline agent | Do not promise offline clocking |
| 22 | Clock event synchronization | **Available with limitations** | ADMS HTTPS push when device can reach cloud | Claim cloud receive of compatible punches; not continuous offline sync |
| 23 | Near-duplicate event suppression | **Available with limitations** | `lib/attendance-punch-ingest.ts` ±1s (`DEDUPE_WINDOW_MS = 1000`); manual API does not use it | Device ingest only; do not claim universal dedupe |
| 24 | Staff-device user matching | **Confirmed and available** | `Staff.deviceUserId` unique per location; ADMS match in `lib/zk-iclock-push.ts` | May claim |
| 25 | Unmatched clock-event retention | **Confirmed and available** | Nullable `staffId`; unmapped APIs/libs | May claim |
| 26 | Unmatched event recovery | **Confirmed and available** | `app/api/attendance/device/map-users/route.ts`; `unmapped-device-punches-panel.tsx` | May claim |
| 27 | Manual attendance correction | **Confirmed and available** | `app/api/attendance/punches/[id]/route.ts`; `originalPunchAt` / corrector fields | May claim; note filed pay-period locks |
| 28 | Attendance notes | **Confirmed and available** | `AttendanceLog.note`; override `note`/`lateReason`; pay-period `notes` | May claim |
| 29 | Attendance overrides | **Confirmed and available** | `AttendanceDayOverride` present/absent only (~637–661) | May claim day present/absent overrides |
| 30 | Approval workflow for corrections | **Not found** | Overrides/punches are immediate writes | Must not claim approvals |
| 31 | Scheduled-versus-actual comparison | **Available with limitations** | `lib/attendance-week.ts` + `computePresence`; status-first, not full hours variance report | Claim status comparison; not full hours reconciliation suite |
| 32 | Present status | **Confirmed and available** | `lib/attendance-policy.ts` ~170–176 | May claim |
| 33 | Late status | **Confirmed and available** | Same file ~172–180 | May claim |
| 34 | Absent status | **Confirmed and available** | Same file absent window ~96–120, ~180 | May claim |
| 35 | Excused status | **Available with limitations** | Leave/station states `on_vacation` / `on_sick_leave` / `day_off` / `station_closed`; no `excused` enum; override comments ~633–636 reject excused override value | Prefer leave-state wording; avoid generic “excused punch status” |
| 36 | Early departure detection | **Not found** | `endHHmm` not used for early-leave status in `computePresence` | Must not claim |
| 37 | Overtime calculation | **Available with limitations** | `lib/overtime.ts` weekly threshold summary; setup wizard flag | Claim weekly worked-time threshold only; not compliance OT |
| 38 | Break tracking | **Not found** (as punch/clock feature) | No break punch types. Roster shift templates support `unpaidBreakMinutes` in `lib/shift-duration.ts` (~18–46) for scheduled duration math only; log copy mentioning return-from-break is descriptive (`lib/attendance-log-data.ts`). | Must not claim break tracking or break punches; unpaid roster breaks belong to scheduling, not this page |
| 39 | Meal-break enforcement | **Not found** | No meal-break rules engine or meal punch workflow found | Must not claim |
| 40 | Overnight shift handling | **Available with limitations** | Overnight roster duration helpers exist; attendance day bucketing is local calendar day | Qualify heavily |
| 41 | Multiple punches per shift | **Confirmed and available** | Multiple `AttendanceLog` rows; pair math in staff report | May claim multiple in/out records |
| 42 | Grace periods | **Confirmed and available** | `getGraceMinutes` in `lib/attendance-week.ts` ~119–128; setup wizard | May claim |
| 43 | Rounding rules | **Not found** | No punch-time rounding product; overtime threshold step rounding is unrelated | Must not claim punch rounding |
| 44 | Timezone handling | **Confirmed and available** | Org/location/device `timeZone`; `formatYmdInZone` / datetime policy | May claim local-day classification |
| 45 | Multi-location behavior | **Available with limitations** | `Location`, `Device.locationId`, `AttendanceLog.locationId` | Location-scoped; OK to mention multi-site orgs with care |
| 46 | Combined multi-location attendance view | **Not found** | Week/report paths are location-scoped | Must not claim unified multi-site punch dashboard |
| 47 | Payroll export | **Available with limitations** | Pay-period CSV/print prep (`lib/pay-period-export.ts`) | “Payroll handoff / prep” only |
| 48 | CSV export | **Confirmed and available** | `buildPayPeriodCsv` / `downloadPayPeriodCsv` in `lib/pay-period-export.ts` | May claim pay-period CSV |
| 49 | Printable attendance reports | **Confirmed and available** | Print flows on staff report / pay-period UI (attendance brief + pages under `app/(authenticated)/attendance/`) | May claim printable summaries |
| 50 | Timesheet generation | **Not found** | No timesheet workflow/module | Must not call exports timesheets |
| 51 | Payroll integration | **Not found** | No vendor payroll API sync found | Must not claim |
| 52 | Employee self-service | **Planned or documented only** | `docs/MOBILE_STRATEGY.md`, `docs/PRODUCT_NOTES.md` | Must not claim |
| 53 | Employee attendance history | **Not found** (employee portal) | Manager staff report / log exist (`lib/staff-attendance-report.ts`, attendance UI); no employee self-view of attendance history | Do not claim employee self-serve history; manager reports belong on the attendance page |
| 54 | Notifications (attendance) | **Planned or documented only** | Optional late-notify mentioned in launch docs; no attendance alert sender found | Must not claim live attendance alerts |
| 55 | Email alerts (attendance) | **Not found** | Welcome email mentions time clocks generically (`lib/email/welcome.ts`); not late/missed-punch alerts | Must not claim |
| 56 | SMS alerts (attendance) | **Not found** | SMS/WhatsApp stack is roster-oriented | Must not claim |
| 57 | WhatsApp alerts (attendance) | **Not found** | `lib/messaging/*` roster/WhatsApp; pay-period can build WhatsApp **message text** for handoff, not punch alerts | Do not claim punch alerts via WhatsApp |
| 58 | Missed-punch alerts | **Not found** | Staff report may flag irregular sequences in-app; no push alert | In-app review only; no alert product |
| 59 | Late-arrival alerts | **Not found** | Late status in grid; no notifier | Must not claim alerts |
| 60 | Device offline alerts | **Not found** (as alerts) | In-app online/idle/offline pills from `Device.lastSeenAt` (`app/components/device-status-cells.tsx`); no email/SMS/push offline alert pipeline | Do not claim offline alerts; in-app device status may appear on the ZKTeco/devices story only |
| 61 | Audit history | **Available with limitations** | Creator/corrector/original punch/device raw fields on `AttendanceLog`; override decider fields | Limited correction metadata, not compliance audit trail |
| 62 | Correction metadata | **Confirmed and available** | `originalPunchAt`, `correctedByUserId`, `correctedAt` (~579–586) | May claim |
| 63 | Manager permissions | **Confirmed and available** | Authenticated org users (`owner`/`admin`/`member`) operate attendance APIs | Manager/admin web app story |
| 64 | Staff permissions (punch) | **Not found** | No staff punch role or portal | Must not claim staff punch permissions |
| 65 | Plan limits | **Confirmed and available** | `lib/plans.ts`, `lib/plan-limits.ts`, `docs/PRICING.md` | Mention device/staff limits honestly; details on pricing |
| 66 | Device limits | **Confirmed and available** | `FREE_DEVICE_SLOTS`; `checkDeviceSlotLimit` in `lib/plan-limits.ts`; device trial `lib/device-trial.ts` | Prefer pointing to ZKTeco/pricing pages for numbers |
| 67 | Setup requirements | **Confirmed and available** | Setup wizard attendance step; device ADMS Cloud Server config documented on ZKTeco materials | Manual path needs roster + staff; device path needs ADMS setup |
| 68 | Required hardware | **Available with limitations** | Optional supported ZKTeco ADMS terminal; manual needs none | Never require phone kiosk hardware |
| 69 | Browser or OS requirements | **Cannot verify** as a published matrix | Next.js manager web app; no formal support matrix found for this brief | Do not invent OS/browser certification lists |
| 70 | Known edge cases and limitations | **Confirmed and available** (as documented behavior) | Filed pay-period edit locks (`lib/pay-period-filed-lock.ts`); calendar-day overnight limits; ADMS-only; unmatched until mapped; narrow dedupe; no early departure; verifyMethod gap | Surface the important ones in “What this is not” + FAQ |

---

## Quality checklist (brief author)

- [x] All 70 capabilities appear in the final evidence table  
- [x] Material claims cite repository paths  
- [x] Mobile / GPS / kiosk / payroll sync / breaks / timesheets / self-service not implied as available  
- [x] Differentiated from attendance and ZKTeco pages  
- [x] Keyword-fit assessment is direct  
- [x] Docs/TODOs/enums alone not treated as live features (`pull_tcp`, PWA, `/me`, `verifyMethod`)  
- [x] Implementation of the landing page is explicitly out of scope for this task  

---

*End of brief. Implementation should wait for explicit Phase 2 page-build instructions.*
