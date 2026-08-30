# What Is ZKTeco ADMS? — SEO Content Brief

**Status:** FROZEN / APPROVED — 30 August 2026  
**Date:** 30 August 2026  
**Revised:** 30 August 2026 (ChatGPT GO WITH CHANGES applied)  
**Frozen:** 30 August 2026 (owner + ChatGPT review complete)  
**Prepared by:** Cursor  
**Article status:** Frozen brief. Do **not** write or implement except as a separate drafting/implementation task strictly from this document.

This document is the source of truth for the planned resource `/resources/what-is-zkteco-adms`. Do not make further strategic, SERP, technical compatibility, F22, URL, audience, or outline changes unless new evidence creates a material contradiction. The skipped optional GSC query check is acknowledged and is not a blocker. Do not create a parallel v2 document.

---

## Inspection record

### Evidence sources inspected

| Source | What it is | Use in this brief |
|---|---|---|
| [Non-Disruptive F22 Compatibility Evidence](7e0ea553-2c05-44ae-a9c9-6c6ebb0dff85) (21 Aug 2026 agent transcript; **not** a committed repo file) | Read-only Shift Close ↔ SRP ADMS equivalence audit | Internal claim substantiation only. Not for public copy. |
| `docs/SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md` | Shift Close → SRP ADMS port handoff | Internal protocol lineage; ATTLOG sample shape |
| `docs/DEVICE_INGEST_SMOKE.md`, `docs/DEVICE_INGEST_FIELD_TEST.md`, `docs/device-ingest/*` | SRP ADMS implementation runbooks | Setup concepts remain **commercial-page** material; F22 is a **documented target**, not SRP-live proof |
| `docs/mvp-launch/field-test-log.md` | Curl-simulated K40 ATTLOG pass | SRP ingest proof (simulated, not physical F22) |
| `lib/zk-iclock-push.ts`, `app/iclock/cdata/route.ts`, `app/iclock/getrequest/route.ts`, `lib/adms-device.ts`, `lib/attendance-punch-ingest.ts`, `lib/attendance-staff-device-map.ts` | Live SRP ingest code | What SRP actually does after ATTLOG arrives |
| [SRP positioning reassessment](db42b757-a656-4c6a-b4ca-766b7680fa06) (27 Aug 2026) | Roster identity + ZKTeco as **acquisition wedge hypothesis** | GTM context; not proven repositioning |
| This brief, first draft (30 Aug 2026 chat) + ChatGPT review (same day) | Intent, outline, and claim fences | Incorporated below |

### SERP / search sources inspected (30 Aug 2026)

Queries: `zkteco adms`, `what is zkteco adms`, `zkteco adms protocol`, `zkteco attlog`, `zkteco cloud server adms`, plus related `zkteco cloud server setting`, `ADMS vs BioTime`, `zkteco attendance software ADMS`.

Material ranking / recurring sources:

- LinkedIn: “ZKTeco ADMS Protocol (link your ZK device and your server)” (Herbin Tsobeng)
- GitHub / pkg.go.dev: `s0x90/zkteco-adms`, `athwari/laravel-zkteco-adms-server`, `msaied/zkteco-php`, `rejaulalomkhan/adms-server-ZKTeco`, `palmcode-ae/zkteco-iclock-parser`
- Vendor educational-commercial: Rotabook, Peoplifi, PunchINN, Odoo `ntt_biometric_attendance`
- BioTime-adjacent setup: StandTech, Visiotech ZKBioTime device-add articles
- Older ZKTeco slide / PDF: Scribd and slideum materials describing ADMS as a B/S data-collection server
- Push SDK PDF listings (Scribd)

**Search-volume caveat:** No Keyword Planner, Ahrefs, or GSC volume was available when this brief was drafted. SERP *composition* is evidence of intent. Do **not** claim a quantified search-volume opportunity.

### Optional first-party query check (GSC)

**Not performed.** Google Search Console data was not readily available in this environment (no GSC connector, export, or query dump in the repo).

Before article writing, if GSC is at hand, inspect `/zkteco-attendance-integration` for impressions containing `adms`, `attlog`, `cloud server`, `iclock`, or `biotime`. Record findings in the writing handoff.

This is **not a publishing blocker**. Do not start another research phase. Do not infer volume from a handful of early impressions, including their absence.

