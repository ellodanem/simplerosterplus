# Production hardening checklist

**Date:** 2026-06-01  
**Step:** 03 — [step-03-production-hardening.md](./step-03-production-hardening.md)  
**Agent:** cursor-2026-06-01

---

## Summary

| Check | In-repo / automated | Owner must confirm on live infra |
|-------|---------------------|----------------------------------|
| DB backups / PITR | — | **Yes** (Neon console) |
| No default demo logins in prod | **Enforced in code** + cleanup script | **Yes** (one-time verify + optional DB cleanup) |
| Required env vars | `npm run prod:env-audit` | **Yes** (Vercel Production + Preview) |
| No secrets committed | `npm run prod:secret-scan` + `.gitignore` | Re-run after adding assets |

---

## 1. Database backups (Neon)

**Status:** Owner verification required — no Neon API access from this agent.

**Action (owner):**

1. Open the [Neon console](https://console.neon.tech) → production project → **Branches** → primary branch.
2. Confirm **Point-in-time recovery (PITR)** or automated backups are **enabled**.
3. Note **retention window** below when confirmed:

| Item | Value (fill in) |
|------|-----------------|
| PITR / backups enabled | ☐ Yes — date verified: ________ |
| Retention | e.g. 7 days / per Neon plan |

`npm run build` runs `prisma migrate deploy` only — it does **not** run `db:seed`.

---

## 2. Seed / demo credentials

### Code enforcement (shipped)

- **`prisma/seed.ts`** — refuses production seed with default `admin@demo.local`/`demo` or `ops@demo.local`/`ops`, or any `@demo.local` SEED email (`VERCEL_ENV=production` or `NODE_ENV=production`).
- **Tenant login** (`/api/auth/login`) and **operator login** (`/api/ops/auth/login`) — reject any `@demo.local` email in production (uniform 401).
- **Cleanup script:** `npm run prod:remove-demo-creds -- --confirm` — deletes tenant `AppUser` rows with `@demo.local` emails; sets `disabledAt` on matching `OperatorUser` rows. Run against production `DATABASE_URL` only after confirming the URL.

### Owner verification (production app URL)

After deploy, attempt sign-in on the **live** deployment:

| Account | Expected |
|---------|----------|
| `admin@demo.local` / `demo` | **401** — must not reach the app |
| `ops@demo.local` / `ops` at `/ops` | **401** — must not reach operator console |

If either succeeds, run `prod:remove-demo-creds` against prod DB and redeploy.

---

## 3. Environment variables

### Required (Production + Preview on Vercel)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (Neon) |
| `AUTH_SECRET` | Tenant JWT (≥ 16 chars, not `.env.example` placeholder) |
| `OPERATOR_AUTH_SECRET` | Operator JWT (≥ 16 chars, separate from tenant) |

Cross-check: [OPERATOR_CONSOLE.md § Vercel env checklist](../OPERATOR_CONSOLE.md).

### Intentionally unset for Gate 1 (Phase 2)

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing — step 12 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Self-serve auth — step 10 |

### Local audit (2026-06-01)

```text
npm run prod:env-audit
```

Result on dev machine: **pass** for required vars (warnings only for optional Stripe keys unset — expected).

### Vercel audit (owner)

CLI was not authenticated in this session. Owner checklist:

1. Vercel → project → **Settings → Environment Variables**.
2. For **Production** and **Preview**, confirm the three required vars above are set.
3. Confirm values are **not** the `.env.example` dev placeholders.

---

## 4. Secret hygiene

| Check | Result (2026-06-01) |
|-------|---------------------|
| `.env*` gitignored (except `.env.example`) | **Yes** — see root `.gitignore` |
| `npm run prod:secret-scan` | **Pass** — no live keys in `app/`, `lib/`, `scripts/`, `prisma/`, `landing-page/`, `docs/` |
| `landing-page/` static HTML | No API keys or form secrets embedded |
| `scripts/capture-landing-screenshots.mjs` | Uses `SEED_ADMIN_*` env or localhost defaults only |

Re-run before each release: `npm run prod:secret-scan`

---

## 5. Scripts added

| npm script | Purpose |
|------------|---------|
| `prod:env-audit` | Validate required env (no values printed) |
| `prod:secret-scan` | Heuristic scan for committed secrets |
| `prod:remove-demo-creds` | DB cleanup (`--confirm` required) |

---

## Definition of done (step 03)

- [x] Seed guard + production login block for `@demo.local` / default pairs
- [x] Env audit script + `.env.example` production notes
- [x] Secret scan script; scan clean on 2026-06-01
- [x] This checklist written
- [ ] **Owner:** Neon backup/PITR confirmed + retention noted in §1 table
- [ ] **Owner:** Vercel Production + Preview env verified
- [ ] **Owner:** Default logins fail on live production URL
