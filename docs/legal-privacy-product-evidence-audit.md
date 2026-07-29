# Legal and Privacy Product Evidence Audit — Simple Roster Plus

**Prepared:** 23 July 2026  
**Scope:** Fact-finding only. No Privacy Policy or Terms drafted. No application, marketing, billing, retention, or legal-page changes.  
**Sole repository change for this task:** this file.

**Classification key**

| Label | Meaning |
|-------|---------|
| Confirmed and active | Implemented and used in product paths |
| Active with limitations | Exists with important caveats |
| Feature-flagged or conditional | Code present but gated by flag/env |
| Documented or planned only | Docs/plans without full product surface |
| Not found | No implementation located |
| Cannot verify from repository | Depends on dashboards, contracts, DNS, or production env |
| Proposed policy decision | Owner-supplied direction; not repository-confirmed unless noted |

---

## 1. Executive summary

Simple Roster Plus stores **organization, manager identity, staff PII, roster, leave, attendance punches, device metadata, billing mirrors, marketing leads, and ops audit/onboarding data** in PostgreSQL (Neon documented). Authentication is primarily **Clerk** (env-gated), with a **legacy password JWT** path still present. Payments use **Stripe** (checkout, Customer Portal, webhooks). Email uses **Resend**. Automated roster messaging uses **Twilio WhatsApp** (SMS mostly docs-only). Biometric **templates are not stored**; ADMS ATTLOG punches are. Public roster share links are **unguessable but unauthenticated**.

Current legal pages (`landing-page/privacy.html`, `landing-page/terms.html`) are **explicit placeholders** (`noindex`) and do **not** name Ellodane Enterprises, Ellodane Media LLC, an address, Saint Lucia law, processors, cookies, retention, rights, refunds, or account deletion process.

**Owner-supplied facts (not found as operator identity in code):** Ellodane Enterprises (Goodlands, Castries, Saint Lucia) is the intended service operator; Stripe is temporarily on an Ellodane Media LLC account; Vantaj Systems is **not** current. These require confirmation outside the repo for customer-facing legal text.

---

## 2. Confirmed business and operator facts

### Finding: Repository-facing product name

- **Classification:** Confirmed and active  
- **Evidence:**
  - `landing-page/index.html`, SEO pages, `app/layout.tsx`, emails — “Simple Roster Plus”
  - Contact email: `hello@simplerosterplus.com` in `landing-page/privacy.html`, `landing-page/terms.html`, `landing-page/index.html`, `lib/email/welcome.ts`
- **Current behavior:** Product branded as Simple Roster Plus; contact is a product mailbox.  
- **Legal-document relevance:** Brand vs contracting party must be distinguished.  
- **What cannot be verified:** Who legally owns the domain/mailbox.  
- **Owner decision required:** Yes

### Finding: Ellodane Enterprises / Media LLC / Vantaj / address / governing law

- **Classification:** Not found (in repo as operator identity); Proposed policy decision (owner-supplied)  
- **Evidence:**
  - Grep: no “Ellodane Enterprises”, “Ellodane Media LLC”, “Vantaj”, company street address, or “governing law”
  - “Saint Lucia” / `LC` appears as **holiday calendar** country code (`lib/holiday-calendar.ts`, `docs/PRODUCT_NOTES.md`), not domicile
  - GitHub path `ellodanem` in docs only (`docs/mvp-launch/feedback-loop.md`)
- **Current behavior:** Legal stubs name neither Ellodane entity nor Saint Lucia as governing law.  
- **Legal-document relevance:** Operator identity, address, governing law, and temporary Stripe merchant-of-record disclosure must come from owner confirmation.  
- **What cannot be verified:** Stripe Dashboard legal entity / statement descriptor; company registration; production contact routing.  
- **Owner decision required:** Yes

### Finding: Placeholder Privacy Policy and Terms

- **Classification:** Confirmed and active (as stubs)  
- **Evidence:** `landing-page/privacy.html`, `landing-page/terms.html` — stub banners; `noindex, follow`; bullets only; mailto contact  
- **Current behavior:** Not customer-ready legal documents.  
- **Legal-document relevance:** Must be replaced before relying on them for signups/paid marketing (stub text already says so).  
- **What cannot be verified:** Whether production deploy still serves these stubs.  
- **Owner decision required:** Yes (approve replacement drafts later)

---

## 3. Account and identity data

### Finding: Manager / org member identity stored by SRP

- **Classification:** Confirmed and active  
- **Evidence:**
  - `prisma/schema.prisma` — `AppUser`: `email`, `clerkUserId?`, `passwordHash?`, `role` (`owner` \| `admin` \| `member`), `organizationId`
  - Provision: `lib/clerk/provision.ts`; webhook: `app/api/clerk/webhook/route.ts`
  - Session: `lib/session.ts`, `lib/clerk/resolve-session.ts`
