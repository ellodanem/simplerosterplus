# Step 02 — Tenant provisioning (create org + admin)

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 01 recommended first (don't provision real tenants until isolation is proven).

---

## Mission

Give us a repeatable, no-SQL way to onboard a tester: create a new `Organization`, its default `Location`, and an admin `AppUser` with a known password — in under five minutes. Today only `prisma/seed.ts` creates orgs, so we cannot add tester #2 without hand-editing the database.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **02** → `in_progress`.
2. Skim [../OPERATOR_CONSOLE.md](../OPERATOR_CONSOLE.md) — this action belongs on the operator plane (`/ops`), gated to `superadmin`/`billing`.

---

## Implement

Pick **one** delivery (operator UI preferred, script acceptable as interim):

1. **Operator console action (preferred).** On `/ops/organizations`, add a **"Create organization"** form:
   - Inputs: org name, IANA timezone, admin email, temp password (or auto-generate + display once).
   - Server action creates `Organization` + default `Location` (`isDefault: true`) + `AppUser` (hashed password via `lib/password.ts`), all in one transaction.
   - Record an `OperatorAuditLog` entry (`org.create`).
   - Show the resulting login URL + credentials so we can hand them over.
2. **Provisioning script (interim/fallback).** A documented `npm run provision-org` wrapping the same logic via env vars (mirror `prisma/seed.ts` style). Acceptable for the first 1–2 testers if the UI is more work than warranted.

Reuse existing helpers; do not duplicate password hashing or org/location creation logic.

---

## Out of scope

- Email delivery of credentials (we send manually for Gate 1 — see Phase 2 / Clerk for automated invites).
- Self-serve signup (Phase 2, step 10).
- Seat management / multiple admins (later).

---

## Definition of done

- [ ] A clean org + default location + admin login can be created without touching the DB
- [ ] Operator action is audited (or script is documented in README)
- [ ] New org passes through `/setup` correctly on first login
- [ ] Credentials/login URL surfaced for hand-off
- [ ] [STATUS.md](./STATUS.md) row **02** → `completed`

**Do not commit unless user asks.**
