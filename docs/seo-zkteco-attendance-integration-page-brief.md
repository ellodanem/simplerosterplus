# ZKTeco Attendance Integration Page — Evidence-Based Content Brief

**Prepared:** 17 July 2026
**Target URL:** `https://www.simplerosterplus.com/zkteco-attendance-integration`
**Primary keyword:** `ZKTeco attendance software`
**Scope:** Content and implementation brief only. No landing page, navigation, schema, sitemap, or image changes are included.

---

## 1. Page objective

Create a focused commercial landing page for buyers who already own, or plan to use, a supported ZKTeco attendance terminal and need roster-connected software around the punch data.

The page should:

- Explain that Simple Roster Plus receives compatible attendance punches from supported ZKTeco terminals using **ADMS push**.
- Show how terminal users are matched to employees and how unmatched punches are recovered.
- Connect device punches to the weekly roster so managers can compare scheduled vs actual attendance.
- Set honest expectations about setup, model/firmware dependence, and cloud-product limits.
- Convert qualified visitors to **Start Free** or **Explore demo**.
- Avoid becoming a general attendance page, scheduling page, hardware storefront, BioTime/ZKBio portal, or universal ZKTeco compatibility claim.

### Desired reader takeaway

> Receive compatible attendance punches from supported ZKTeco terminals using ADMS push, then compare employee clock-ins with scheduled shifts in Simple Roster Plus.

Treat that wording as a draft, not approved copy.

---

## 2. Target audience

### Primary audience

- Owners and managers of small, shift-based teams who already use or plan to buy a ZKTeco attendance terminal
- Buyers searching for software that works with ZKTeco clocks without replacing their hardware
- Operators who need punches to land against a published weekly roster

### Secondary audience

- Buyers comparing biometric attendance products who need an honest ADMS-compatible option
- Partners or installers evaluating whether Simple Roster Plus can receive ADMS ATTLOG from a customer site

### Not the primary audience

- Buyers looking for ZKTeco hardware sales
- Buyers needing BioTime / ZKBio Time as the software layer
- Buyers requiring LAN pull TCP or a Windows agent from the cloud product
- Buyers needing fingerprint/face template vaulting in the cloud software

---

## 3. Search intent

Primary intent is **commercial investigation** for ZKTeco-compatible attendance software:

- Can this software connect to my ZKTeco terminal?
- Is setup ADMS / cloud push or LAN pull?
- Which models are supported?
- What configuration is required on the terminal?
- How are terminal users linked to employees?
- What happens when punches arrive unmapped?

Secondary intent is **comparison / validation**:

- Is this BioTime or a roster-first alternative?
- Does it store biometric templates?
- Is hardware included?

The page must answer the validation questions with precise limits so unqualified buyers self-select out early.

---

## 4. Primary and supporting keywords

### Primary

- `ZKTeco attendance software`

### Supporting

- `ZKTeco integration`
- `ZKTeco attendance integration`
- `ZKTeco-compatible attendance software`
- `ZKTeco time attendance integration`
- `ZKTeco biometric attendance software`
- `software for ZKTeco attendance devices`
- `ZKTeco ADMS attendance software`

### Keyword use guidance

- Prefer “supported ZKTeco terminals” and “ADMS push” over “ZKTeco biometric software” as a headline promise.
- “Biometric” may appear when describing the terminal category, not as a claim that Simple Roster Plus stores fingerprint or face templates.
- Do not rank this page as a BioTime or ZKBio replacement page.

---

## 5. Confirmed integration capabilities

These claims are supported by application code and may be used carefully on the page.

### Connection and ingest

- Cloud ingest path is **ADMS push** over HTTPS to public `/iclock/`* routes.
- Terminals identify themselves with serial number (`SN`).
- Compatible **ATTLOG** lines are parsed and stored as attendance punches.
- Handshake responses request real-time-style transfer settings; actual arrival timing depends on the terminal.
- Duplicate punches within a short window are suppressed.
- Device contact updates `lastSeenAt` for manager/operator visibility.

Evidence anchors:

- `app/iclock/cdata/route.ts`
- `app/iclock/getrequest/route.ts`
- `lib/zk-iclock-push.ts`
- `lib/attendance-punch-ingest.ts`
- `lib/adms-device.ts`
- `docs/DEVICE_INGEST_PULL_TCP_DECISION.md`

### Device registration and pairing