### Repository files inspected (Phase 1)

- **Dedicated “What is ZKTeco ADMS?” brief / outline / draft prior to this file:** **None.** This document is the first and only brief.
- Commercial brief: `docs/seo-zkteco-attendance-integration-page-brief.md`
- Commercial implementation: `docs/seo-zkteco-attendance-integration-implementation.md`
- Live commercial page: `landing-page/zkteco-attendance-integration/index.html`  
  Canonical: `https://www.simplerosterplus.com/zkteco-attendance-integration`
- Site architecture: `docs/seo-phase-3-site-structure-audit.md`, `docs/seo-validation-audit.md`, `landing-page/LANDING-PAGE.md`, `landing-page/sitemap.xml`
- Related briefs: `docs/seo-employee-attendance-page-brief.md`, `docs/seo-employee-time-clock-app-page-brief.md`
- **SEO Growth Map as a named file:** **Does not exist.** Closest artifacts: Draft SEO page map in `docs/seo-validation-audit.md` (planned `/resources` hub later; ZKTeco commercial gap now shipped); Phase 3 ownership map (ZKTeco page owns ADMS push / pairing / limits).

### Phase 1 stop-rule

A dedicated ADMS content brief did not exist before this file. Do not create a second copy.

---

## 1. Resource definition

| Field | Decision |
|---|---|
| **Working title** | What Is ZKTeco ADMS? How ZKTeco Attendance Devices Send Data to Cloud Software |
| **Proposed URL (provisional)** | `/resources/what-is-zkteco-adms` |
| **Canonical form** | `https://www.simplerosterplus.com/resources/what-is-zkteco-adms` |
| **Content type** | Informational resource / explainer (not a commercial landing page) |
| **Search intent** | Informational definition + conceptual how-it-works. Secondary: light software-selection *after* the reader understands ADMS. |
| **Primary commercial page supported** | `/zkteco-attendance-integration` |
| **Status** | FROZEN / APPROVED — 30 August 2026. Write and implement only as separate later tasks. |

### URL decision

Keep **`/resources/what-is-zkteco-adms`**.

**Why `/resources/`:** site architecture and future informational organization. The marketing site today is a flat set of commercial URLs. `docs/seo-validation-audit.md` already reserved `/resources` for long-tail informational content. Nesting this explainer there keeps commercial URLs and future educational URLs from sharing one undifferentiated path namespace.

**What `/resources/` does *not* do:** it does **not** signal informational intent to Google, and it does **not** prevent cannibalization by itself. Path nesting is not an SEO intent strategy.

**Intent separation must come from:**

- Query ownership (`what is zkteco adms` vs ZKTeco-attendance-software / connect-to-SRP)
- Title and H1
- Content (definition and chain, not setup)
- Internal links (this page points to the commercial page for connect/setup)
- Conversion purpose (qualified click to the integration page, not a parallel signup landing page)

**Rejected alternatives:**

- `/what-is-zkteco-adms` — collides with the flat commercial URL set
- `/zkteco-adms` — collides with commercial ZKTeco ownership
- `/zkteco-attendance-integration/adms` — nested under the conversion page; harder to keep jobs distinct
- Expanding the commercial FAQ instead — would bloat a conversion page

Do **not** implement the URL until this brief is frozen and writing is authorized.

### Eventual implementation note (not this task)

When this resource is implemented, the **same implementation batch** should:

1. Publish `/resources/what-is-zkteco-adms`
2. Add **one contextual reciprocal link** from `/zkteco-attendance-integration` to the explainer (for example from “How ADMS Push Works” or a short FAQ line). This is a single contextual link, **not** a commercial-page rewrite.
3. Add the resource URL to `landing-page/sitemap.xml`

No `/resources` hub page is required yet. Do not build a resources program, extra ADMS articles, or navigation overhaul in that batch.

---

## 2. Search opportunity

### Primary topic

ZKTeco ADMS — what it is, and how supported ZKTeco attendance terminals send punch data to remote software.

### Primary query / intent

**Primary query:** `what is zkteco adms` / `zkteco adms`  
**Intent to own:** “I see ADMS / Cloud Server on a ZKTeco terminal (or a vendor mentioned it). What *is* it, and what actually happens when someone punches?”