- **Current behavior:** SRP stores email + role + Clerk IDs; Clerk holds passwords/OAuth/sessions when configured. Legacy bcrypt passwords may exist for non-Clerk users.  
- **Legal-document relevance:** Categories: account credentials/identity; authentication processor (Clerk).  
- **What cannot be verified:** Exact Clerk-hosted fields, MFA enrollment, OAuth providers enabled in production Clerk dashboard.  
- **Owner decision required:** No for existence; Yes for Clerk dashboard MFA/OAuth disclosure accuracy

### Finding: Operator / support users

- **Classification:** Confirmed and active  
- **Evidence:**
  - `OperatorUser`: `email`, `passwordHash?`, `clerkUserId?` (reserved), `role`, `disabledAt?`, `lastLoginAt?`
  - Custom JWT cookie `srp_operator_session` — `lib/ops/auth-cookie.ts`
  - `OperatorAuditLog` with optional IP in free-form `metadata` (comment in schema)
- **Current behavior:** Separate operator plane; not customer Clerk sessions.  
- **Legal-document relevance:** Internal access to customer data; audit logging.  
- **What cannot be verified:** How many operators exist; whether IP is always logged.  
- **Owner decision required:** Yes (operator access policy language)

### Finding: Demo users

- **Classification:** Confirmed and active  
- **Evidence:** `Organization.isDemo`, `demoExpiresAt`; `lib/demo/provision.ts`; reclaim `lib/demo/reclaim.ts`  
- **Current behavior:** Seeded sandbox orgs expire after `DEMO_SANDBOX_DAYS` (14) and can be hard-deleted by cron.  
- **Legal-document relevance:** Temporary personal/business data creation and deletion.  
- **What cannot be verified:** Cron schedule in production Vercel.  
- **Owner decision required:** No

### Finding: Profile images / invite details / client IP on login

- **Classification:** Not found (profile images, invite UX details in SRP DB); Cannot verify from repository (Clerk invites, Clerk IP logs)  
- **Evidence:** No avatar columns on `AppUser`; invites via Clerk org membership (webhook), no dedicated invite model  
- **Owner decision required:** Yes if disclosing Clerk invite emails/IPs

---

## 4. Organization and staff data

### Finding: Organization and location business data

- **Classification:** Confirmed and active  
- **Evidence:**
  - `Organization`: `name`, `timeZone`, Clerk/Stripe/plan mirrors, trial fields, messaging counters, `suspendedAt`, demo flags
  - `Location`: `name`, `timeZone?`, holiday codes — **no street address**
  - Departments, roles, shift templates, public holidays — `prisma/schema.prisma`
- **Current behavior:** Business identity is name + timezone + locations; not a full registered address store.  
- **Legal-document relevance:** Customer business data categories.  
- **Owner decision required:** No

### Finding: Staff personal data (manager-entered)

- **Classification:** Confirmed and active  
- **Evidence:**
  - `Staff`: `firstName`, `lastName`, `email?`, `contactNumber?`, `dateOfBirth?`, `startDate?`, role/department/location FKs, `deviceUserId?`, `isActive`, `archivedAt?`, `whatsappOptIn`, `whatsappOptInAt?`, `punchExempt`, `isTestUser`, `excludeFromRoster`
  - Creation: setup wizard / Staff UI; **no CSV import** (deferred in docs)
  - Leave: `StaffVacation`, `StaffDayOff`, `StaffShiftRequest`, `StaffSickLeave` — manager workflows (`docs/PRODUCT_NOTES.md`); **no employee `/me` portal**
- **Current behavior:** Managers enter and manage staff data. Staff are not separate subscribers. Soft preferences and approved leave are manager-mediated.  
- **Legal-document relevance:** Customer is controller of workplace personal data; SRP processes on their behalf; staff notices/authority are customer responsibility (aligns with proposed contractual model).  
- **What cannot be verified:** Whether customers actually give notices.  
- **Owner decision required:** Yes (confirm controller/processor framing for Saint Lucia / target markets)

### Finding: Marketing inquiry / feedback PII

- **Classification:** Confirmed and active  
- **Evidence:**
  - `MarketingInquiry`: name, email, business?, phone?, staffCount?, hasZkteco?, message?, source?
  - `TesterFeedback`: orgName, userEmail, category, message, pageUrl?
  - APIs: `app/api/marketing/contact/route.ts`, feedback submit paths
- **Current behavior:** Lead and feedback forms store PII and may email via Resend.  
- **Legal-document relevance:** Separate purpose from product account data.  
- **Owner decision required:** No