- Managers can register a device in **Devices**, choose ADMS push, assign a location, and receive a pairing checklist.
- Pairing UI surfaces server address, port **443**, **HTTPS**, and older-firmware full URLs.
- Devices are enabled on create; unknown or disabled serials do not store punches.
- Org-level **Public URL** configures the HTTPS origin terminals should reach.

Evidence anchors:

- `app/components/add-device-drawer.tsx`
- `app/api/devices/route.ts`
- `app/api/devices/public-url/route.ts`
- `lib/public-url.ts`
- `docs/DEVICE_INGEST_FIELD_TEST.md`

### Matching punches to people and places

- Each device belongs to a location.
- Staff are matched by `deviceUserId` at that location.
- Unmatched punches are retained with `staffId` null and can be mapped later, with backfill of prior rows.
- Punch direction is derived from ATTLOG state codes or alternation rules (`in` / `out`).

Evidence anchors:

- `prisma/schema.prisma` — `Device`, `Staff.deviceUserId`
- `lib/attendance-staff-device-map.ts`
- `lib/unmapped-device-punches.ts`
- `app/api/attendance/device/unmapped/route.ts`
- `app/api/attendance/device/map-users/route.ts`

### Roster connection

- Device punches feed the same attendance views used for roster comparison (scheduled / present / late / absent).
- This page may briefly point to attendance and scheduling pages for that manager workflow.

### Commercial limits (software slots)

- Free: 1 device slot with a 30-day live sync trial after first connect.
- Plus: 1 included device; extras billed as add-ons.
- Pro: 3 included devices; extras billed as add-ons.
- Device slots mean software connectivity, not hardware ownership.

Evidence anchors:

- `docs/PRICING.md`
- `lib/plans.ts`
- `lib/plan-limits.ts`
- `lib/device-trial.ts`

---

## 6. Confirmed field-test evidence

### What the repository proves


| Evidence                                         | Result              | Source                                                            |
| ------------------------------------------------ | ------------------- | ----------------------------------------------------------------- |
| Curl-simulated ADMS ATTLOG on a non-seed org     | **PASS**            | `docs/mvp-launch/field-test-log.md`                               |
| Model label used in that pass                    | **K40 (simulated)** | same                                                              |
| Mapped punch → `AttendanceLog`                   | **PASS**            | same                                                              |
| Unmapped punch retained + backfill after mapping | **PASS**            | same                                                              |
| `lastSeenAt` and adms-health punch counts        | **PASS**            | same                                                              |
| Automation script for the simulated path         | Present             | `scripts/zkteco-field-test.ts`                                    |
| Smoke/runbook procedures for staging + F22 menu  | Present             | `docs/DEVICE_INGEST_SMOKE.md`, `docs/DEVICE_INGEST_FIELD_TEST.md` |
| Device-ingest implementation steps               | Marked completed    | `docs/device-ingest/STATUS.md`                                    |


### What the repository does **not** prove

- A completed physical F22 (or other model) live punch into Simple Roster Plus production.
- A certified multi-model firmware matrix.
- Production partner-site device counts or firmware strings.
- That every ADMS-capable ZKTeco terminal will work without configuration differences.

`docs/mvp-launch/step-06-zkteco-live-test.md` states a physical-terminal mission; the recorded pass log is explicitly curl simulation and says to repeat with real hardware.

**Page rule:** Distinguish “protocol implemented and curl-verified” from “your exact terminal model is certified.” Prefer setup and compatibility language over a model endorsement table unless a physical pass is later logged.

---

## 7. Product and protocol limitations

State these clearly so the page remains trustworthy.

1. **ADMS push only** in the cloud product. Pull TCP / LAN SDK / Windows agent are deferred.
2. **ATTLOG only.** OPERLOG / BIODATA are not stored as attendance punches.
3. **Serial-number identity.** Comm keys may be generated for operators but are **not validated** on `/iclock` in v1.
4. **No certified all-model list.** Compatibility depends on terminal model, firmware, and menu configuration.
5. **No staff/enrolment push** from Simple Roster Plus to the terminal.
6. **No remote device command queue.** Poll endpoint acknowledges; it does not dispatch management commands.
7. **Verify method not parsed** from live ATTLOG into `verifyMethod` (enum exists; ADMS path leaves it null).
8. **No biometric template storage** in Simple Roster Plus.
9. **Not BioTime / ZKBio.** No integration with those products was found.
10. **Near-real-time is terminal-dependent**, not a guaranteed live-streaming dashboard.
11. **Offline buffering** is terminal firmware behavior; Simple Roster Plus has no offline Windows agent.
12. **Device trial extension** (+30 days if never published) is documented and coded as a function, but **no call sites** were found — do not market the extension until wired.
13. **Privacy policy** for device-synced attendance remains a placeholder stub (`noindex`).
14. Multi-location data model exists; some manager UX still centers on a default location.