This is **not** “which attendance software should I buy?” as the first job. Software selection is a possible next step (vendor blogs already convert that way). It is not the query itself.

### Secondary questions / related queries (SERP-supported)

- What does ADMS mean? (see §5 / §8 for the tightened expansion)
- Cloud Server Setting / COMM → Cloud Server / ADMS menu
- Does the device push over the internet? (NAT / no static IP / outbound HTTPS)
- ADMS vs SDK / pull
- ATTLOG (conceptually; not as a developer keyword to win)
- BioTime / ZKBioTime as the software people assume ADMS *is*
- Server address, port, HTTPS, device serial
- Device user ID must match the employee record
- Push SDK as overlapping vendor terminology (mention once; do not equate as a proven identity)

Do **not** target as primary: `zkteco attlog`, `zkteco adms protocol`, model-specific setup, or `BioTime alternative`.

### SERP snapshot (30 Aug 2026)

**A. Dominant intent — mixed**

Google currently rewards a blend of developer protocol docs, vendor blogs that define ADMS then convert, BioTime Cloud Server setup guides, and older ZKTeco slides that describe ADMS as a B/S data-collection product.

**B. Searcher sophistication**

Ranking *documents* are often written for developers. Device-menu language is written for installers and operators. **Write for the operator / IT reader.** Do not optimize for GitHub because GitHub ranks.

**C. Recurring concepts (include because SERP uses them)**

Cloud Server Setting · ADMS · ATTLOG · `/iclock/` (mention, do not document) · server IP/domain · port · HTTPS · device serial (SN) · user/PIN IDs · BioTime/ZKBio · push vs pull/SDK · Push SDK (adjacent) · NAT / no static IP

**D. Content gap**

Ranking pages usually stop at HTTP, jump to “paste our URL,” jump to payroll/HRIS, or explain BioTime. They rarely explain: punch → terminal → ADMS communication → ATTLOG → receiving software identifies the device → maps the device user → stores a usable attendance record.

**E. Commercial crossover — supported, not manufactured**

Vendor blogs use ADMS education as acquisition. The leak is toward attendance/HR/payroll products, not automatically toward roster software. SRP may enter as one kind of receiving software after the chain is clear.

### Setup intent (acknowledged, not pursued)

Cloud Server configuration / “device not connecting” is a **stronger related SERP intent**. This resource **deliberately does not steal it**. Setup belongs to `/zkteco-attendance-integration`.

### Intent boundary — what this page is **not**

| Must not become | Why |
|---|---|
| Another attendance-software landing page | `/employee-attendance-software` owns that |
| Another ZKTeco integration / setup landing page | `/zkteco-attendance-integration` owns that |
| BioTime alternative page | Out of scope |
| F22 product page | Thin intent; overclaim risk |
| Generic ZKTeco setup manual | Stronger SERP intent; **not stolen** from the commercial page |
| Developer API documentation | Wrong audience |
| Universal compatibility list | No certified matrix |
| Push SDK specification | Adjacent term; not SRP’s evidence base |
| Payroll / HRIS explainer | Not the product |

---

## 3. Target audience

### Primary

**Operators, IT administrators, and installer-level readers** who have (or are installing) a ZKTeco attendance terminal, see **ADMS / Cloud Server Setting**, and need to understand what the device sends and what receiving software still has to do.

Technical level: **below GitHub protocol documentation, above a generic product brochure.**

### Secondary

Owners / managers of small shift-based teams who already own ZKTeco hardware and need the transport vs software distinction. Diagrams are for them.

### Do not optimize for

- Developers building a custom ADMS listener
- ZKTeco resellers / integrator partners (channel experiment not assumed successful)
- BioTime administrators looking for ZKBioTime port/setup
- People shopping for an F22 or a specific terminal

If a sentence needs a code sample or handshake flag to be true, cut it.

---

## 4. User problem / job to be done

**Job:** Understand what “ADMS” on a ZKTeco terminal actually is, so the reader can distinguish **device communication** from **what receiving software does with the punch**, and can judge what still has to happen after the punch leaves the device.

People encounter ADMS as a menu label, a vendor buzzword, and (in older ZKTeco materials) a server-system name. They reasonably confuse it with BioTime, with “attendance software,” or with a guaranteed real-time dashboard.

Useful clarification:

