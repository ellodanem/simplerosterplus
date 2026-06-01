# Step 03 — Production hardening

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** None (can run alongside 01/02).

---

## Mission

Make production safe to hold a real tester's data: backups on, no default/demo credentials, and required env vars present. These are quick verifications + small fixes, not a build — but skipping them risks data loss or an open door.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **03** → `in_progress`.
2. Have access to the production database provider (Neon) and Vercel project settings.

---

## Implement

1. **Backups.** Confirm the production DB has automated backups / point-in-time recovery enabled. Note the retention window. If off, turn it on.
2. **Kill seed/demo credentials in prod.** Ensure `admin@demo.local / demo` and `ops@demo.local / ops` do **not** exist (or are disabled) on production. Either don't run the seed against prod, or set `SEED_ADMIN_*` / `SEED_OPERATOR_*` env vars to real secrets. Verify by attempting the default logins against prod — they must fail.
3. **Env audit.** Confirm required prod vars are set on Vercel (Production + Preview): `DATABASE_URL`, `AUTH_SECRET` (16+ chars), `OPERATOR_AUTH_SECRET`. Note which optional ones are intentionally unset (Stripe, Clerk = Phase 2). Cross-check [../OPERATOR_CONSOLE.md](../OPERATOR_CONSOLE.md) env checklist.
4. **Secret hygiene.** Confirm no secrets are committed (`.env*` gitignored); `landing-page` and `scripts` contain no live keys.
5. **Document** the verified state in a short `prod-hardening-checklist.md` (date, what was checked, backup retention).

---

## Out of scope

- WAF / DDoS / advanced infra.
- Audit log retention policy beyond what exists.

---

## Definition of done

- [ ] Backups/PITR confirmed on, retention noted
- [ ] Default demo + operator logins do not work in prod
- [ ] Required env vars verified present; optional ones noted
- [ ] No secrets in the repo
- [ ] `prod-hardening-checklist.md` written
- [ ] [STATUS.md](./STATUS.md) row **03** → `completed`

**Do not commit unless user asks.**