---

## 8. Unsupported or unsafe claims

Do **not** put these on the page:


| Unsafe claim                                            | Why                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Works with all ZKTeco devices                           | No certified matrix; ADMS ATTLOG subset only                     |
| Supports every biometric terminal                       | Same                                                             |
| Real-time attendance guaranteed                         | Handshake requests realtime; UI is not a live stream             |
| Plug-and-play / no local configuration                  | Terminal Cloud Server / ADMS menu setup is required              |
| Supports BioTime                                        | Not found                                                        |
| Supports ZKBio                                          | Not found                                                        |
| Supports pull TCP                                       | Schema/UI only; deferred for cloud                               |
| Supports LAN SDK                                        | Explicitly not built                                             |
| Supports offline sync (as an SR+ feature)               | No SR+ agent; terminal buffering unverified as a product promise |
| Supports every firmware version                         | Firmware field is display/support data; not a matrix             |
| Includes biometric hardware                             | Device slots are software connectivity                           |
| Stores fingerprint or face templates                    | BIODATA ignored; no template models                              |
| Works without internet                                  | ADMS requires outbound HTTPS from the site                       |
| Automatic device discovery                              | Managers register serials; no discovery protocol                 |
| Automatic employee matching without setup               | Requires matching `deviceUserId` / enrolment PIN                 |
| Installation included                                   | Contact may offer help; no installation product SKU              |
| Universal HTTPS support on every firmware               | Docs distinguish modern vs older firmware URL styles             |
| Secure by default / compliance-ready biometric handling | Comm key unused at wire; privacy policy still stub               |
| Physical F22 production validation                      | Field pass is curl-simulated K40-labeled path                    |


---

## 9. Recommended page positioning

**Position as:** roster-first software that receives punches from supported ZKTeco terminals via ADMS push.

**Core message:**

> Plan the roster. Receive attendance from supported terminals. Compare what was scheduled with what actually happened.

**Angle:**

The buyer already owns or plans to use a supported ZKTeco attendance terminal and needs software that:

1. Accepts compatible ADMS ATTLOG punches.
2. Matches terminal users to staff.
3. Places those punches beside the weekly roster.

**Do not position as:**

- A ZKTeco reseller
- A BioTime/ZKBio alternative suite
- A universal hardware compatibility guarantee
- A biometric data vault
- A LAN pull or Windows-agent product

---

## 10. Recommended page outline

1. Hero — connect supported terminals to the roster
2. Who this page is for
3. How connection works (ADMS push)
4. What attendance data is received
5. Match terminal users to employees
6. Recover unmatched punches
7. Setup requirements on the terminal
8. Compatibility boundaries (honest limits)
9. Pricing and device slots
10. FAQ
11. Closing CTA

Keep the page concise. Do not turn every capability into its own section.

---

## 11. Suggested H1

**H1:** Connect Supported ZKTeco Attendance Terminals to Your Staff Roster

---

## 12. Suggested SEO title

**Title:** ZKTeco Attendance Integration | Simple Roster Plus

Alternate if character budget allows:

`ZKTeco Attendance Software with ADMS Push | Simple Roster Plus`

Prefer the shorter title unless SERP testing shows the ADMS qualifier improves click quality.

---

## 13. Suggested meta description

Receive compatible attendance punches from supported ZKTeco terminals using ADMS push, match terminal users to staff, and compare clock-ins with your weekly roster.

---

## 14. Recommended section headings


| Section           | Suggested H2                                           |
| ----------------- | ------------------------------------------------------ |
| Problem / fit     | Built for Teams That Already Use a ZKTeco Terminal     |
| Connection method | Connect with ADMS Push over HTTPS                      |
| Data received     | Receive Compatible ATTLOG Punches                      |
| Matching          | Match Terminal User IDs to Employees                   |
| Exceptions        | Keep Unmatched Punches Until You Map Them              |
| Setup             | What You Configure on the Terminal                     |
| Limits            | Compatibility Depends on Model, Firmware, and Settings |
| Pricing           | Device Slots Are Software Connections                  |
| FAQ               | Common Questions about ZKTeco Integration              |
| CTA               | Start Free and Register Your First Supported Terminal  |