> On a modern ZKTeco terminal, the ADMS / Cloud Server setting controls how the terminal communicates with a receiving server. That communication alone is not the full attendance application. A punch is not an attendance record in software until a receiving system identifies the device, interprets the punch, and maps the terminal user to a person.

Setup steps for Simple Roster Plus are **not** the job.

---

## 5. Core content thesis

**Thesis:**

On a modern ZKTeco attendance terminal, **ADMS / Cloud Server Setting** is how the device is told to communicate with a receiving server. The terminal initiates contact and typically pushes attendance data (often as ATTLOG) over HTTP(S).

ADMS is commonly expanded as **“Automatic Data Master Server”** in ZKTeco-related documentation and ecosystem material. Other expansions occasionally appear in third-party documentation. Official or current manuals often simply say **“ADMS server”** or **Cloud Server Setting**. Do not spend article space on acronym archaeology.

That communication is **not** the full attendance / workforce application. Older ZKTeco material also used ADMS to describe a B/S data-collection server sitting between terminals and attendance software. The operator-facing job of this article is the modern terminal setting: **how the device talks to a server**, versus **what receiving software must still do**.

After ATTLOG arrives, receiving software still has to:

1. Identify the device (usually by serial)
2. Interpret timestamp and punch state
3. Map the terminal user ID to an employee
4. Handle unmatched or duplicate punches
5. Turn that into something a manager can use

Simple Roster Plus is introduced **only after** that chain is clear, as roster-linked software that can receive compatible ADMS ATTLOG and then compare attendance with scheduled work — an SRP outcome, not an ADMS step.

**Do not claim:**

- ADMS has only ever meant a protocol and never a server product (too absolute given older B/S materials)
- Two-way user/template sync is what every ADMS deployment does (SRP does not push templates)
- Punches are guaranteed real-time
- Scheduled-vs-actual is part of how ADMS works

---

## 6. Evidence available

Keep these buckets separate. Public copy may use **safe claims** derived from this evidence. Public copy may **not** cite the internal telemetry listed in §7.

### A. Production / reference evidence (internal only)

From the Non-Disruptive F22 Compatibility Evidence audit (21 Aug 2026):

- A production F22-class terminal is actively sending ADMS ATTLOG into **Shift Close**, not SRP
- Observed traffic class: `POST /iclock/cdata` with ATTLOG, and `GET /iclock/getrequest`
- ATTLOG body observed as tab-separated terminal user ID, `YYYY-MM-DD HH:MM:SS`, and state
- Compatibility confidence vs SRP parser: **STRONG**
- Model identification: strongly supported, not machine-proven

Use this only to justify educational claims about ATTLOG shape and `/iclock/`-class cloud push. Do not put the audit’s identifiers in the article.

### B. SRP implementation evidence

- `/iclock/cdata` and `/iclock/getrequest` implemented; ATTLOG tab-line parse; SN identity; `device_adms` punches
- Direct port of the Shift Close ADMS path
- Device must be registered and enabled or punches are not stored (even if the HTTP reply is `OK`)
- Staff match via `deviceUserId` at device location; unmatched retained; short-window dedupe; in/out from state codes or alternation
- Curl-simulated ATTLOG field test PASS
- Cloud product is **ADMS push only**
- OPERLOG / BIODATA not stored as punches; no biometric-template vault; no BioTime/ZKBio integration
- Handshake may request realtime-style options; manager UI is not a live stream
- `getrequest` acknowledges; v1 does not dispatch a management command queue

### C. Inference (usable only with qualification)

- Other ADMS-capable models *can* speak a similar push pattern (market/SERP consensus; **not** an SRP certified matrix)
- Extra ATTLOG columns can exist; SRP’s production-derived parser uses the leading fields (user ID, time, state)
- Offline buffering is terminal firmware behavior, not an SRP feature
- Push SDK ≈ ADMS in some vendor talk; treat as overlapping family, not proven identity
- Some third-party articles show key=value log lines. Observed reference traffic was tab-separated. Do not publish competing wire-format examples.

### D. Explicitly not evidence

- This physical F22 connected to Simple Roster Plus
- SRP live-tested this unit
- Search volume / difficulty numbers
- Reseller-channel demand
- Universal F22 firmware support

---

## 7. Claim boundaries

### Public-copy ban: Shift Close / reference-device telemetry

