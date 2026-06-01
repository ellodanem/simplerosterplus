# Multi-tenant isolation audit — findings

**Date:** 2026-05-31  
**Agent:** cursor-2026-05-31  
**Scope:** Step 01 — all tenant `app/api/**/route.ts` files, authenticated server pages, impersonation middleware, login flow.

---

## What was tested

### Static sweep (53 API routes)

Every `app/api/**/route.ts` file was reviewed. Tenant routes use `getSession()` and scope Prisma queries by `session.orgId` (or by `locationId` resolved within that org via `getDefaultLocation` / `resolveLocation`). Operator routes (`/api/ops/**`) are intentionally cross-tenant and gated by a separate operator JWT + RBAC.

Authenticated server pages (`devices/[id]`, roster, attendance, etc.) load data with `session.orgId` in the query `where` clause.

### Active attack pass

Two audit orgs were created locally (`Isolation Audit Org A` / `Isolation Audit Org B`) with distinct staff and devices, sharing the email `isolation-audit@test.local`. As Org A:

- Cross-org staff/device ID preloads returned **null** (404 path).
- Cross-org PATCH/DELETE with compound `organizationId` guards threw P2025 or affected **0 rows** — Org B data unchanged.

Re-run anytime: `npx tsx scripts/isolation-audit.ts`

### Impersonation re-check

- Middleware blocks **all** tenant-plane mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) when JWT `readOnly === true`, except `/api/auth/login` and `/api/auth/end-impersonation`.
- Read-only impersonation sessions are scoped to the impersonated org via JWT `orgId`; routes never accept an org ID from the client.

---

## Issues found and fixed

### Critical — login email ambiguity

**File:** `app/api/auth/login/route.ts`

`findFirst({ where: { email } })` was non-deterministic when the same email existed in multiple orgs (`@@unique([organizationId, email])`, not globally unique). A user could land in the wrong tenant.

**Fix:** `findMany` + password verify all matches. If multiple orgs match and no `organizationId` in the body → `409 ORG_SELECT_REQUIRED` with org list. Login form updated to show an organization picker.

### Defense-in-depth — mutate by bare `id` after org preload

Several `[id]` routes preloaded with an org check but then `update`/`delete` used `{ where: { id } }` only. Safe today, fragile on refactor.

**Fix:** Compound `where` on all mutations:

| Area | Files |
|------|-------|
| Staff | `staff/[id]/route.ts`, `archive`, `restore` |
| Devices | `devices/[id]/route.ts` |
| Roster templates | `roster/templates/[id]/route.ts` |
| Locations | `locations/[id]/default/route.ts` |
| Attendance punches | `attendance/punches/[id]/route.ts` |
| Leave requests | `requests/day-off/[id]`, `requests/vacation/[id]` |
| Setup / holidays | `setup/business`, `roster/holiday-calendar` |
| Roster clear | `roster/weeks/[id]/clear-unlocked` — added `rosterWeekId` to `deleteMany` |

### lib/requests.ts — conflict queries without org filter

`getConflictSummaries`, `countConflicts`, and `approveLeaveTx` queried/deleted `rosterEntry` by `staffId` only.

**Fix:** All three now require `organizationId` and filter through `staff.organizationId`.

---

## Verified safe (no change needed)

- List/create routes consistently use `session.orgId`.
- `[id]` GET routes use org-scoped preload helpers (`loadStaff`, `loadDevice`, `loadPunch`, etc.).
- Request list/create validates staff belongs to org + default location.
- Roster week mutations preload week with `{ id, organizationId }` and validate staff/template FKs in-org.
- `resolveLocation(orgId, ?location=)` rejects cross-org location IDs (falls back to default).
- Server page `devices/[id]/page.tsx` uses `{ id, organizationId: session.orgId }`.
- Operator plane isolated (separate cookie, secret, audience).

---

## Known gaps (documented, out of Step 01 scope)

| Item | Risk | Notes |
|------|------|-------|
| Suspended org not enforced | Low | `suspendedAt` set by ops but tenant JWT still works until expiry. Track for step 03. |
| JWT not re-bound to live user | Low | Stale cookies work until expiry if user deleted. Acceptable for MVP hand-onboarding. |
| Middleware coverage | Low | Some tenant routes self-guard only (`/api/devices`, `/api/locations`, etc.) — not a leak today. |
| ADMS `/iclock/**` | Medium | Device serial → org routing; multi-org serial collision possible. See step 06 field test. |
| Multi-location orgs | Info | Many write paths use default location only; attendance read accepts `?location=` with org validation. |

---

## Result

All cross-org read/write attempts tested **fail closed** (404/403 or zero rows affected). One exploitable login bug fixed. Mutation guards hardened across 12 route files + `lib/requests.ts`. Impersonation confirmed read-only at middleware.

**Gate 1 blocker 01:** cleared.