---

## 15. Suggested calls to action

Primary:

- **Start Free** → `https://app.simplerosterplus.com/sign-up`

Secondary:

- **Explore demo** → `https://app.simplerosterplus.com/sign-up?intent=demo`

Supporting:

- **Log in** → `https://app.simplerosterplus.com/login`
- Contextual links to attendance and scheduling pages for the roster comparison story

Do not invent a “Buy a ZKTeco device” or “Book installation” CTA unless that offer is productized later.

---

## 16. Internal links

When the page is implemented, include:


| Destination                     | Suggested anchor             |
| ------------------------------- | ---------------------------- |
| `/`                             | employee roster software     |
| `/employee-attendance-software` | employee attendance software |
| `/employee-scheduling-software` | employee scheduling software |
| `/#pricing`                     | Pricing                      |
| `/privacy`                      | Privacy                      |
| `/terms`                        | Terms                        |


Also update:

- Homepage ZKTeco feature/FAQ copy with a contextual link to this page
- Attendance page device wording with a contextual link to this page
- Homepage footer
- `landing-page/sitemap.xml` with the canonical URL

Do not add those links until the page exists.

---

## 17. Recommended screenshots or visuals

Prefer existing product UI, not device product photography as the hero.

Suggested visuals (reuse or capture later):

1. **Devices** page or Add Device pairing card showing Server address / Port / HTTPS.
2. **Attendance Log** with device-sourced punches.
3. **Unmapped device punches** mapping panel.
4. Optional: attendance week view showing roster-connected statuses after punches arrive.

Do not invent a compatibility matrix graphic. Do not use hero imagery that implies Simple Roster Plus sells biometric hardware.

Inspect any screenshot before publishing so labels still match current product behavior.

---

## 18. FAQ topics grounded in actual functionality

1. **What connection method does Simple Roster Plus support?**
  ADMS push to `/iclock/`* over HTTPS.
2. **Does it support pull TCP or a Windows agent?**
  No — not in the cloud product today.
3. **Which ZKTeco models are supported?**
  Selected ADMS-capable terminals that send compatible ATTLOG. Compatibility depends on model, firmware, and configuration. Do not list unverified models as certified.
4. **Is F22 supported?**
  F22 is the primary documented field-test target in runbooks. Repository evidence of a physical F22 pass against SR+ was not found; claim carefully as “documented target for ADMS setup,” not “certified production proven,” until a physical pass is logged.
5. **What do I configure on the terminal?**
  Cloud Server / ADMS settings: server address, port 443, HTTPS, ATTLOG / real-time attendance on; OPERLOG-only off. Comm key not required for SR+ v1.
6. **How are employees matched?**
  Terminal enrolment / user ID must match staff `deviceUserId` at the device location.
7. **What happens to unmatched punches?**
  They are retained and can be mapped later; prior rows can backfill.
8. **Is attendance real-time?**
  Supported terminals can push promptly when configured; the manager view is not a guaranteed live-streaming dashboard.
9. **Does Simple Roster Plus store fingerprints or face templates?**
  No. It stores attendance punch records, not biometric templates.
10. **Is hardware included?**
  No. Device slots are software connectivity.
11. **Does it work with BioTime or ZKBio?**
  No BioTime/ZKBio integration was found.
12. **What are the plan device limits?**
  Free 1 (30-day trial), Plus 1 included, Pro 3 included, extras available as add-ons.

Transparent “No” answers are preferred over soft evasion.

---

## 19. Structured-data recommendation

When implementing the page later:

- Add `WebPage` and `BreadcrumbList`.
- Reference the existing product entity `https://www.simplerosterplus.com/#software`.
- Do **not** create a contradictory second `SoftwareApplication`.
- Do **not** add hardware `Product` offers, ratings, or “compatibleDevice” claims without a verified matrix.
- Do **not** add `FAQPage` unless visible FAQ markup and eligibility are verified.

Stable IDs to plan for:

- `https://www.simplerosterplus.com/zkteco-attendance-integration#webpage`
- `https://www.simplerosterplus.com/zkteco-attendance-integration#breadcrumb`