The Shift Close / F22-class evidence exists **only as internal claim substantiation**.

The **public article body must contain none of:**

- the name Shift Close
- a production device serial
- a historical ADMS record count
- a firmware identifier from the reference device
- internal telemetry (ingest lag histograms, endpoint query strings with live SN, etc.)
- wording that suggests a production Simple Roster Plus F22 case study

Do not write “our live F22,” “tested in production on F22,” or “thousands of punches from a real terminal on Simple Roster Plus.”

Writers may internally know that protocol confidence is STRONG because of that audit. Readers must not be able to reconstruct the reference deployment from the article.

### Safe claims

- Many ZKTeco attendance terminals can send attendance data to a receiving server using a device-initiated cloud / ADMS-style push, configured under Cloud Server / ADMS.
- ADMS is commonly expanded as Automatic Data Master Server in ZKTeco-related documentation and ecosystem material; other expansions appear in third-party docs; manuals often just say ADMS server or Cloud Server Setting.
- The device typically identifies itself with a serial number.
- Attendance punches often travel as ATTLOG: a terminal user ID, a timestamp, and a punch state.
- On a modern terminal, that ADMS / Cloud Server communication is how the device talks to a server. It is not, by itself, the full attendance application.
- Receiving software still has to identify the device, interpret the punch, and map the device user to an employee.
- Compatible custom software can receive this class of traffic; it does not have to be BioTime.
- Simple Roster Plus can receive compatible ATTLOG over ADMS push on HTTPS `/iclock/*` for **supported / selected** terminals, then match users and review attendance against the roster.

### Qualified claims (careful wording required)

| Claim | Required wording |
|---|---|
| F22 | “Terminals such as the F22 family commonly expose Cloud Server / ADMS settings.” Not “F22 certified on SRP.” |
| Real-time | Device-dependent push; not a guaranteed live dashboard |
| Internet | Push is designed so the device dials out; the site still needs outbound reachability |
| ATTLOG example | One illustrative common tab-separated record; fields/columns can vary by device/firmware |
| Two-way ADMS | Protocol *can* include command/user sync; many products only ingest punches; SRP does not manage templates remotely |
| HTTPS | Common for cloud products; older firmware may differ |
| “Works with ZKTeco” | “Supported ADMS-capable terminals that send compatible ATTLOG” |
| Older “ADMS server” product | Acknowledge briefly that older ZKTeco material described a B/S data-collection server; do not turn the article into history |

### Prohibited / unsupported claims

- The production F22 is connected to Simple Roster Plus
- SRP live-tested this physical F22
- F22 certification / every F22 firmware
- Universal ZKTeco compatibility / every model
- Full BioTime or ZKBio replacement
- Biometric-template management or storage
- Access-control management as an SRP feature
- Pull TCP, LAN SDK, or Windows agent as a live cloud feature
- Plug-and-play / no configuration
- Official ZKTeco partnership, endorsement, or Push SDK certification
- Automatic employee matching with no mapping
- Guaranteed 1–3 second punch arrival
- That ADMS *is* BioTime
- That SRP is the production host of the reference terminal
- Reseller/integrator program success
- AI language (not relevant here)

---

## 8. Recommended article structure

Reduced outline. **Do not restore** dedicated H2 sections for:

- `/iclock/cdata` / `/iclock/getrequest`
- device compatibility matrix
- full troubleshooting
- SRP pairing / setup
- F22 deep dive
- pricing / device slots

Those belong to developer documentation or `/zkteco-attendance-integration`.

### H1

What Is ZKTeco ADMS? How ZKTeco Attendance Devices Send Data to Cloud Software

### Opening (no H2)

2–4 sentences: on a modern ZKTeco terminal, ADMS / Cloud Server Setting is how the device communicates with a receiving server. That communication is not the full attendance application. Preview the chain.

### H2 — What does ADMS mean on a ZKTeco device?

- Prefer: commonly expanded as Automatic Data Master Server in ZKTeco-related documentation and ecosystem material. Other expansions occasionally appear in third-party documentation. Current manuals often just say ADMS server or Cloud Server Setting.
- Operator meaning: the Cloud Server / ADMS menu tells the terminal where to send data.
- One short acknowledgement that older ZKTeco material also described a B/S data-collection server — then return to the terminal setting.
- One sentence: you may also hear Push SDK; this article describes the device-push workflow operators configure.
- Do not write an acronym-history section.

