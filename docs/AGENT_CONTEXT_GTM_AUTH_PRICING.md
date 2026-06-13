# Agent context: GTM, auth (Clerk), onboarding, demos & pricing inputs

**Purpose:** Capture decisions and reasoning from product planning (May 2026) so a later agent—especially one focused on **pricing**—can work without re-deriving context.

**Product:** Simple Roster Plus (SR+) — B2B roster + attendance (ZKTeco / ADMS), Next.js + Prisma + PostgreSQL, multi-tenant via `Organization`.

**Related docs:** [`PRICING.md`](./PRICING.md) (canonical tiers & SKUs), `docs/PRODUCT_NOTES.md`, `README.md`, `prisma/schema.prisma`

---

## Executive summary

| Area | Decision |
|------|----------|
| **Auth** | **Clerk** (not custom password auth long-term) |
| **Tenancy** | Prisma `Organization` + `AppUser` remain source of truth; link `clerkOrgId` / `clerkUserId` |
| **Onboarding** | Clerk sign-in → provision tenant → `/setup` wizard → main app + checklist |
| **GTM funnel** | **Demo first** (seeded sandbox) → **14-day trial** (real data) → paid |
| **Logins at launch** | **Admin-only** (handful per site); roster `Staff` ≠ Clerk members |
| **Devices** | Outside Clerk; 100+ devices do not affect auth billing |
| **Clerk cost (early)** | Likely **$0** (Hobby); Pro ~$20–25/mo when MFA/branding needed |
| **Pricing** | **Finalized direction** — see [`PRICING.md`](./PRICING.md): Free (≤10 staff), Plus **$19.99/mo** (≤100 staff), Pro **$49.99/mo** (unlimited staff); device/admin/WhatsApp add-ons |

---

## 1. Onboarding & setup wizard (app-owned)

### Journey

```
Landing → Clerk Sign up / Sign in → Provision tenant (if new)
  → /setup until "go live" → Roster / Staff / Devices / Attendance
  → In-app checklist until "fully configured"
```

### Hard gates (redirect to `/setup` until met)

- `Organization.timeZone` (IANA — critical for `lib/datetime-policy.ts`)
- ≥1 `Location` (default "Main" created at provision)
- ≥1 `ShiftTemplate`
- ≥1 `Staff`

### Soft steps (skippable in wizard; checklist after)

- First `RosterEntry` / first roster week
- Attendance settings (`AppSetting`)
- Connect `Device` (ADMS / pull_tcp)
- Public holidays, publish roster week, invite second admin

### Onboarding state (implementation)

- Prefer `AppSetting` keys or `Organization.onboardingCompletedAt`
- Suggested keys: `onboarding.step`, `onboarding.completedSteps`, `onboarding.skippedSteps`

### Routes (conceptual)

| Public | Authenticated incomplete | Authenticated complete |
|--------|--------------------------|------------------------|
| `/`, Clerk sign-in/up | `/setup` | `/roster`, `/staff`, `/devices`, `/attendance`, `/settings` |

### What NOT to build (Clerk replaces)

- Custom `/signup`, `/forgot-password`, `/reset-password`
- `passwordHash` on `AppUser` (after Clerk)
- `AUTH_SECRET` JWT user sessions (`sc_token` today in `middleware.ts`)
- `PasswordResetToken` table

### Device onboarding (unchanged by Clerk)

- Register device (name, serial, location, `adms_push` or `pull_tcp`)
- Operator configures terminal with server URL, SN, comm key
- `lastSeenAt` drives online status; staff mapped via `Staff.deviceUserId` per location

---

## 2. Auth architecture with Clerk

### Division of responsibility

| Clerk | SR+ (Prisma / app) |
|-------|---------------------|
| Sign-up, sign-in, password reset, email verify | `Organization`, `Location`, `Staff`, roster, attendance |
| Session / MFA (Pro) | `Device`, ADMS `/iclock/*`, comm keys |
| Organizations (B2B), invites, Admin/Member roles | Audit FKs: `decidedByUserId`, `createdByUserId`, etc. |
| Brute-force, leaked-password checks | Onboarding wizard, go-live gates, demo/trial flags |

### Schema additions (when implementing)

```
Organization.clerkOrgId   String? @unique
AppUser.clerkUserId       String? @unique
AppUser.role              owner | admin | member (map from Clerk)
```

- Keep audit foreign keys on **`AppUser.id`**, not Clerk IDs.
- **Do not** replace `AppUser` with Clerk-only metadata.

### Provisioning (recommended)

**Clerk Organizations enabled** + webhooks (`organization.created`, `user.created`, `organizationMembership.created`) → create/update:

- `Organization` + `clerkOrgId`
- Default `Location` ("Main", `isDefault: true`)
- `AppUser` (owner) + `clerkUserId`