---

## 20. Static-site implementation notes

- Create `landing-page/zkteco-attendance-integration/index.html` (directory pattern, matching scheduling/attendance pages).
- Rely on existing `landing-page/vercel.json` (`cleanUrls`, `trailingSlash: false`).
- Canonical: `https://www.simplerosterplus.com/zkteco-attendance-integration`
- Meta robots: `index, follow`
- Absolute app CTAs for signup/demo/login
- Reuse brand tokens, header/footer patterns, and responsive conventions
- Keep one H1 and commercial scanning density
- Add sitemap entry only when the page ships
- Do not install a CMS or change application functionality for the marketing page

---

## 21. Device compatibility wording guide

### Preferred

- Supported ZKTeco terminals can send compatible ATTLOG punches using ADMS push.
- Compatibility depends on the terminal model, firmware, and configuration.
- Selected ADMS-capable terminals.
- Cloud connection uses HTTPS on port 443 to `/iclock/`*.

### Avoid

- Works with all ZKTeco devices.
- Compatible with every ZKTeco biometric terminal.
- Certified for [unverified model list].
- Plug-and-play with no setup.
- Supports BioTime / ZKBio / pull TCP / LAN SDK.

### F22 wording

Safe:

> Setup guidance focuses on ADMS Cloud Server settings commonly used with terminals such as the F22 family. Confirm your exact model and firmware can upload ATTLOG to a cloud server.

Unsafe:

> Fully certified with every F22 / proven in production on F22 hardware for Simple Roster Plus.

---

## 22. Setup-requirement wording guide

### Preferred

- Register the device serial in Simple Roster Plus and set the organization public HTTPS URL.
- On the terminal, enter the server address, port 443, and enable HTTPS.
- Turn on ATTLOG / real-time attendance upload; do not rely on OPERLOG-only.
- Match each terminal user ID to the employee’s device user ID.
- Older firmware may need full push/poll URLs instead of a server address alone.

### Avoid

- No configuration required.
- Automatic discovery.
- Works offline without internet.
- We install and configure every terminal for you (unless a paid onboarding offer is later productized and evidenced).

### Comm key wording

- Serial number identifies the device in v1.
- Do not claim encrypted/authenticated ADMS with enforced communication keys.

---

## 23. Pricing and device-limit notes

Use current verified limits:


| Plan | Device slots                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Free | 1 device slot; 30-day live sync from first connect; afterward historical read-only for device ingest while roster/manual attendance continue |
| Plus | 1 included; extra devices as paid add-ons                                                                                                    |
| Pro  | 3 included; extra devices as paid add-ons                                                                                                    |


Clarify:

- Device slots = software connectivity.
- Biometric hardware is not included.
- Do not advertise the unused +30-day extension path until it is wired and called from product flows.
- Multi-device and multi-location are possible within plan limits; do not invent unlimited fleets.

Sources: `docs/PRICING.md`, `lib/plans.ts`, `lib/device-trial.ts`.

---

## 24. Security and privacy wording boundaries

### Allowed

- Terminals send attendance punch data (user ID, timestamp, in/out state) to Simple Roster Plus.
- Simple Roster Plus stores punch records for attendance review, not biometric templates.
- Devices are matched by registered serial number.
- Managers can disable a device so further punches are not stored.

### Not allowed without legal/product updates

- Secure by default.
- End-to-end encrypted device authentication (handshake uses `Encrypt=0`; comm key unused at wire).
- Compliance-ready biometric data handling.
- GDPR/HIPAA/biometric-law certification claims.
- Claiming the privacy policy fully documents device sync (policy is still a placeholder stub).

Privacy implication for honest copy: biometrics remain on the terminal; SR+ receives punch events and staff identifiers.

---

## 25. Final evidence table


