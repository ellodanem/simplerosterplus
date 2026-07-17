# Onboarding Funnel

Internal funnel tracking and (later) follow-up for self-serve signup → first published roster.

**Status:** Phase 2 — event tracking, progress aggregation, abandonment detection, Vitest. Ops UI and email send land in later phases. Automatic email sending stays **off** (`ONBOARDING_AUTOMATION_ENABLED=false`).

**Terminology:** Product “workspace” / “business” = Prisma `Organization` (`organizationId`). Product “employee” = `Staff`. Funnel subject = tenant `AppUser` (manager), not staff.

---

## Funnel stages (ordered)

| Stage | Ordinal | Meaning |
|-------|---------|---------|
| `signup_started` | 10 | Meaningful signup interaction (not a page view) |
| `account_created` | 20 | `AppUser` provisioned from Clerk |
| `email_verified` | 30 | Optional — only if Clerk reliably exposes it; never fabricated |
| `workspace_created` | 40 | `Organization` provisioned |
| `business_details_completed` | 50 | Setup business PUT succeeded |
| `employees_added` | 60 | First `Staff` row for the org |
| `first_roster_started` | 70 | First `RosterWeek` created (may be empty) |
| `first_roster_created` | 80 | First week with ≥1 valid `RosterEntry` |
| `first_roster_published` | 90 | **Primary activation** → sets `activatedAt` |
| `attendance_setup_started` | 95 | Optional branch — attendance settings saved |
| `attendance_device_connected` | 96 | Optional — first live device `lastSeenAt` |
| `onboarding_completed` | 100 | Setup wizard complete (`POST /api/setup/complete`) only |

Activation (`activatedAt`) and setup completion (`completedAt` / `onboarding_completed`) are **independent**. Publishing a roster does **not** emit `onboarding_completed`.

---

## Progress field definitions

### `highestStageReached`

Furthest milestone stage achieved by ordinal. **Never regresses.** Optional attendance stages may advance it without blocking activation.

### `currentStage`

Operational position for Ops: equals `highestStageReached` while the subject is in-progress. After `onboarding_completed`, both are `onboarding_completed`. Abandonment sets `abandonedAt` / `abandonmentReason` without changing `currentStage` (stalled *at* `currentStage`).

### Snapshot fields

`contactName`, `contactEmail`, `businessName` — denormalized for Ops list queries. Canonical truth remains `AppUser` / `Organization` / Clerk.

---

## Event model & idempotency

### Raw events are retained

`OnboardingEvent` rows are append-only. Repeated domain actions may produce additional **non-milestone** events with unique keys. Milestone stage events use **stable** `idempotencyKey` values so retries do not double-count progress.

### `idempotencyKey` (unique)

Examples:

- `stage:signup_started:anon:{anonymousSessionId}`
- `stage:account_created:user:{userId}`
- `stage:workspace_created:org:{organizationId}`
- `stage:employees_added:org:{organizationId}`
- `stage:first_roster_created:org:{organizationId}`
- `stage:first_roster_published:org:{organizationId}`
- `stage:onboarding_completed:org:{organizationId}`
- `error:{category}:req:{requestId}` (one per failure occurrence)

Duplicate key → ignore insert; **do not** re-apply progress mutation for that milestone.

---

## Anonymous → user merge

1. Client generates `anonymousSessionId`, stores in `localStorage`, emits `signup_started` via `POST /api/onboarding/signup-intent` on first meaningful Clerk form interaction (not page view).
2. API sets cookie `srp_ob_anon` for server-side linking.
3. On `ensureAppUserFromClerk` / authenticated `POST /api/onboarding/link-session`, link anon progress + events to `userId`.
4. If beacon never fired: `account_created` alone still creates progress (Clerk fallback).

**Merge rules:** prefer user-keyed progress row; reassign anon events; `highestStageReached` = max ordinal; earliest `signupStartedAt`; clear anon unique key after merge; cancel pending follow-ups on resume.

---

## Transaction boundaries

Each `recordOnboardingEvent` call runs in **one** `prisma.$transaction`:

1. Insert event by `idempotencyKey` (catch unique → return existing, skip progress write for milestones).
2. Resolve / create / merge `OnboardingProgress`.
3. Advance `highestStageReached` / `currentStage` if ordinal increases; set `activatedAt` / `completedAt` when applicable.
4. On activity: clear `abandonedAt`, bump `lastActivityAt`, cancel `scheduled` follow-ups.
5. On sanitized product error: set `needsSupport = true` (blocks normal abandonment follow-up eligibility).

---

## Abandonment (detection only in Phase 2)

Configurable via env (defaults):

| Rule | Default |
|------|---------|
| signup → no account | 2h |
| account → no workspace | 24h |
| workspace → no employees | 24h |
| employees → no roster created | 48h |
| roster created → not published | 48h |
| any inactivity before activation | 72h |

Never mark abandoned if `activatedAt` is set. Prefer `needs_support` over abandonment when `needsSupport` is true.

---

## Feature flags / env

```bash
ONBOARDING_AUTOMATION_ENABLED=false
ONBOARDING_ABANDON_SIGNUP_HOURS=2
ONBOARDING_ABANDON_WORKSPACE_HOURS=24
ONBOARDING_ABANDON_EMPLOYEES_HOURS=24
ONBOARDING_ABANDON_ROSTER_HOURS=48
ONBOARDING_ABANDON_PUBLISH_HOURS=48
ONBOARDING_ABANDON_INACTIVE_HOURS=72
ONBOARDING_MAX_FOLLOW_UPS=3
```

---

## Testing

```bash
npm run test           # vitest run — lib/onboarding-funnel/**
npm run test:watch
npx tsc --noEmit
npm run lint
```

---

## Phases

| Phase | Scope |
|-------|--------|
| **2** | Schema, record/merge, instrumentation, abandonment helpers, seed personas, Vitest |
| **3** | Ops Dashboard Onboarding Funnel UI |
| **4** | Manual follow-up email |
| **5** | Cron automation readiness (still gated by flag) |