### H2 — How does ZKTeco ADMS work?

Primary diagram (generic; **do not** include scheduled-vs-actual):

**Employee punch → ZKTeco terminal → ADMS / Cloud Server → ATTLOG → receiving software → employee attendance**

Cover:

- Device initiates outbound contact (why NAT / static-IP talk appears in SERPs)
- Serial identifies the device
- Server acknowledges; punches are not “done” until software processes them
- Timing depends on settings/firmware

Mention `/iclock/cdata` and `/iclock/getrequest` **in passing** as common cloud paths — one short paragraph, no request tables, no command-queue tutorial.

### H2 — What is ATTLOG?

- ATTLOG is the attendance-log payload the terminal uploads.
- Conceptual fields: who (terminal user ID), when, in/out-ish state.
- **One** illustrative example of a common tab-separated ATTLOG record:

  `17    2026-08-21 16:01:24    1`

- Label it exactly as illustrative of a **common tab-separated ATTLOG record**. Then state that fields and additional columns can vary by device and firmware.
- Do **not** show multiple competing wire-format examples unless later evidence proves that doing so materially improves the explanation.
- This article is not protocol documentation.
- USB `ATTLOG.TXT` may appear in other workflows; this article is about live cloud push.

### H2 — What happens after the punch reaches the server?

Vendor-neutral gap section:

1. Identify device  
2. Identify device user  
3. Resolve employee  
4. Interpret timestamp / timezone  
5. Interpret punch state  
6. Deduplicate  
7. Store attendance  

(Scheduled-vs-actual is **not** in this list.)

Skipping mapping produces orphan punches, not a usable attendance record.

### H2 — Why device-user mapping matters

- Terminal PIN/user ID is not magically the employee in software
- Unmatched punches should be retained, not discarded
- This is a receiving-software problem, not a transport problem
- Do **not** paste SRP UI or “Add Device” steps. One link: how Simple Roster Plus handles mapping lives on the integration page.

### H2 — ADMS / Cloud Server vs receiving software

Preferred framing (not the overly absolute “ADMS is never software”):

> On a modern ZKTeco terminal, the ADMS / Cloud Server setting controls how the terminal communicates with a receiving server. That communication alone is not the full attendance application.

Distinguish:

- **Device communication** — where the terminal sends punches
- **Receiving attendance / workforce software** — identifying the device, mapping people, storing and using attendance

BioTime/ZKBio is one receiving product that can use this communication style. Custom software can receive punches without being BioTime. ADMS / Cloud Server communication does not by itself produce late/absent, payroll, or a roster.

### H2 — How Simple Roster Plus uses ZKTeco ADMS

**Only now.** Short.

ZKTeco terminal → ADMS / ATTLOG → Simple Roster Plus → employee mapping → attendance

Then, **product-specific only:** attendance + roster → scheduled vs actual.

Optional: a **separate small** SRP diagram for that last step. Do not retrofit it onto the generic ADMS diagram.

- Honest limits: selected terminals, ADMS push, no BioTime, no template vault
- Link to `/zkteco-attendance-integration` for setup, compatibility, and pairing
- **No** pricing, device-slot table, or Start Free hero clone

### H2 — FAQ

1. Does ZKTeco ADMS require BioTime?  
   No. BioTime is receiving software. ADMS / Cloud Server is how a terminal can talk to a server — including other products.
2. What is ATTLOG?  
   Short restatement.
3. Does ADMS work over the internet?  
   In the usual push design, yes, if the device can reach the configured server.
4. Can ZKTeco send attendance data to custom software?  
   Yes, if that software accepts the device’s ADMS/ATTLOG traffic and the terminal is pointed at it. Compatibility still depends on model/firmware/settings.
5. What is the difference between ADMS and BioTime?  
   Device communication vs a receiving product.
6. How does a device user become an employee attendance record?  
   Mapping. Link the commercial page for SRP’s unmatched-punch recovery.
7. Is ADMS the same as Pull SDK / LAN connection?  
   Short push vs pull contrast; SRP details on the integration page.

Optional eighth: “Will every ZKTeco model work?” → No certified list. Link the commercial page.

---

## 9. Internal linking strategy

