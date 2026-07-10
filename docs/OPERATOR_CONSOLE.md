# Operator Console — platform admin/management plane (design)

**Status:** **v1 shipped to production** (2026-05-30). Operator console live at `/ops` on the
main Vercel deployment. See [Implementation status](#implementation-status) and
[Continuity handoff](#continuity-handoff-pause-point-2026-05-30) to resume work.

**Purpose:** Capture the design for the **platform operator console** — the internal
super-admin surface SR+ staff use to administer *all* customers and organizations
(monitoring, billing, devices, support). This is distinct from the customer-facing
tenant admin already covered in `docs/AGENT_CONTEXT_GTM_AUTH_PRICING.md`.

**Product:** Simple Roster Plus (SR+) — B2B roster + attendance (ZKTeco / ADMS),
Next.js + Prisma + PostgreSQL, multi-tenant via `Organization`.

**Related docs:** `docs/PRICING.md`, `docs/AGENT_CONTEXT_GTM_AUTH_PRICING.md`, `docs/PRODUCT_NOTES.md`,
`README.md`, `prisma/schema.prisma`

---

## Executive summary


| Area              | Decision                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two planes**    | Tenant admin (`app.simplerosterplus.com`) vs **operator console** (`admin.simplerosterplus.com`) are separate surfaces                                |
| **Hosting**       | Operator console on its **own subdomain** `admin.simplerosterplus.com`                                                                                |
| **Auth**          | **Separate, self-contained auth** — a dedicated **Clerk application** for operators, *not* a role on a customer account                               |
| **Access gate**   | Clerk auth **plus** an `OperatorUser` allow-list row (defense in depth); **MFA required**                                                             |
| **Payments**      | **Stripe** (source of truth for money); SR+ mirrors minimal state + reacts to webhooks                                                                |
| **Visual system** | **Must match the existing app**: emerald primary, zinc neutrals, amber warnings, Geist fonts (see [Visual consistency](#visual-consistency-required)) |
| **v1 shape**      | **Read-mostly**: dashboards + a small set of audited write actions (suspend, extend trial, refund, impersonate)                                       |


---

## 0. The two admin planes (why this exists)

"Admin" is overloaded. There are two completely separate consoles; only the first was
previously planned.


|          | **Tenant admin** (planned)                                    | **Operator console** (this doc)                                   |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Who      | A customer's org owner / scheduler                            | **SR+ internal staff**                                            |
| Scope    | One `Organization`                                            | **All** orgs across the deployment                                |
| Lives at | `app.simplerosterplus.com` (`/roster`, `/staff`, `/settings`) | `admin.simplerosterplus.com`                                      |
| Auth     | Customer Clerk app (org membership)                           | **Separate** Clerk app + `OperatorUser` allow-list                |
| Examples | Approve leave, edit a punch                                   | Suspend a delinquent org, refund a charge, watch the device fleet |


The data model is **already tenant-scoped on `Organization`**, which is the exact
foundation an operator console needs. This is an additive cross-tenant read/control layer,
not a refactor.

---

## Visual consistency (REQUIRED)

> **Build note (do not skip):** The operator console **must match the existing app's
> visual language** for a consistent experience. The mockups in this doc were generated
> with a rose/crimson accent — that is **wrong**; rose is the app's *Requests* accent, not
> the primary. Re-tone all operator UI to the tokens below before/while building.

Source of truth: `app/globals.css`, `app/layout.tsx`, `app/components/app-nav.tsx`.


| Token              | Value                                                                      | Usage                                     |
| ------------------ | -------------------------------------------------------------------------- | ----------------------------------------- |
| **Primary accent** | **emerald** (`emerald-700` / `emerald-50` / `emerald-900`)                 | active nav, primary buttons, key stats    |
| **Neutrals**       | **zinc** (`zinc-600`, `zinc-50`, borders)                                  | text, surfaces, dividers                  |
| **Warning**        | **amber** (`amber-50` / `amber-900` / `amber-200`)                         | setup/attention/idle states               |
| **Danger**         | rose/red (`rose-600`, `red-`*)                                             | destructive actions, offline/failed pills |
| **Fonts**          | **Geist Sans** (`--font-geist-sans`), **Geist Mono** (`--font-geist-mono`) | body / numeric + IDs                      |
| **Surfaces**       | white background, rounded cards, subtle zinc borders                       | matches roster/attendance/devices pages   |


Status pills follow the existing app convention: **emerald = healthy/online/active**,
**amber = idle/attention/trialing**, **rose/red = offline/failed/past-due**.

A subtle operator-only signal (e.g. a darker top bar or an "OPERATOR" wordmark lockup) is
fine to signal "internal tool", but the palette, type, spacing, and components stay in the
SR+ system. Reuse existing component patterns rather than inventing a parallel kit.

---

## 1. Hosting & routing (subdomain split)

```
simplerosterplus.com         → marketing / landing
app.simplerosterplus.com     → customer tenant app   (customer Clerk app)
admin.simplerosterplus.com   → operator console      (operator Clerk app)
/iclock/*                    → device ADMS callbacks  (device auth, separate)
```

- The subdomain split is what makes the trust boundary real: **different session cookies,
different identity pools, no cross-bleed**.
- Implementation can be the **same Next.js deployment** with host-based routing in
middleware, or a **separate app** — either is fine. Same deployment is cheaper to start;
the hard boundary comes from auth + cookie scoping, not the deployment topology.
- Operator data access lives in an isolated, obviously named module (e.g. `lib/ops/`*) that
**intentionally bypasses `where: { organizationId }` scoping**. This is the highest-risk
code path in the system and must be unreachable without passing the operator gate.

---

## 2. Auth — operator console handles its own (elaboration)

**Decision: the operator console handles its own auth, separate from the customer app.**
Concretely a **dedicated Clerk application** bound to `admin.simplerosterplus.com`, *not* a
role flag inside the customer Clerk app.

### Why a hard split (not "an admin role on a normal account")

1. **Trust boundary by construction.** `app.` and `admin.` become two different identity
  pools with cookies scoped to different subdomains. A customer cannot exist in the
   operator pool, so no customer-side escalation (leaked token, mis-set
   `publicMetadata.role`, IDOR) can cross into the platform control plane. If "super-admin"
   were an attribute on a customer-shaped identity, one bad metadata write = full platform
   compromise.
2. **Stricter posture for a larger blast radius.** The console crosses *all* tenants, so it
  gets **mandatory MFA**, short sessions, and optionally IP/SSO restriction — without
   imposing that friction on every customer admin.
3. **Cheap & clean on Clerk.** The operator userbase is ~5 internal people, so a second
  Clerk app is effectively free and keeps customer MRU/MRO billing uncontaminated.
4. **Defense in depth via allow-list.** Valid auth in the operator Clerk app is *not*
  sufficient — access also requires an `OperatorUser` row (provisioned, role-scoped,
   revocable). Auth proves *who you are*; the allow-list proves *you may operate the plane*.

### What it is not

- **Not** custom password auth — Clerk is already the chosen provider; this is just a
*separate Clerk instance*, reusing the same integration patterns.
- **Not** the customer Clerk Organizations system.
- **Not** a shared cookie/session with the customer app.

### Mechanics

- `clerkMiddleware` scoped to the `admin.` host using the **operator Clerk app keys**
(separate `*_OPERATOR` env vars).
- After Clerk auth, resolve the user against `OperatorUser` (by `clerkUserId` or verified
internal email). No row → 403, even with valid Clerk auth.
- Operator role (`superadmin` / `support` / `billing` / `readonly`) gates which actions are
available (see RBAC below).
- Every privileged action writes an `OperatorAuditLog` row (actor + before/after).

---

## 3. Functionality (modules)

MVP-flagged so the build is staged, not boil-the-ocean.

### 3.1 Organizations / tenants — *MVP*

- Searchable list of all orgs: plan, status, # locations/staff/devices/admins, created,
trial/demo flags.
- Org 360 detail: owner, timezone, lifecycle (demo → trial → paid), audit timeline,
billing summary, attendance sparkline.
- Lifecycle actions (audited, confirm-dialog'd): **suspend / reactivate / delete**, extend
trial, convert demo → trial, manual plan change (comps/discounts).

### 3.2 Billing & payments (Stripe) — *MVP*

- Stripe is the **source of truth for money**; SR+ mirrors minimal state and reacts to
webhooks. Deep-link "Open in Stripe" instead of rebuilding Stripe's UI.
- MRR / ARR, plan mix, failed payments, churn, **dunning queue**.
- Webhooks (`invoice.payment_failed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `checkout.session.completed`) drive status pills and the
dunning list.

### 3.3 Device fleet & ADMS ingest health — *MVP-ish (key differentiator)*

- Cross-org fleet: online / idle / offline (uses existing `Device.lastSeenAt`,
`lastUserCount`, `lastPunchCount`, `lastFingerprintCount`).
- Ingest observability: punch volume over time, outage detection, **clock drift** (existing
`AttendanceDeviceClock.offsetMs`, `AttendanceLog.clockOffsetMsApplied`), comm-key
mismatches, **unmapped device punches** (existing `lib/unmapped-device-punches.ts`,
nullable `AttendanceLog.staffId`).
- Tenant **Devices** page stays manager-simple (no `/iclock`, ATTLOG/OPERLOG, or
`adms-health` footer). Protocol diagnostics belong here and in
`GET /api/attendance/adms-health` / field-test docs — including hyphen-free hostname notes
for ZKTeco keypads.
- Converts the #1 support liability ("our clock-ins vanished") into a dashboard you see
*before* the angry call.

### 3.4 Monitoring / system health — *MVP-lite*

- Product-shaped health: error rate, p95 latency, `/iclock/`* endpoint health, job/queue
lag, Neon compute (ties to `docs/OPTIMIZATION_BASELINE.md`).
- Lean on **Sentry + Vercel + Neon** for raw infra; the console surfaces product-shaped
signals ("N orgs have a stalled device"), not a re-implemented Grafana.

### 3.5 Users & access (cross-tenant) — *MVP*

- Find any `AppUser` / Clerk user across orgs; see org memberships; resend invites; force
sign-out.

### 3.6 Support tooling — *do early*

- **Read-only impersonation** ("view as this org") — biggest support accelerator. Must be
**audited and time-boxed**.
- Per-org notes, support flags, links to conversations.

### 3.7 Audit log — *MVP (non-negotiable for a control plane)*

- Every operator action (suspend, refund, impersonate, plan change) → immutable record with
actor + before/after. Extends the existing audit-FK habit (`decidedByUserId`,
`createdByUserId`).

### 3.8 Feature flags / rollout — *later*

- Per-org flag overrides for staged rollout, betas, per-customer enablement.

### 3.9 Comms / lifecycle — *later*

- Broadcast/maintenance banners, targeted nudges ("trial ending"), changelog.

---

## 4. Schema additions (none of this exists yet — all additive)

```prisma
// Billing / lifecycle on the existing tenant root.
model Organization {
  // ... existing fields ...
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  plan                 String?           // "trial" | "starter" | "pro" | ...
  subscriptionStatus   String?           // mirror of Stripe status
  currentPeriodEnd     DateTime?
  trialEndsAt          DateTime?
  isDemo               Boolean  @default(false)
  demoExpiresAt        DateTime?
  suspendedAt          DateTime?
  // (clerkOrgId already proposed in AGENT_CONTEXT_GTM_AUTH_PRICING.md)
}

// Operator allow-list (separate from customer AppUser).
model OperatorUser {
  id          String   @id @default(cuid())
  clerkUserId String?  @unique          // from the OPERATOR Clerk app
  email       String   @unique
  role        String   @default("readonly") // superadmin | support | billing | readonly
  disabledAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Immutable operator audit trail.
model OperatorAuditLog {
  id             String   @id @default(cuid())
  operatorUserId String
  action         String                    // "org.suspend" | "billing.refund" | "impersonate.start" | ...
  targetType     String                    // "organization" | "appUser" | "device" | ...
  targetId       String?
  organizationId String?                   // affected tenant, when applicable
  metadata       Json?                     // before/after, reason
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([operatorUserId])
  @@index([action, createdAt])
}
```

Billing values are **mirrors** of Stripe, kept only so the console can render lists and
trigger alerts without a Stripe round-trip per row.

---

## 5. Security model

- **Separate auth pool + allow-list + MFA** (section 2).
- **Isolated cross-tenant data layer** (`lib/ops/`*) that is the only place tenant scoping
is intentionally bypassed.
- **Read-mostly v1**: writes limited to suspend / reactivate / extend trial / refund /
impersonate, each behind a confirm dialog and an `OperatorAuditLog` entry.
- **RBAC** by operator role: `readonly` (view), `support` (impersonate, notes),
`billing` (refunds, plan changes), `superadmin` (suspend/delete, manage operators).
- **No Stripe secrets in the browser**; all Stripe calls server-side; webhooks signature-verified.

---

## 6. Build order

1. **Operator gate** (separate Clerk app + `OperatorUser` allow-list + `admin.` host routing).
2. **Org list + Org 360 (read-only)** — instant operational visibility, zero risk.
3. **Stripe integration + Billing module** — can't launch a SaaS without it.
4. **Device / ingest health** — turns the biggest support liability into a dashboard.
5. **Audited write actions** (suspend, extend trial, refund, impersonate) + Audit log.
6. **Feature flags, comms, deeper monitoring** — as scale demands.

---

## 7. Env vars (add when implementing)

```
# Operator Clerk app (separate from customer Clerk keys)
NEXT_PUBLIC_CLERK_OPERATOR_PUBLISHABLE_KEY
CLERK_OPERATOR_SECRET_KEY
CLERK_OPERATOR_WEBHOOK_SIGNING_SECRET

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SIGNING_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## 8. Mockups

> Reference only. Re-tone from rose to the **emerald/zinc/amber** SR+ palette before
> building (see [Visual consistency](#visual-consistency-required)). Layout, density, and
> information architecture are representative of the target.

**Platform overview / mission control**

Operator console — platform overview

**Organization (tenant) 360 detail**

Operator console — organization detail

**Device fleet & ADMS ingest health**

Operator console — device & ingest health

**Billing & subscriptions (Stripe)**

Operator console — billing & subscriptions

---

## Implementation status

**Shipped (2026-05-30): read-only foundation.**


| Area                                                    | Status         | Notes                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routing                                                 | ✅              | Console at `**/ops/*`**, APIs at `/api/ops/*`. Subdomain `admin.` maps to `/ops` via a deploy-time host rewrite (below).                                                                                                                                                     |
| Operator auth                                           | ✅ (custom)     | Separate cookie (`srp_operator_session`), **separate secret** `OPERATOR_AUTH_SECRET`, audience-bound JWT. Mirrors the current pre-Clerk tenant auth; swaps to a dedicated operator Clerk app later without touching the allow-list.                                          |
| Allow-list (layer 2)                                    | ✅              | `OperatorUser` row required + `disabledAt` check in `lib/ops/context.ts`.                                                                                                                                                                                                    |
| RBAC                                                    | ✅              | `OperatorRole` + `operatorCan()`; enforced in `lib/ops/api.ts` guard on every write route.                                                                                                                                                                                   |
| Audit log                                               | ✅              | `OperatorAuditLog` + `recordOperatorAudit()` (before/after + reason); **viewer at `/ops/audit`**.                                                                                                                                                                            |
| Cross-tenant data layer                                 | ✅              | Isolated in `lib/ops/data.ts` — the only place org-scoping is bypassed.                                                                                                                                                                                                      |
| Overview / Orgs list / Org 360 / Device fleet / Billing | ✅ (read-only)  | Server-rendered from the DB; emerald/zinc/amber + Geist.                                                                                                                                                                                                                     |
| Audited write actions                                   | ✅ (lifecycle)  | **Suspend/reactivate** (superadmin), **extend trial**, **convert demo→trial** (billing+) — confirm dialog + reason, audited.                                                                                                                                                 |
| Ingest observability                                    | ✅ (first pass) | 24 h punch-volume chart, punches today, learned clock-drift, stalled devices, live unmapped-punch feed.                                                                                                                                                                      |
| Production wiring                                       | ✅              | `admin.` subdomain → `/ops` rewrite + edge gate in `middleware.ts`; `prisma migrate deploy` in the Vercel build.                                                                                                                                                             |
| Stripe (mirror + webhooks)                              | ✅ (first pass) | Signature-verified webhook at `**/api/stripe/webhook`** mirrors subscription state → org columns (incl. exact `mrrCents`); **"Sync from Stripe"** operator action (billing+); **"Open in Stripe"** deep links on Billing + Org 360. Enabled when `STRIPE_SECRET_KEY` is set. |
| Stripe (refunds + plan changes from console)            | ⏳              | Deep-link to Stripe for now; in-console refund/plan-change UI deferred.                                                                                                                                                                                                      |
| Impersonation (read-only)                               | ✅              | Support+ **Impersonate** on Org 360 → 30 min read-only tenant session; amber banner + **End session**; mutating APIs blocked in middleware; audited (`impersonate.start` / `impersonate.end`). Built on current JWT; swaps to Clerk actor tokens when tenant auth migrates.  |
| Operator Clerk app + MFA                                | ⏳              | Custom auth today; documented swap path above.                                                                                                                                                                                                                               |
| Users (cross-tenant), Feature flags, Comms              | ⏳              | Nav shows them as "soon".                                                                                                                                                                                                                                                    |


**Key files:** `lib/ops/*` (auth, context, audit, billing, data, device-status),
`app/ops/login/*`, `app/ops/(console)/*`, `app/api/ops/auth/*`, `middleware.ts` (operator
gate), `prisma/schema.prisma` + `prisma/migrations/20260530120000_operator_console`.

**Run it locally:** set `OPERATOR_AUTH_SECRET` (16+ chars), `npm run db:migrate`,
`npm run db:seed`, then visit `/ops` and sign in with `ops@demo.local` / `ops`.

**Subdomain rewrite (production): ✅ implemented in `middleware.ts`.** Any host starting
with `admin.` (or an exact `ADMIN_HOST`) is treated as the operator plane: bare paths
(e.g. `admin.host/organizations`) are rewritten under `/ops` and the operator gate runs at
the edge. The app host keeps the console at `/ops`. Point `admin.simplerosterplus.com` at
the same deployment via DNS — no separate app needed. The cookie/secret separation enforces
the trust boundary regardless of host.

**Migrations on deploy: ✅** the Vercel build runs `prisma migrate deploy` via
`scripts/migrate-deploy.mjs` (retries + direct Neon URL). `DATABASE_URL` is required;
when it uses a Neon **pooler** host, set `**DIRECT_URL`** to the direct connection string
or rely on auto-derive (pooler host with `-pooler` removed).

**Ingest observability: ✅ (first pass)** the Devices page surfaces a 24 h punch-volume
chart, punches-today, learned clock-drift (avg + calibrated count), stalled-device count,
and a live unmapped-punch feed. Comm-key/parse error feeds need richer event logging
(deferred).

**Stripe: ✅ (first pass)** Stripe stays the source of truth; SR+ mirrors minimal state.

- **Env:** `STRIPE_SECRET_KEY` (server), `STRIPE_WEBHOOK_SIGNING_SECRET` (verify webhooks),
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client, future checkout). Billing reads + the sync
action no-op gracefully until `STRIPE_SECRET_KEY` is set.
- **Webhook:** `POST /api/stripe/webhook` (Node runtime, raw-body signature check, *not*
operator-gated). Handles `customer.subscription.created/updated/deleted`, `invoice.paid`,
`invoice.payment_failed`, `checkout.session.completed`. Resolves the org by mirrored
`stripeCustomerId` then Stripe customer `metadata.organizationId`; `checkout.session`
also links via `client_reference_id`.
- **Mirror columns updated:** `stripeCustomerId`, `stripeSubscriptionId`, `plan`,
`subscriptionStatus`, `currentPeriodEnd`, `trialEndsAt`, and exact `mrrCents` (yearly→/12,
summed across items). MRR/ARR now use `mrrCents` when present, else the plan→price estimate.
- **Operator action:** "Sync from Stripe" (`POST /api/ops/organizations/[id]/sync-stripe`,
billing+, audited as `billing.sync_stripe`) reconciles when a webhook is missed.
- **Files:** `lib/ops/stripe.ts`, `lib/ops/stripe-sync.ts`, `app/api/stripe/webhook/route.ts`,
`app/api/ops/organizations/[id]/sync-stripe/route.ts`,
`prisma/migrations/20260530170000_org_mrr_cents`.
- **Wiring Stripe:** point a dashboard webhook endpoint at `https://<app-host>/api/stripe/webhook`
(the app domain, not `admin.`), select the events above, copy the signing secret into
`STRIPE_WEBHOOK_SIGNING_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Continuity handoff (pause point 2026-05-30)

Use this section to resume after a break. Branch `**docs/operator-console`** was merged into
`**main**` at commit `**dad776d**` and deployed to production.

### Production access (verified working)


| Surface          | URL                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Operator login   | [https://simplerosterplus.vercel.app/ops/login](https://simplerosterplus.vercel.app/ops/login) |
| Operator console | [https://simplerosterplus.vercel.app/ops](https://simplerosterplus.vercel.app/ops)             |
| Tenant app       | [https://simplerosterplus.vercel.app/login](https://simplerosterplus.vercel.app/login)         |


Seed operator sign-in (after `npm run db:seed`): `**ops@demo.local**` / `**ops**` (requires
`OPERATOR_AUTH_SECRET` on Vercel). Seed tenant sign-in: `**admin@demo.local**` / `**demo**`.

### What is done (operator console v1)

- **Routing:** `/ops/`* on app host; `admin.*` host rewrite + edge gate in `middleware.ts`
(DNS for `admin.simplerosterplus.com` not purchased yet — works at `/ops` today).
- **Auth:** Custom JWT operator plane — separate cookie (`srp_operator_session`), separate
secret (`OPERATOR_AUTH_SECRET`), `OperatorUser` allow-list, RBAC (`readonly` / `support` /
`billing` / `superadmin`).
- **Pages:** Overview, Organizations list, Org 360, Device fleet + ingest health, Billing,
Audit log viewer.
- **Audited write actions:** Suspend/reactivate (superadmin), extend trial, convert demo→trial
(billing+), Sync from Stripe (billing+, when Stripe configured).
- **Stripe (first pass):** Webhook at `/api/stripe/webhook`, org billing mirror columns incl.
`mrrCents`, Open in Stripe deep links. Gracefully disabled until `STRIPE_SECRET_KEY` set.
- **Impersonation (read-only):** Support+ **Impersonate** on Org 360 → 30 min read-only tenant
session; middleware blocks mutating APIs; amber banner + End session; audited
(`impersonate.start` / `impersonate.end`). Built on current tenant JWT (not Clerk yet).
- **Deploy:** `prisma migrate deploy` in Vercel build; operator + billing migrations applied.

### Clerk (registered, not wired)

Customer Clerk app **"SRP"** created; **Organizations enabled** (membership required). Keys in
local `.env` only (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). **Tenant app still
uses custom JWT** (`AUTH_SECRET`, `/login`, `AppUser.passwordHash`). Operator console still uses
custom operator JWT — operator Clerk app not created yet. See `docs/AGENT_CONTEXT_GTM_AUTH_PRICING.md`.

### What is left — recommended resume order

1. **Tenant Clerk migration** (highest leverage) — replace custom tenant auth; provisioning
  webhooks; `/setup` onboarding wizard. Unblocks real sign-up and cleaner impersonation later.
2. **Stripe keys on Vercel** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; dashboard webhook → `https://simplerosterplus.vercel.app/api/stripe/webhook`.
3. **Operator Clerk app + MFA** — second Clerk application for `admin.`*; swap operator login;
  mandatory MFA for internal staff.
4. **Stripe refunds/plan changes in-console** — convenience; deep-link to Stripe works today.
5. **Cross-tenant Users** nav page — find any `AppUser` across orgs, access support actions.
6. **Feature flags + Comms** — per-org toggles and targeted banners (nav shows "soon").
7. **Custom domains** — buy `simplerosterplus.com`; point `app.` and `admin.` at Vercel.
8. **Ingest observability (deeper)** — comm-key/parse error feeds (needs richer event logging).
9. **Broader GTM** (see `AGENT_CONTEXT_GTM_AUTH_PRICING.md`, tiers in `PRICING.md`) — demo→trial funnel, pricing/SKUs
  in Stripe, employee self-service (drives Clerk Enhanced B2B tier later).

### Vercel env checklist (production)


| Variable                             | Purpose                | Set on Vercel?                 |
| ------------------------------------ | ---------------------- | ------------------------------ |
| `DATABASE_URL`                       | Postgres / migrations  | Required                       |
| `AUTH_SECRET`                        | Tenant custom JWT      | Required                       |
| `OPERATOR_AUTH_SECRET`               | Operator console login | Required (verified for `/ops`) |
| `STRIPE_SECRET_KEY`                  | Billing mirror + sync  | Optional until Stripe wired    |
| `STRIPE_WEBHOOK_SIGNING_SECRET`      | Stripe webhooks        | Optional                       |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Future checkout        | Optional                       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Tenant Clerk (future)  | Not yet                        |
| `CLERK_SECRET_KEY`                   | Tenant Clerk (future)  | Not yet                        |


### Key commits on `main` (operator console arc)

```
11d3498  Add operator console design doc and mockups
50e2323  Build operator console foundation (read-only)
88a8488  Add audited operator write actions + audit log viewer
8ad7b1a  Add ingest observability + production wiring
0722ec0  Wire Stripe into operator console (mirror + webhooks)
dad776d  Add read-only operator impersonation for tenant support  ← HEAD at pause
```

## 9. Open questions

1. ~~Same Next.js deployment with host routing vs. a separate app for `admin.`?~~ **Decided:**
  same deployment; host routing in `middleware.ts`.
2. Operator MFA: TOTP only, or require SSO (Google Workspace) for internal staff?
3. How much Stripe state to mirror vs. fetch on demand (lists need mirror; detail can fetch)?
4. ~~Impersonation: read-only only at launch?~~ **Shipped read-only v1.** Write mode for
  support fixes remains a future, separately gated decision.
5. Plan/SKU shape — see `docs/PRICING.md` (Free / Plus / Pro, add-ons). Feeds the billing module
  and Stripe step 12; GTM context in `AGENT_CONTEXT_GTM_AUTH_PRICING.md`.

---

*Last updated: 2026-05-30 (pause handoff). Update when auth, hosting, billing, or scope decisions change.*