---

## 5. Roster and attendance data

### Finding: Roster assignments and notes

- **Classification:** Confirmed and active  
- **Evidence:** `RosterWeek`, `RosterEntry` (date, shift template, position?, notes?), leave blocks via related models  
- **Current behavior:** Weekly schedules per location; draft/published.  
- **Legal-document relevance:** Employment schedule data.  
- **Owner decision required:** No

### Finding: Attendance punches and judgments

- **Classification:** Confirmed and active  
- **Evidence:**
  - `AttendanceLog`: `punchAt`, `punchType`, `source`, `verifyMethod?`, `note?`, `originalPunchAt?`, `deviceUserId?`, `deviceRawTimestamp?`, ingest/clock-normalize fields, correcting user FKs
  - `AttendanceDayOverride`: present/absent, lateReason?, note?, decidedByUserId?
  - Manual punches and device ADMS sources
  - Status derivation: `lib/attendance-week.ts`, grace settings
- **Current behavior:** Clock times and manager corrections stored; scheduled vs present/late/absent computed for UI.  
- **Legal-document relevance:** Sensitive workplace time data; correction audit fields exist but are not a complete compliance/audit product.  
- **Owner decision required:** No

### Finding: Pay-period export JSON

- **Classification:** Active with limitations  
- **Evidence:** `PayPeriod` stores `rows` JSON; CSV via `lib/pay-period-export.ts`  
- **Current behavior:** Payroll **handoff** prep, not payroll processing.  
- **Legal-document relevance:** Export of worked-time summaries.  
- **Owner decision required:** No

---

## 6. Device and ZKTeco data

### Finding: Device metadata stored

- **Classification:** Confirmed and active  
- **Evidence:** `Device`: name, serialNumber?, model?, firmwareVersion?, connectionMode, ipAddress?, port?, `commPasswordHash?`, enabled, lastSeenAt?, notes?, deletedAt?  
- **Current behavior:** Connectivity and inventory metadata; COMKEY hashed at create.  
- **Legal-document relevance:** Device identifiers and network fields may be personal/technical data.  
- **Owner decision required:** No

### Finding: Biometric templates

- **Classification:** Confirmed and active (templates **not** stored)  
- **Evidence:** `lib/zk-iclock-push.ts` processes ATTLOG; OPERLOG/BIODATA skipped; no template columns in schema  
- **Current behavior:** Terminals may hold biometrics on-device; SRP stores punch events, not templates.  
- **Legal-document relevance:** Critical accurate disclosure — do not claim SRP stores fingerprints/faces.  
- **What cannot be verified:** What each customer’s device firmware stores locally.  
- **Owner decision required:** No

### Finding: Verification method and raw payloads

- **Classification:** Active with limitations  
- **Evidence:**
  - Schema allows `verifyMethod`; ADMS ingest path typically leaves it null
  - Stores derived punch fields + `deviceRawTimestamp`; not full unrestricted device dump of all tables
- **Legal-document relevance:** Describe punch ingestion, not “full biometric payload storage.”  
- **Owner decision required:** No

### Finding: Public `/iclock` authentication and COMKEY

- **Classification:** Active with limitations  
- **Evidence:**
  - Public routes in `middleware.ts`; serial match in `lib/adms-device.ts`
  - COMKEY generated/hashed on device create (`app/api/devices/route.ts`) but **not validated** on ingest (`lib/zk-iclock-push.ts`)
  - Handshake sets `Encrypt=0`
- **Current behavior:** Trust model is primarily device serial + pairing; spoofing risk if serial known.  
- **Legal-document relevance:** Security section must not claim strong device mutual authentication.  
- **What cannot be verified:** Whether production always uses HTTPS end-to-end for every customer network path.  
- **Owner decision required:** Yes (risk acceptance / wording)

### Finding: Device trial

- **Classification:** Confirmed and active  
- **Evidence:** `lib/device-trial.ts`; `DEVICE_TRIAL_DAYS = 30`; ingest pause when expired on Free; extension helper may be unused  
- **Legal-document relevance:** Free-tier device sync is time-limited; roster/manual attendance continue.  
- **Owner decision required:** No

---

## 7. Public roster sharing

### Finding: Share tokens and visibility

- **Classification:** Confirmed and active  
- **Evidence:**
  - Token: `crypto.randomBytes(24).toString("base64url")` — `lib/roster-share.ts`
  - URL path `/share/roster/[token]` — unauthenticated; middleware public
  - Metadata `robots: index: false, follow: false` — `app/share/roster/[token]/page.tsx`
  - Visible: org/location names, staff names/roles, shift times/colors, approved leave, holidays — `lib/roster-share-data.ts`
  - **Not** attendance punches on share page
  - PNG download + print — share client
  - Unpublish → draft (404); token often **retained** (re-publish may revive same URL)