### Mandatory commercial destination

**`/zkteco-attendance-integration`**

| Placement | Why they click | Anchor concepts |
|---|---|---|
| After device communication vs receiving software | “I need software that receives this” | ZKTeco attendance integration; connect a supported terminal |
| End of SRP section | Education → pairing | Setup, compatibility limits, match terminal users |
| FAQ answers that would otherwise become how-to | Stops this URL absorbing setup | What to configure on the terminal; unmatched punches |

Do **not** put Start Free as the first link. The first commercial link should be the integration page.

### `/employee-attendance-software`

**One contextual link** in the SRP section, when saying punches become reviewable attendance. Not the primary ZKTeco destination.

### `/employee-scheduling-software`

**Optional, weak.** One link max, only if the SRP paragraph mentions building the week. Skip if bolted on.

### `/employee-time-clock-app`

**Usually skip.** Spreads device intent across a third URL.

### Reciprocal link (same implementation batch as the resource)

When the explainer is published, add **one** contextual link from `/zkteco-attendance-integration` → `/resources/what-is-zkteco-adms`. That is part of the resource implementation batch, not a commercial rewrite, and not a current-task code change.

---

## 10. Conversion goal

1. “What is ADMS?”
2. “The terminal sends punches; receiving software still has to map and use them.”
3. “I need software that receives ZKTeco ADMS and makes the punches useful.”
4. `/zkteco-attendance-integration`
5. Start Free / Explore demo **from that page**

**Primary conversion for this URL:** qualified click to the commercial ZKTeco page.  
**Not:** a second signup landing page, BioTime-switch narrative, or hardware sales.

If a closing button exists, follow the current commercial-page CTA pattern, visually secondary to the integration-page link.

---

## 11. Differentiation

**Genuinely differentiated:** explaining both sides of the chain — device push as operators encounter it, and what receiving software must do next (identity, mapping, unmatched punches) — without turning into GitHub or a payroll pitch.

**Not a differentiator, and not part of the generic chain:** scheduled-vs-actual. That is an SRP outcome in the late product section only.

**Not a differentiator:** Cloud Server setup steps, `/iclock` route tables, or an unsupported model matrix.

Do not authorize an ADMS article factory from this brief. ZKTeco remains an **acquisition experiment**, not proven positioning.

---

## 12. Metadata direction (not frozen)

| Element | Proposal |
|---|---|
| **SEO title** | What Is ZKTeco ADMS? How Attendance Devices Send Data |
| **Alt title** | What Is ZKTeco ADMS? Cloud Attendance Explained |
| **Meta description** | ZKTeco ADMS is how many attendance terminals send punch data to a receiving server. See how ATTLOG and employee mapping turn a punch into a usable attendance record. |
| **H1** | What Is ZKTeco ADMS? How ZKTeco Attendance Devices Send Data to Cloud Software |

Do not use “ZKTeco attendance software” as this page’s title.

---

## 13. Visual opportunities

1. **Primary educational diagram (required)**  
   Employee punch → ZKTeco terminal → ADMS / Cloud Server → ATTLOG → receiving software → employee attendance  

   Stop there. **Do not** show scheduled-vs-actual on this diagram.

2. **Mapping diagram (recommended)**  
   Terminal User ID → employee mapping → attendance record, with an unmatched-punch branch.

3. **Optional small SRP-only diagram**  
   Attendance + roster → scheduled vs actual. Only in the Simple Roster Plus section. Never merged into diagram 1.

No device product-shot hero. No fake F22 certification graphic. No HTTP sequence diagram. No compatibility matrix graphic.

---

## 14. Cannibalization check / final ownership split

| | New resource `/resources/what-is-zkteco-adms` | Commercial `/zkteco-attendance-integration` |
|---|---|---|
| **Owns** | What is ZKTeco ADMS; conceptual device → server workflow; ATTLOG explained; ADMS/Cloud Server vs receiving software; generic mapping problem | Connect ZKTeco to SRP; configuration/setup; compatibility limits; SRP pairing; unmatched recovery **inside SRP**; device slots/pricing; signup/demo conversion |
| **Title/H1** | Question + explanation | Connect supported terminals to the staff roster |
| **Unavoidable overlap** | Shared vocabulary: ADMS, ATTLOG, Cloud Server, mapping | Same words, different job |
| **How we avoid competing** | No SRP setup checklist, no device-slot pricing, no model list, no “register your serial” CTA cluster, SRP only after education | Keeps connect/setup/conversion; later one reciprocal “what is ADMS” link |