| #   | Capability                                          | Classification                                                       | Repository evidence                                                                                                                                                      | Safe marketing interpretation                                                                         |
| --- | --------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | Supported connection methods                        | **Available with limitations**                                       | `DeviceConnectionMode` in `prisma/schema.prisma`; live path is `adms_push` via `lib/zk-iclock-push.ts`; `pull_tcp` deferred in `docs/DEVICE_INGEST_PULL_TCP_DECISION.md` | Cloud product supports ADMS push; do not sell pull TCP as available                                   |
| 2   | ADMS push support                                   | **Confirmed and available**                                          | `app/iclock/cdata/route.ts`, `app/iclock/getrequest/route.ts`, `lib/zk-iclock-push.ts`, `middleware.ts` public `/iclock`                                                 | Receive punches from terminals configured for ADMS cloud push                                         |
| 3   | iClock protocol handling                            | **Confirmed and available**                                          | Same routes; handshake/POST handlers in `lib/zk-iclock-push.ts`                                                                                                          | Compatible iClock/ADMS HTTP endpoints under `/iclock/`*                                               |
| 4   | ATTLOG ingestion                                    | **Confirmed and available**                                          | ATTLOG parse + insert in `lib/zk-iclock-push.ts`; `lib/attendance-punch-ingest.ts`                                                                                       | Compatible ATTLOG lines become attendance punches                                                     |
| 5   | Device serial-number identification                 | **Confirmed and available**                                          | `SN` query param; `lib/adms-device.ts` `resolveAdmsDeviceBySerial`; unique serial per org in schema                                                                      | Devices are recognized by registered serial number                                                    |
| 6   | Device authentication                               | **Available with limitations**                                       | Serial-only identity; unknown SN returns OK without storing; no request signing found                                                                                    | Identification by registered serial; do not claim strong device authentication                        |
| 7   | Communication keys                                  | **Available with limitations**                                       | `commPasswordHash` generated on create in `app/api/devices/route.ts`; docs and ingest path state no comm-key check                                                       | Comm key may appear in pairing UX history/docs but is not enforced on ingest in v1                    |
| 8   | Device pairing workflow                             | **Confirmed and available**                                          | `add-device-drawer.tsx` pairing card; `lib/public-url.ts` server fields                                                                                                  | Self-serve register device + copy Cloud Server settings                                               |
| 9   | Device approval or registration                     | **Available with limitations**                                       | Devices created `enabled: true`; soft gates via enabled/deleted/trial; no pending-approval queue found                                                                   | Register and enable a device by serial; not a separate approval marketplace flow                      |
| 10  | Supported terminal models                           | **Cannot verify** (no certified matrix)                              | Schema comment examples; seed/demo K40; runbooks mention F22; no certified matrix file                                                                                   | Say “supported / selected ADMS-capable terminals”; do not publish an unverified model list            |
| 11  | F22 support                                         | **Planned or documented only** as physical proof; **runbook target** | `docs/DEVICE_INGEST_FIELD_TEST.md` F22 checklist; step-06 physical mission; field-test log is curl/K40 simulated                                                         | Documented ADMS setup target; do not claim physical F22 production certification from this repo       |
| 12  | Supported firmware versions                         | **Cannot verify**                                                    | `Device.firmwareVersion` display field; seed strings only; ingest does not populate firmware                                                                             | Compatibility depends on firmware; no published version matrix                                        |
| 13  | HTTPS support                                       | **Confirmed and available** (pairing + docs)                         | Pairing UI Protocol HTTPS / port 443; field-test runbook; `buildAdmsServerFields`                                                                                        | Terminals should use HTTPS on port 443 to the public app origin                                       |
| 14  | Port requirements                                   | **Confirmed and available** (documented + pairing defaults)          | Port 443 in drawer and runbooks                                                                                                                                          | Use port 443 for cloud ADMS                                                                           |
| 15  | Required terminal menu settings                     | **Confirmed and available** (docs + UI copy)                         | `DEVICE_INGEST_FIELD_TEST.md`; add-device checklist ATTLOG / real-time                                                                                                   | Cloud Server address, 443, HTTPS, ATTLOG on; OPERLOG-only off                                         |
| 16  | Push frequency or sync behavior                     | **Available with limitations**                                       | Handshake `Delay`, `TransInterval`, `Realtime` in `lib/zk-iclock-push.ts`; no SR+ poller of devices                                                                      | Terminal push cadence depends on device settings/firmware                                             |
| 17  | Near-real-time behavior                             | **Available with limitations**                                       | Same handshake; attendance UI refreshes without WebSocket                                                                                                                | Punches can arrive promptly when configured; not a live-stream guarantee                              |
| 18  | Offline buffering and replay                        | **Cannot verify**                                                    | Bulk ATTLOG handling exists; no SR+ offline agent; buffering is external firmware behavior                                                                               | Do not promise offline sync as an SR+ feature                                                         |
| 19  | Pull TCP support                                    | **Planned or documented only** / deferred                            | Enum + UI banner “not available in the cloud app yet”; decision doc                                                                                                      | Not available in cloud MVP                                                                            |
| 20  | LAN SDK support                                     | **Not found**                                                        | Decision doc forbids SDK integration for cloud pull                                                                                                                      | Do not claim                                                                                          |
| 21  | Windows agent requirements                          | **Not found** / deferred                                             | Decision doc defers on-prem agent                                                                                                                                        | Do not claim                                                                                          |
| 22  | BioTime or ZKBio integration                        | **Not found**                                                        | No code/docs implementing BioTime/ZKBio connectors                                                                                                                       | Do not claim                                                                                          |
| 23  | Direct terminal-to-cloud connection                 | **Confirmed and available**                                          | Device initiates HTTPS to `/iclock/`*; no site inbound hole required                                                                                                     | Terminals connect outbound to Simple Roster Plus over HTTPS                                           |
| 24  | Middleware requirements                             | **Not found** (for ADMS path)                                        | ADMS needs public HTTPS origin; no required Windows middleware in SR+ path                                                                                               | No Windows middleware required for ADMS push                                                          |
| 25  | Device-to-location assignment                       | **Confirmed and available**                                          | `Device.locationId`; create API requires location                                                                                                                        | Assign each terminal to a location                                                                    |
| 26  | Device-to-staff matching                            | **Confirmed and available**                                          | `Staff.deviceUserId`; `lib/attendance-staff-device-map.ts`                                                                                                               | Match terminal user IDs to employees at that location                                                 |
| 27  | Device user IDs                                     | **Confirmed and available**                                          | Schema unique `[locationId, deviceUserId]`; staff forms; ATTLOG col 0                                                                                                    | Enrolment / PIN-style IDs link punches to staff                                                       |
| 28  | Unmatched punches                                   | **Confirmed and available**                                          | `staffId: null` insert; `lib/unmapped-device-punches.ts`; Devices UI panel                                                                                               | Unmatched punches are retained for mapping                                                            |
| 29  | Backfilling unmatched punches after mapping         | **Confirmed and available**                                          | `map-users` API updates prior rows; field-test PASS                                                                                                                      | Mapping a user can attach earlier unmatched punches                                                   |
| 30  | Duplicate punch suppression                         | **Confirmed and available**                                          | `lib/attendance-punch-ingest.ts` 1-second dedupe window                                                                                                                  | Near-duplicate device punches are skipped                                                             |
| 31  | Clock-in and clock-out punch types                  | **Confirmed and available**                                          | ATTLOG state mapping to `in`/`out` in `lib/zk-iclock-push.ts`                                                                                                            | Receive in and out punches from compatible ATTLOG                                                     |
| 32  | Verification methods (fingerprint, face, card, PIN) | **Available with limitations**                                       | `PunchVerifyMethod` enum and UI badges exist; ADMS parse uses columns 0–2 only; verify not set on ADMS path                                                              | Do not claim SR+ records verify method from live ADMS ATTLOG                                          |
| 33  | Biometric templates stored                          | **Not found**                                                        | No template models; BIODATA not stored; `lastFingerprintCount` is display/cache field                                                                                    | SR+ does not store fingerprint or face templates                                                      |
| 34  | Device status or heartbeat visibility               | **Confirmed and available**                                          | `lastSeenAt` touch on ADMS contact; status cells; ops device status helpers                                                                                              | See recent device contact / online-idle style status                                                  |
| 35  | Last-seen information                               | **Confirmed and available**                                          | `Device.lastSeenAt`; Devices table; field-test PASS                                                                                                                      | Managers can see when a device last contacted the server                                              |
| 36  | Device commands                                     | **Not found**                                                        | `getrequest` returns `OK` only; no command queue model                                                                                                                   | Do not claim remote device command control                                                            |
| 37  | Device logs                                         | **Available with limitations**                                       | Console/`recordAdmsRequest` in-memory health; OPERLOG content discarded                                                                                                  | Health/punch signals exist; not a full device log archive                                             |
| 38  | Multi-device support                                | **Confirmed and available** (within plan limits)                     | Multiple `Device` rows; serial uniqueness; plan slot checks                                                                                                              | Connect multiple terminals up to plan device slots                                                    |
| 39  | Multi-location support                              | **Available with limitations**                                       | Devices scoped to locations; free locations capped; some UX still default-location oriented                                                                              | Assign devices per location within plan limits; avoid “unified unlimited multi-site fleet” claims     |
| 40  | Device limits by pricing tier                       | **Confirmed and available**                                          | `docs/PRICING.md`; `lib/plans.ts`; `checkDeviceSlotLimit`                                                                                                                | Free 1 / Plus 1 / Pro 3 included; add-ons available                                                   |
| 41  | Device trial behavior                               | **Available with limitations**                                       | 30-day start + ingest pause implemented in `lib/device-trial.ts`; extension function unused                                                                              | 30-day live sync trial on Free; do not advertise unused extension                                     |
| 42  | Installation or onboarding support                  | **Cannot verify** as a productized service                           | Marketing contact copy mentions help; MAPPING “we configure” is draft; no install SKU                                                                                    | May offer help via contact; do not claim installation included                                        |
| 43  | Self-service setup                                  | **Confirmed and available**                                          | Add device + pairing checklist + Public URL settings                                                                                                                     | Managers can register a device and follow the pairing checklist                                       |
| 44  | Production deployment evidence                      | **Cannot verify** from repo alone                                    | Hostnames and `/iclock` public routing exist; no logged production physical punch proof                                                                                  | Do not claim production hardware validation without external evidence                                 |
| 45  | Field-test evidence                                 | **Available with limitations**                                       | Curl PASS on simulated K40 path in `docs/mvp-launch/field-test-log.md`; physical F22 still recommended                                                                   | Protocol path verified via simulated ATTLOG; physical confirmation still advised                      |
| 46  | Known limitations                                   | **Confirmed and available** (documented)                             | Decision docs, field-test gotchas, SEO attendance brief, ingest comments                                                                                                 | Page should disclose ADMS-only, ATTLOG-only, serial-only auth, model/firmware dependence              |
| 47  | Security considerations                             | **Available with limitations**                                       | Unauthenticated `/iclock` with SN identity; always-OK responses; Encrypt=0; hashed unused comm key                                                                       | Be honest: serial registration + enable/disable controls; avoid “secure by default”                   |
| 48  | Data transmitted from terminals                     | **Confirmed and available** (ATTLOG subset)                          | Parsed user id, timestamp, state; punch rows with `source=device_adms`                                                                                                   | Terminals send attendance punch events, not templates                                                 |
| 49  | Retention of raw device payloads                    | **Available with limitations**                                       | `deviceRawTimestamp` and clock audit fields stored; full request body not retained                                                                                       | Original ATTLOG timestamp string may be kept; full raw payloads are not archived as a product feature |
| 50  | Compliance or privacy implications documented       | **Planned or documented only** / incomplete                          | Privacy stub mentions device sync; biometric templates not stored; legal review still open in launch docs                                                                | State that punch data is stored for attendance; do not claim compliance certification                 |