Timezone collected in **app** (setup step 1), not from Clerk.

### Auth helper pattern

Single `getAuthContext()` → `{ appUserId, organizationId, clerkUserId, email, orgRole }` used by all APIs. Today: `getSession()` in `lib/session.ts` with `{ sub, orgId, email }`.

### Middleware

- Replace custom JWT middleware with `clerkMiddleware`
- Public: Clerk routes, marketing, **`/iclock/*`** (device auth separate)
- Signed in + no tenant / incomplete onboarding → `/setup`
- Signed in + go-live met → app routes

### Migration from current state (May 2026)

- App has custom login (`app/api/auth/login/route.ts`), seed `admin@demo.local` / `demo`
- No signup/forgot built yet — good time to adopt Clerk before building duplicate auth
- At ~10 customers + 100 devices: Clerk migration is **low effort** if `AppUser` + mapping columns preserved

### Env vars (add)

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `DATABASE_URL` (unchanged)

---

## 3. Clerk pricing & unit economics (inputs for pricing agent)

**Official pricing:** https://clerk.com/pricing (plans updated Feb 2026)

### Plans relevant to SR+

| Plan | Cost | Notes |
|------|------|-------|
| **Hobby** | $0 | 50k MRU/app, 100 MRO/app included; B2B: ≤20 **members per org**, Admin/Member roles |
| **Pro** | ~$20/mo annual, ~$25 monthly | MFA, remove branding, custom session; still 50k MRU |
| **Enhanced B2B** | +~$85–100/mo | **Unlimited members per customer org**, custom rolesets, verified domains |
| **Business** | ~$250/mo | SOC2 report, HIPAA path, more dashboard seats |

### Billing concepts

- **MRU** = monthly retained user (returned 24h+ after signup) — platform-wide per app
- **MRO** = monthly retained org (≥2 members, ≥1 retained user)
- **Dashboard seats** = people on *your* team using Clerk admin UI — NOT customer admins
- **Members per organization** = logins per **customer tenant** (maps to SR+ `Organization`)
- **Devices do not count** toward Clerk

### SR+ expected Clerk usage (launch → medium term)

- **1–5 Clerk members per customer org** (owner, scheduler, supervisors)
- **Many `Staff` rows without login** — no Clerk cost
- **Employee self-service later** (leave requests, `/me`) → members per org may exceed 20 → triggers **Enhanced B2B** (~$105–125/mo total with Pro), still **one bill for entire platform**

### Covering Clerk with customer revenue (illustrative)

Platform Clerk cost is **not per customer**:

| Clerk bill | Customers needed at ARPU… |
|------------|---------------------------|
| $0 | — |
| $25/mo (Pro only) | $10 → 3 · $15 → 2 · $20 → 2 |
| $125/mo (Pro + Enhanced) | $10 → 13 · $15 → 9 · $20 → 7 |

**User constraint:** pricing likely **below $29/mo** — margin % is tighter but **absolute Clerk cost is small** until many logins/org or Enhanced tier.

### When Clerk cost stays $0

- Admin-only logins, &lt;20 members/org, &lt;100 MRO, &lt;50k MRU
- Matches launch strategy: **no employee self-service initially**

### Pricing model implications (for pricing agent)

Consider decoupling:

| Revenue lever | Maps to cost |
|---------------|--------------|
| Base per org/site | Clerk (low), hosting, support |
| Per device / attendance add-on | Hardware integration support, not Clerk |
| Per seat (admin login) | Clerk members if scale; Enhanced B2B at 20+ logins/org |
| Employee portal tier | Clerk members + product complexity |

**Do not** bundle unlimited staff logins in a $10 base plan without a seat cap or higher tier.

---

## 4. GTM: demo vs trial (final recommendation)

### Hybrid funnel (not either/or)

```
Landing
  ├─ "See a demo"     → seeded sandbox org (low friction)
  └─ "Start free trial" → real org, 14 days, their data
        └─ Paid → same real org (no migration)
```

### Demo (v1 priority for cold traffic)

- Dedicated page: email → `POST /api/demo/request`
- Backend: `Organization` with `isDemo: true`, `demoExpiresAt` (+14 days), seed staff/templates/roster (reuse seed logic)
- Clerk: create org + **organization invitation** OR **sign-in token** in branded email
- **Skip or minimal `/setup`** — land on roster with sample data
- Auto-delete expired demo orgs (Clerk + Prisma)
- **Do not** use shared `admin@demo.local` in production
- **Do not** convert demo org to paid in place — create new real org or wipe

### Trial

- **14 days** preferred over 7 (roster is weekly; need ~2 publish cycles)
- Empty org + full `/setup` wizard
- **Full roster + requests + manual attendance** on trial
- **Device connect:** de-emphasize on trial OR limit 1 device / post-sale setup (hardware friction)