- **Current behavior:** Anyone with the link can view the published week; no login; noindex intended.  
- **Legal-document relevance:** Customer responsibility for link distribution; privacy risk if links leaked; token in URL.  
- **What cannot be verified:** Whether search engines always honor noindex.  
- **Owner decision required:** Yes (customer duties for public links)

---

## 8. Billing and subscriptions

### Finding: Stripe data stored by SRP

- **Classification:** Confirmed and active  
- **Evidence:**
  - Org mirrors: `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `subscriptionStatus`, `mrrCents`, `currentPeriodEnd`, `trialEndsAt`, addon qty flags
  - Checkout: `lib/stripe-billing.ts`, `app/api/billing/checkout/route.ts`
  - Portal: `app/api/billing/portal/route.ts`
  - Webhooks: `app/api/stripe/webhook/route.ts`; sync `lib/ops/stripe-sync.ts`
- **Current behavior:** SRP does **not** store full card numbers in schema; payment methods handled by Stripe.  
- **Legal-document relevance:** Payment processor disclosure; Stripe as independent controller/processor per Stripe terms (exact role: owner/legal).  
- **What cannot be verified:** Live Stripe account legal name (Ellodane Media LLC per owner), statement descriptor, Tax settings, invoice templates, portal cancellation configuration.  
- **Owner decision required:** Yes

### Finding: Implemented billing behaviors

- **Classification:** Active with limitations  
- **Evidence:**
  - Paid access includes `past_due` (`lib/billing-access.ts`); `unpaid`/`canceled` lose paid tier
  - Cancel primarily via **Customer Portal** (no dedicated in-app cancel API found)
  - **No** app-coded refund API, proration_behavior, or automatic_tax in checkout
  - Operator refunds: docs say deep-link to Stripe (`docs/OPERATOR_CONSOLE.md`)
  - Marketing: “cancel anytime” on landing Plus note — `landing-page/index.html`
- **Legal-document relevance:** Terms must not invent refund/proration behavior as code-confirmed; portal config may implement cancel-at-period-end.  
- **What cannot be verified:** Exact Stripe Portal “cancel at period end” and proration settings.  
- **Owner decision required:** Yes

### Finding: Proposed refund/cancel policy (owner-supplied)

- **Classification:** Proposed policy decision  
- **Evidence:** This audit brief (owner input); **not** implemented as application refund logic  
- **Current behavior:** N/A in code.  
- **Legal-document relevance:** May be drafted into Terms after legal review; mark clearly until Stripe/portal settings match.  
- **Owner decision required:** Yes (finalize and align Stripe)

### Finding: Plan limits

- **Classification:** Confirmed and active  
- **Evidence:** `lib/plans.ts`, `lib/plan-limits.ts`, `docs/PRICING.md` — Free 10/2/1; Plus 50/unlimited loc/2 admins/1 device; Pro 100/5/3; add-ons  
- **Legal-document relevance:** Service description and fair-use/plan limits in Terms.  
- **Owner decision required:** No

---

## 9. Third-party providers

| Provider | Purpose | Data likely sent (from code) | Active? | Privacy Policy | Terms | Production verifiable from repo? |
|----------|---------|------------------------------|---------|----------------|-------|----------------------------------|
| **Clerk** | Auth, orgs, memberships | Email, names (Clerk-side), org membership, sessions | Env-conditional | Yes | Yes | Cannot verify dashboard |
| **Stripe** | Subscriptions, portal, invoices | Customer email/name, org metadata, amounts; cards on Stripe | Env-conditional | Yes | Yes | Cannot verify account entity |
| **Neon / PostgreSQL** | Primary database | All SRP DB contents | Documented | Yes | Yes | Cannot verify region |
| **Vercel** | App hosting / cron / Blob optional | App traffic, env, possibly logs | Documented | Yes | Yes | Cannot verify project settings |
| **Resend** | Transactional/marketing emails | Recipient email, message content | Env-conditional | Yes | Yes | Cannot verify |
| **Twilio** | WhatsApp utility messages | Phone (E.164), template vars, SIDs | Env-conditional | Yes | Yes | Cannot verify |
| **Google Fonts** | Landing (+ Next font Geist) | IP/UA to Google on font fetch | Active on landing HTML | Yes (cookies/transfers) | Optional | Confirmed in HTML |
| **ZKTeco devices** | Customer hardware pushing ATTLOG | Punch events to SRP `/iclock` | Customer-side | Yes (device data) | Yes (compatibility limits) | Device fleet cannot verify |
| **@vercel/blob** | Optional image tooling | Files if token set | Conditional | If used | If used | Cannot verify |
| **Sentry / PostHog / GA / pixels** | — | — | **Not found** (Sentry mention docs-only) | No unless added | No | N/A |
| **OpenAI / LLM APIs** | — | — | **Not found** (Auto Scheduler is local heuristics, flag off) | No | No | N/A |

Evidence roots: `.env.example`, `package.json`, `middleware.ts`, `lib/stripe-billing.ts`, `lib/email/send.ts`, `lib/messaging/twilio-whatsapp.ts`, `landing-page/*.html`, `docs/OPERATOR_CONSOLE.md`.

---

## 10. Cookies and tracking

### Finding: First-party cookies and storage

- **Classification:** Confirmed and active  
- **Evidence:**
  - `srp_session` — `lib/auth-cookie.ts` (httpOnly, SameSite=lax, secure in production)
  - `srp_operator_session` — `lib/ops/auth-cookie.ts`
  - `srp_ob_anon` — onboarding anonymous id — `lib/onboarding-funnel/record-event.ts`
  - Clerk cookies when Clerk enabled
  - `localStorage` `srp_ob_anon` beacon — `app/components/onboarding-signup-beacon.tsx`
  - `sessionStorage` setup incomplete flag — setup/nav components
- **Current behavior:** Auth/ops/onboarding UX storage; **no** consent banner.  
- **Legal-document relevance:** Cookie/storage section needed; essential vs non-essential analysis is a legal question.  
- **Owner decision required:** Yes

### Finding: Analytics and marketing pixels

- **Classification:** Not found  
- **Evidence:** No GA/gtag/GTM/PostHog/Meta pixel in app or landing  
- **Legal-document relevance:** Do not claim analytics cookies exist today.  
- **Owner decision required:** No

### Finding: Demo intent / UTM

- **Classification:** Active with limitations  
- **Evidence:** `?intent=demo` on signup; onboarding funnel events/metadata; marketing `source?` on inquiries  
- **Current behavior:** Product funnel tracking in DB, not third-party ad pixels.  
- **Owner decision required:** No

---

## 11. Email and messaging

### Finding: Transactional and ops email (Resend)

- **Classification:** Feature-flagged or conditional (needs `RESEND_API_KEY`); onboarding automation off by default  
- **Evidence:** `lib/email/send.ts`, welcome, signup-notify, marketing contact, feedback, onboarding follow-ups; `ONBOARDING_AUTOMATION_ENABLED`  
- **Current behavior:** Service/ops emails when configured; automation sequences default off.  
- **Legal-document relevance:** Transactional vs marketing distinction; unsubscribe for marketing.  
- **Owner decision required:** Yes (which emails are marketing)

### Finding: WhatsApp automated roster messages

- **Classification:** Confirmed and active (when Twilio + entitlement + org toggle + staff opt-in)  
- **Evidence:** `lib/messaging/twilio-whatsapp.ts`, `whatsappOptIn` on Staff, metering `lib/messaging/whatsapp-access.ts`, `RosterNotificationLog`  
- **Current behavior:** Utility templates; manual link sharing unlimited and separate. Landing may still say Coming soon in places — marketing/code drift.  
- **Legal-document relevance:** Opt-in, messaging provider, message logs.  
- **Owner decision required:** Yes (TCPA/WhatsApp policy wording)

### Finding: SMS

- **Classification:** Documented or planned only  
- **Evidence:** `docs/ROSTER_PUBLISH_SMS_NOTES.md`, pricing docs; no SMS send implementation paralleling WhatsApp  
- **Owner decision required:** No (exclude as live until built)

### Finding: Password / auth emails

- **Classification:** Cannot verify from repository (Clerk-hosted)  
- **Evidence:** Clerk when configured; legacy password login may not send reset emails via Resend in audited paths  
- **Owner decision required:** Yes

---

## 12. Data access, correction, exports, and deletion

### Finding: Customer self-serve controls

- **Classification:** Active with limitations  
- **Evidence:**
  - Managers can edit staff, leave, roster, punches, devices (within plan)
  - Staff archive preferred; hard delete gated (`lib/staff-archive.ts`, `ALLOW_STAFF_DELETE`)
  - Punch delete API exists
  - Pay-period CSV; print; roster PNG; staff report windows
  - **No** full organization self-serve export/DSAR package
  - **No** customer self-serve organization deletion API
  - Billing portal for subscription management
- **Current behavior:** Day-to-day CRUD for managers; account/org deletion via support/ops (ops delete UI TODO in `docs/OPERATOR_CONSOLE.md`).  
- **Legal-document relevance:** Aligns with owner statement that account deletion requires contacting support.  
- **Owner decision required:** Yes (SLA/process for deletion requests)

### Finding: Ops hard delete

- **Classification:** Active with limitations  
- **Evidence:** Demo reclaim deletes org (+ Clerk); sandbox reset; `scripts/delete-seeded-orgs.ts`; Prisma cascades on Organization  
- **Current behavior:** Hard delete exists for ops/demo, not polished customer DSAR workflow.  
- **What cannot be verified:** Backup retention after delete (Neon/Vercel).  
- **Owner decision required:** Yes

---

## 13. Retention findings

### Finding: Query windows vs deletion

- **Classification:** Confirmed and active (windows); Not found (product retention purge)  
- **Evidence:**
  - Attendance UI windows: `lib/attendance-log-window.ts` (7 / 120 days) — **display**
  - Unmapped punches lookback 90 days — **query**
  - Staff report max 93 days — **query**
  - Device handshake `ResLogDay=18250` — **device-side hint**, not SRP DB purge
  - No cron found that purges historical `AttendanceLog` by age
  - Demo reclaim hard-deletes expired demos
- **Current behavior:** Data generally retained until manually deleted, archived, or org deleted; UI limits are not retention periods.  
- **Legal-document relevance:** Must not convert UI windows into claimed retention schedules.  
- **Owner decision required:** Yes (define retention policy)

---

## 14. Security controls and gaps

### Implemented (examples)

- Auth middleware (Clerk or JWT); org-scoped API queries; httpOnly cookies; share token entropy; bcrypt for legacy passwords and COMKEY at rest; operator audit log; impersonation read-only window; plan-limit checks

Evidence: `middleware.ts`, `lib/auth-cookie.ts`, `lib/roster-share.ts`, `lib/password.ts`, `lib/plan-limits.ts`, ops impersonate routes

### Gaps / limitations

- ADMS serial-only trust; COMKEY not enforced on wire; `Encrypt=0`
- No CSP/security headers in `next.config.ts`
- No general API rate limiting found
- Suspension flag incomplete as hard login block
- Share token not rotated on unpublish
- Encryption at rest / TLS termination: **Cannot verify from repository** (Neon/Vercel)

### Legal-document relevance

Do **not** promise “fully secure,” complete audit trails, or enterprise device authentication. Describe reasonable measures without overclaiming.

- **Owner decision required:** Yes (public security wording)

---

## 15. Suspension, termination, and acceptable-use findings

### Finding: Implemented enforcement pieces

- **Classification:** Active with limitations  
- **Evidence:** Operator suspend (`suspendedAt`); Stripe status mirrors; plan limit hard blocks; device disable/soft-delete; WhatsApp metering; demo expiry reclaim  
- **Not found:** Comprehensive acceptable-use policy text in product; scraping/reverse-engineering bans; public-link misuse policy  
- **Legal-document relevance:** Terms must supply acceptable use, suspension rights, customer data accuracy duties, staff-notice duties — mostly **policy**, not code.  
- **Owner decision required:** Yes

---

## 16. Product limitations relevant to Terms

Confirmed boundaries (evidence across `docs/PRODUCT_NOTES.md`, `docs/PRICING.md`, `docs/MOBILE_STRATEGY.md`, `lib/auto-scheduler-feature.ts`, plan limits, SEO briefs):

| Limitation | Classification |
|------------|----------------|
| Not payroll / tax / legal advice | Confirmed (product + stub Terms) |
| Not full HRIS | Confirmed positioning |
| No employee mobile clock-in / GPS | Confirmed absent |
| No shift swaps (deferred) | Documented or planned only |
| Auto Scheduler flag off; heuristics not LLM | Feature-flagged or conditional |
| No universal ZKTeco support; ADMS push focus | Active with limitations |
| No hardware / installation included | Confirmed |
| Staff/location/admin/device plan caps; Pro max 100 | Confirmed and active |
| Attendance judgment limitations; overnight edge cases may exist | Active with limitations (do not overclaim accuracy) |
| No complete compliance engine / fine-grained RBAC | Active with limitations |
| No CSV staff import | Not found / deferred |
| Manual share ≠ automated SMS for all plans | Active with limitations |

These should later inform warranties, disclaimers, and service description — **not drafted here**.

---

## 17. International processing and transfer findings

| System | Location evidence in repo | Classification |
|--------|---------------------------|----------------|
| Ellodane Enterprises / Saint Lucia | Owner-supplied operator; not in code as processor region | Proposed policy decision / Cannot verify |
| Neon DB region | Docs mention Neon; no region pin in code | Cannot verify from repository |
| Vercel | Hosting docs; `VERCEL_*` env | Cannot verify region |
| Clerk / Stripe / Resend / Twilio / Google | US/global SaaS typical; not configured in repo | Cannot verify from repository — requires contracts/dashboards |

**Legal-document relevance:** International transfers almost certainly occur relative to Saint Lucia customers; exact countries need provider review.

- **Owner decision required:** Yes

---

## 18. Privacy Policy gap analysis

Current stub (`landing-page/privacy.html`) lacks nearly all modern SaaS content. Material gaps vs repository facts:

| Topic | Gap severity |
|-------|--------------|
| Operator legal name + postal address | Critical |
| Contact for privacy requests (beyond hello@) | High |
| Categories: account, staff PII, attendance, devices, billing mirrors, marketing leads, onboarding | Critical |
| Purposes and roles (customer vs SRP) | Critical |
| Staff-data customer responsibility | Critical |
| Processors: Clerk, Stripe, Neon, Vercel, Resend, Twilio, Google Fonts | Critical |
| Device attendance / no biometric templates | High |
| Public roster links | High |
| Cookies / localStorage / Clerk cookies | High |
| International processing | High |
| Retention (and honesty that windows ≠ retention) | High |
| Access, correction, export, deletion (support path) | High |
| Children | Medium |
| Security (non-absolute) | Medium |
| Policy changes / complaints | Medium |
| WhatsApp opt-in messaging | High if live |

---

## 19. Terms of Service gap analysis

Current stub (`landing-page/terms.html`) gaps:

| Topic | Gap severity |
|-------|--------------|
| Contracting party (Ellodane Enterprises) | Critical |
| Temporary Stripe merchant-of-record (Ellodane Media LLC) if required | Critical if cards charged under that account |
| Authority to bind the business / authorized users / staff not separate subscribers | Critical |
| Plan limits, add-ons, renewals | High |
| Cancellation / refunds (proposed vs portal reality) | Critical |
| Acceptable use | High |
| Customer data accuracy + workplace notices | Critical |
| Public share link misuse | High |
| Third-party services | High |
| Product limitations / no payroll / no advice | Partial (one bullet only) |
| IP ownership | Missing |
| Suspension / termination | Missing |
| Data export / account deletion via support | Missing |
| Disclaimers / liability / indemnity | Missing |
| Governing law Saint Lucia | Missing |
| Notices / contact address | Missing |

---

## 20. Facts requiring owner confirmation

1. Confirm Ellodane Enterprises as sole **service operator** for customer contracts.  
2. Confirm temporary Stripe account legal entity (Ellodane Media LLC) and whether customer receipts/statement descriptor disclose it.  
3. Confirm postal address for notices: Goodlands, Castries, Saint Lucia (and any additional address).  
4. Confirm privacy/support email(s) and deletion-request process/SLA.  
5. Confirm Clerk production: MFA, social login, hosted data region.  
6. Confirm Neon/Vercel/Twilio/Resend regions and DPAs.  
7. Confirm Stripe Portal: cancel-at-period-end, proration, tax, currency (USD in seed), refunds practice.  
8. Confirm whether WhatsApp is live for paying customers (vs landing “Coming soon”).  
9. Confirm backup retention after org delete.  
10. Confirm whether operator audit metadata routinely stores IP.  
11. Confirm Vantaj Systems must remain **excluded** from current legal pages.  
12. Confirm proposed refund/cancel rules as final for Terms drafting.

---

## 21. Proposed policy decisions already supplied

**Mark as Proposed policy decision until implemented/aligned:**

| Decision | Status vs repo |
|----------|----------------|
| Operator: Ellodane Enterprises, Goodlands, Castries, Saint Lucia | Not in repo; use for future drafts |
| Do not present Ellodane Media LLC as operator unless billing disclosure requires | No Media LLC string in repo; Stripe entity external |
| Exclude Vantaj Systems from current legal facts | Not found in repo (good) |
| Governing law: Saint Lucia | Not in repo |
| Contract with business account owner; staff are authorized users / data subjects of org workflow, not separate subscribers | Consistent with product model (manager-entered staff; no staff accounts) |
| Org responsible for staff data entry and workplace notices/authority | Consistent with product; not yet in Terms |
| Account deletion via support contact | Consistent with missing self-serve delete; not documented in legal stubs |
| Monthly cancel anytime; effect end of period; monthly fees generally non-refundable; 14-day first annual refund window; exceptions for billing errors/failures/law; upgrades immediate/prorated; downgrades/add-on removals at renewal | **Not** coded as refund engine; Stripe portal config **Cannot verify** |

---

## 22. Final evidence table

| Topic | Classification | Confirmed behavior | Evidence | Privacy relevance | Terms relevance | Owner confirmation needed |
|-------|----------------|--------------------|----------|-------------------|-----------------|---------------------------|
| Service brand | Confirmed and active | Simple Roster Plus | Landing + app | Brand | Brand | No |
| Legal operator name | Proposed / Not found in repo | Intended: Ellodane Enterprises | Owner brief; no code hit | Controller identity | Contracting party | Yes |
| Billing Stripe entity | Cannot verify / Proposed | Temporary Ellodane Media LLC account (owner) | Owner brief; Stripe code only stores customer IDs | Processor disclosure | Merchant of record | Yes |
| Contact email | Confirmed and active | hello@simplerosterplus.com | privacy/terms/landing | Contact | Notices | Yes (mailbox ownership) |
| Postal address | Not found | — | — | Address | Notices | Yes |
| Governing law | Proposed / Not found | Intended Saint Lucia | Owner brief | — | Governing law | Yes |
| AppUser email/role/Clerk IDs | Confirmed and active | Stored in DB | schema, provision | Account data | Authorized users | No |
| Passwords | Active with limitations | Clerk or legacy bcrypt | Clerk; `lib/password.ts` | Auth | Security | Yes (Clerk MFA) |
| Staff PII | Confirmed and active | Manager-entered | `Staff` model | Staff data | Customer responsibility | Yes (controller framing) |
| Staff self-service | Not found | Managers only | MOBILE_STRATEGY | — | Authorized users | No |
| Attendance punches | Confirmed and active | Manual + ADMS | AttendanceLog; zk-iclock-push | Attendance data | Accuracy limits | No |
| Biometric templates | Confirmed not stored | ATTLOG only | zk-iclock-push | Critical accurate claim | Device limits | No |
| Device serial/IP/firmware | Confirmed and active | Stored on Device | schema | Device data | Compatibility | No |
| ADMS auth | Active with limitations | Serial match; COMKEY unused on wire | adms-device; devices route | Security | Security disclaimer | Yes |
| Share links | Confirmed and active | Token URL; noindex; roster not attendance | roster-share* | Public disclosure risk | Customer link duties | Yes |
| Stripe IDs/plan mirrors | Confirmed and active | No PANs in SRP DB | schema; stripe-billing | Billing data | Subscriptions | Yes (descriptor) |
| Refunds/proration in app | Not found | Portal/Stripe Dashboard | stripe-billing; OPERATOR_CONSOLE | — | Refunds | Yes |
| Proposed refund policy | Proposed policy decision | Not implemented | This audit §21 | — | Billing Terms | Yes |
| Resend email | Feature-flagged/conditional | API send when keyed | lib/email/send.ts | Email content | Communications | Yes |
| Twilio WhatsApp | Confirmed and active when entitled | Opt-in + templates | messaging/* | Phone messaging | Messaging terms | Yes |
| SMS | Documented or planned only | Not implemented | ROSTER_PUBLISH_SMS_NOTES | — | Exclude until live | No |
| Analytics pixels | Not found | None | grep | Cookies | — | No |
| Cookies | Confirmed and active | Auth/ops/onboarding + Clerk | auth-cookie; Clerk | Cookie notice | — | Yes |
| Google Fonts | Confirmed and active | Landing CDN | landing-page HTML | Transfer | — | No |
| Org self-delete | Not found | Support/ops path | OPERATOR_CONSOLE TODO | Deletion rights | Deletion | Yes |
| Retention purge | Not found | UI windows only | attendance-log-window | Retention honesty | Retention | Yes |
| Demo delete | Confirmed and active | 14-day reclaim | demo/reclaim | Temporary data | Trials | No |
| Legal page stubs | Confirmed and active | Placeholder noindex | privacy.html; terms.html | Gaps §18 | Gaps §19 | Yes |
| Vantaj Systems | Not found | Exclude | grep | — | — | Yes (keep excluded) |

---

## 23. Recommended next steps

1. Owner confirms §20 items (especially operator, Stripe merchant disclosure, address, governing law, deletion process).  
2. Align Stripe Customer Portal settings with proposed cancel/refund rules **before** publishing Terms that state them as fact.  
3. Draft Privacy Policy and Terms from this audit (separate task); keep stubs `noindex` until approved.  
4. Decide WhatsApp live vs “Coming soon” consistency across marketing and legal.  
5. Document retention schedule as policy (do not invent from UI windows).  
6. Optionally improve product later (out of scope here): COMKEY enforcement, share-token rotation, org deletion workflow, CSP — then update legal claims only after shipping.  
7. Re-run this audit after material provider or billing entity changes.

---

*End of evidence audit. No Privacy Policy or Terms language is approved or drafted by this document.*