---

## Capability layers (summary)

### Confirmed application functionality

ADMS/iClock routes, ATTLOG ingest, serial matching, location-scoped staff matching, unmatched punch retention + backfill, duplicate suppression, device pairing UI, last-seen status, plan device slots, Free 30-day trial pause, roster-connected attendance views.

### Confirmed field-tested functionality

Curl-simulated ATTLOG path on a non-seed org (K40-labeled serial), including mapped punches, unmatched storage, mapping backfill, and adms-health counters.

### Documentation-only / runbook functionality

F22 physical checklist, partner session procedure, older-firmware full URL variants, hyphen-free hostname guidance.

### Deferred functionality

Pull TCP, LAN SDK, Windows agent, BioTime/ZKBio, enforced comm-key auth, device command queue, staff push to terminal, certified model matrix.

### Production behavior not verifiable from the repository

Physical terminal success in production, exact partner firmware strings, installation services delivery, live multi-site fleets.

---

## Draft positioning block (for implementation later)

**SEO title:** ZKTeco Attendance Integration | Simple Roster Plus

**H1:** Connect Supported ZKTeco Attendance Terminals to Your Staff Roster

**Hero support (draft):** Receive compatible attendance punches from supported ZKTeco terminals using ADMS push, then compare employee clock-ins with scheduled shifts in Simple Roster Plus.

**Secondary line (draft):** Register the terminal, match device user IDs to staff, and review punches beside the weekly roster—without claiming every ZKTeco model or storing biometric templates.

---

*End of brief. No marketing page, navigation, schema, or sitemap changes were made in this task.*
