# Step 01 — Multi-tenant isolation audit

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Nothing. **Do this first** — it is the single highest-risk item before any external user.

---

## Mission

Prove that no signed-in tenant can ever read or write another tenant's data. The schema is scoped by `organizationId` (and `locationId`), but scoping is only safe if **every** query and route enforces it. One leak destroys trust permanently, especially with staff/biometric-adjacent data.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **01** → `in_progress`.
2. Make sure at least **two** orgs exist locally (seed one, create a second by hand) with distinct staff, rosters, devices, and requests.

---

## Implement

1. **Static sweep.** Search every `app/api/**/route.ts` and every server page/data loader. Confirm each Prisma query that reads/writes tenant data filters by `organizationId` (or by a `locationId` that belongs to the session org). Flag any query that trusts an ID from the URL/body without an org check.
2. **Active attack pass.** Logged in as Org A, attempt to access Org B by:
   - Guessing IDs in dynamic routes (`/staff/[id]`, `/devices/[id]`, `/roster/weeks/[id]/...`, `/ops/...` as a tenant).
   - Sending Org B IDs in POST/PATCH/DELETE bodies (e.g. assign a roster entry to Org B staff, decide Org B's request, map Org B's device punch).
   - Reading Org B via list endpoints with filter params.
3. **Fix every gap** found: add the missing `organizationId` guard, return 404/403, never echo another org's data.
4. **Impersonation re-check.** Confirm operator read-only impersonation still cannot write (middleware block) and is scoped to the impersonated org only.
5. **Document the audit** in this folder as a short `isolation-audit-findings.md` (what was tested, what was found, what was fixed).

---

## Out of scope

- Rate limiting / abuse protection (later).
- Field-level encryption.
- Clerk migration (Phase 2).

---

## Definition of done

- [ ] Every tenant route/query verified org-scoped (or fixed)
- [ ] Active cross-org attempts all fail (404/403, zero leakage)
- [ ] Impersonation confirmed read-only + org-scoped
- [ ] `isolation-audit-findings.md` written
- [ ] [STATUS.md](./STATUS.md) row **01** → `completed`

**Do not commit unless user asks.**