A separate URL is justified **only** if this reduced outline is followed. If a draft restores setup, troubleshooting, device lists, or an SRP how-to, **do not publish**.

Setup / Cloud Server configuration appears to be a stronger related SERP intent. We are **deliberately not stealing it**.

---

## 15. Success criteria (for later article approval)

1. A reader who only knows “ADMS” as a menu label can explain it in one sentence.
2. Device communication vs receiving software is clear; older B/S “ADMS server” is not over-explained.
3. The punch → software chain is complete, including mapping, and does **not** present scheduled-vs-actual as an ADMS step.
4. ATTLOG uses one illustrative tab-separated example, labeled as such, with a variance caveat.
5. BioTime is receiving software, not a required ADMS companion.
6. SRP appears late, honestly, without F22/hardware overclaim.
7. Public copy contains zero Shift Close / reference-device telemetry (§7).
8. Not a disguised landing page (no pricing table, no setup runbook, no hero clone).
9. `/zkteco-attendance-integration` is the obvious next click.
10. `/iclock` is not a developer tutorial.
11. Operator-level tone: below GitHub, above a brochure.
12. Someone skimming both URLs can tell definition vs connect-my-device.

---

# Adversarial review (post-revision, abbreviated)

Not a restart of SERP or compatibility research.

### 1. Standalone URL

Still justified as cluster support for the commercial page, **if** the reduced outline holds. Still unjustified as a second integration page. ChatGPT and Cursor now agree on that fence.

### 2. Cannibalization

Residual risk remains **moderate** because of shared vocabulary. Path nesting under `/resources` does **not** reduce that risk. Title, H1, content, links, and conversion purpose do. Reciprocal link in the same implementation batch helps the commercial page *defer definition* instead of duplicating it.

### 3. ZKTeco opportunity bias

Unchanged. This is one support article, not proof the wedge works, and not a content factory.

### 4. Claims vs evidence

The public-copy telemetry ban is now explicit. The remaining overclaim risks are “real-time,” universal compatibility, and implying F22-on-SRP. Those stay prohibited.

### 5. Reader sophistication

The reduced outline matches operator / IT. Restoring `/iclock` or dual wire-formats would fail this test.

### 6. Scheduled-vs-actual

Removed from the generic diagram. Remaining risk is a writer putting it back into the H1 or thesis. Success criterion 3 exists to catch that.

### 7. Stronger setup intent

Acknowledged. Deliberately not chased. If organic data later shows this URL ranking for setup queries, tighten the commercial-page link and do not expand this article into a setup guide.

### 8. Outline cuts

Confirmed. Do not restore the cut H2s.

### 9. Strongest reason not to proceed

Still: a page built because the protocol is interesting, with no volume proof, that can cannibalize the only converting ZKTeco URL. The reduced outline is the mitigation, not a guarantee.

### 10. Final recommendation

**GO — brief frozen / approved 30 August 2026.**

ChatGPT’s required changes are incorporated. Cursor does not hold a remaining material disagreement (see the review note in the chat summary).

---

## Cursor recommendation

Brief is frozen / approved.

Write the article only to this reduced outline, as a later separate task. Implement later as `/resources/what-is-zkteco-adms` plus one reciprocal commercial-page link and a sitemap row — not as a resources hub, not as a commercial rewrite, not as an ADMS program.

Do not write the article, implement the URL, or change production except as that separate later task.

---

## ChatGPT review — disposition

Accepted and applied:

- Reduced outline
- `/resources/` as architecture, not Google-intent signaling
- Same-batch reciprocal link + sitemap (implementation time)
- Tightened ADMS expansion
- Device communication vs receiving software (less absolute than “ADMS is not software”)
- Scheduled-vs-actual off the generic diagram
- One ATTLOG example
- Zero Shift Close telemetry in public copy
- Intent split preserved; setup intent not stolen
- Operator / IT audience; below GitHub, above brochure
- Optional GSC check is not a blocker; not available here

ZKTeco remains an acquisition experiment. No F22 page, no device matrix, no live F22→SRP claim, no ADMS content factory.