### Flags

```
Organization.isDemo       Boolean
Organization.demoExpiresAt DateTime?
Organization.trialEndsAt   DateTime?
Organization.isTrial       Boolean (or infer from trialEndsAt)
```

Clerk metadata optional: `publicMetadata.demo`, `publicMetadata.trial`.

---

## 5. Multi-user & RBAC (phased)

| Phase | Capability |
|-------|------------|
| **Launch** | Owner only or 1–2 admins via Clerk invite |
| **v2** | Clerk Admin/Member → API permissions; per-location scoping still in app (see PRODUCT_NOTES) |
| **v3** | `Staff.appUserId` → employee `/me`, leave requests; pricing tier + Clerk member growth |

Clerk **included B2B**: ≤20 members/org, invitations, basic RBAC. **Enhanced B2B** if &gt;20 logins/org or custom rolesets.

---

## 6. Build order (implementation)

1. Clerk foundation + `clerkMiddleware` + SignIn/SignUp UI
2. Tenant provisioning (webhook, `clerkOrgId`, `clerkUserId`)
3. `/setup` wizard + go-live gates + checklist on roster
4. Demo request API + seed + Clerk invite/token email
5. Trial flags + banner + conversion to paid
6. Clerk org invites for second admin
7. Employee self-service (later)

---

## 7. Deferred / out of scope (launch)

- Custom auth (password reset tables, etc.)
- Clerk Enhanced B2B until &gt;20 logins per customer org
- Enterprise SSO (price into Enterprise tier; ~$75/mo per SAML connection on Pro+)
- Employee self-service portal
- CSV staff import, sick-leave inbox, shift swap
- Shared read-only demo for all prospects (prefer per-email sandbox)
- Full device-led trial without onboarding support

---

## 8. Pricing decisions & open items

**Canonical spec:** [`PRICING.md`](./PRICING.md) (May 2026).

### Resolved (owner-approved)

| Topic | Decision |
|-------|----------|
| **Hero paid tier** | Plus **$19.99/mo** (monthly default; optional annual) |
| **Free tier** | ≤10 staff, ≤2 locations (soft at 3+), 1 admin, 30-day device sync trial (+ one extension) |
| **Staff caps** | Plus ≤**100** staff; Pro **unlimited** |
| **Locations (paid)** | **Unlimited** on Plus/Pro — not a billing axis |
| **Devices** | Plus: 1 included; Pro: 3 included; **+$5/mo** each additional |
| **Admins** | Free: 1; Plus: 2; Pro: 5; **+$2/mo** each additional |
| **SMS / WhatsApp** | SMS on Plus/Pro (caps TBD); WhatsApp **+$5/mo** on Plus, included on Pro |
| **Competitive frame** | Roster-first + monthly billing vs Timetaag annual attendance pricing |

### Still open (see PRICING.md § Open items)

1. **AI metering** — action definition and Plus/Pro fair-use caps.
2. **SMS volume caps** and TCPA/opt-in before roster publish ships.
3. **Device trial** legal copy (extension rule, post-trial behavior).
4. **Agency / multi-org per user** — PRODUCT_NOTES future; pricing TBD.
5. **Clerk COGS** at scale — admin-only launch stays Hobby; employee self-service → Enhanced B2B.
6. **Demo → trial → paid** — 14-day real org trial unchanged; Free tier is separate forever-free path.

---

## 9. One-line strategy (canonical)

**Clerk handles people; Prisma handles stations; `/setup` handles correctness; seeded demo opens the door; 14-day real trial closes it; devices and extra logins grow ARPU without surprising auth cost.**

---

## 10. Conversation chronology (for traceability)

1. Designed full in-app signup → `/setup` wizard (go-live vs checklist); devices separate.
2. Discussed in-app auth vs hosted — Clerk viable; migration at 10 orgs + 100 devices = low difficulty if `AppUser` retained.
3. Clerk pricing: likely $0 early; Pro ~$25; Enhanced ~$100 for unlimited members **per customer org** (not dashboard seats).
4. User pricing below $29 — Clerk still small in absolute dollars; % margin tighter.
5. Confirmed admin-only logins keep Clerk low; employee self-service increases members/org.
6. Settled on Clerk; updated plan (Clerk replaces auth pages, keeps wizard).
7. Demo flow: email → provision seeded org → Clerk invite or sign-in token.
8. Demo vs trial: **hybrid** — demo-first for cold traffic, 14-day trial for serious buyers, devices post-sale or limited on trial.
9. User requested this file for later pricing agent.
10. Pricing tiers finalized — see [`PRICING.md`](./PRICING.md) (Free / Plus / Pro, device trial, staff caps).

---

*Last updated: 2026-05-30. Update this file when pricing, auth, or GTM decisions change.*
